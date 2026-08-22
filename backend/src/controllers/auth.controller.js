import bcrypt from 'bcryptjs';
import User from '../models/user.model.js';
import RefreshToken from '../models/refreshToken.model.js';
import { env } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';
import { signinSchema, changePasswordSchema } from '../utils/validation.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
  refreshCookieOptions,
  REFRESH_COOKIE,
} from '../utils/tokens.js';

const SALT_ROUNDS = 12;

// Issues a fresh access token + refresh token (rotated, hashed in DB, httpOnly cookie)
async function issueSession(res, user) {
  const accessToken = signAccessToken(user);
  const { token, jti, expiresAt } = signRefreshToken(user);
  await RefreshToken.create({ user: user._id, tokenHash: hashToken(jti), expiresAt });
  res.cookie(REFRESH_COOKIE, token, refreshCookieOptions());
  return accessToken;
}

// GET /api/auth/verify-email?token=... — one-time token, valid 24h
export async function verifyEmail(req, res) {
  const { token } = req.query;
  if (typeof token !== 'string' || token.length === 0) {
    throw new HttpError(400, 'Verification token is missing');
  }

  const user = await User.findOne({
    verificationTokenHash: hashToken(token),
    verificationTokenExpires: { $gt: new Date() },
  });

  if (!user) {
    throw new HttpError(400, 'This verification link is invalid or has expired', 'INVALID_VERIFY_TOKEN');
  }

  user.isVerified = true;
  user.verificationTokenHash = undefined;
  user.verificationTokenExpires = undefined;
  await user.save();

  res.json({ message: 'Email verified successfully. You can now sign in.' });
}

// POST /api/auth/signin — email + password; sets the refresh cookie, returns the access token
export async function signin(req, res) {
  const { email, password } = signinSchema.parse(req.body);

  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !(await user.comparePassword(password))) {
    throw new HttpError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
  }
  if (!user.isVerified) {
    throw new HttpError(403, 'Please verify your email before signing in', 'EMAIL_NOT_VERIFIED');
  }

  const accessToken = await issueSession(res, user);
  res.json({
    accessToken,
    user: user.toJSON(),
    // True on first login after HR created the account — UI must force a password change
    mustChangePassword: user.mustChangePassword === true,
  });
}

// POST /api/auth/refresh — exchanges the httpOnly refresh cookie for a new access token
export async function refresh(req, res) {
  const raw = req.cookies?.[REFRESH_COOKIE];
  if (!raw) {
    throw new HttpError(401, 'No refresh token provided', 'NO_REFRESH_TOKEN');
  }

  let payload;
  try {
    payload = verifyRefreshToken(raw);
  } catch {
    throw new HttpError(401, 'Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN');
  }

  const stored = await RefreshToken.findOne({ tokenHash: hashToken(payload.jti) });
  if (!stored) {
    throw new HttpError(401, 'Refresh token is no longer valid', 'INVALID_REFRESH_TOKEN');
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.isVerified) {
    await stored.deleteOne();
    throw new HttpError(401, 'Account not found or not verified', 'INVALID_REFRESH_TOKEN');
  }

  // Rotation: consume the presented token, issue a fresh pair
  await stored.deleteOne();
  const accessToken = await issueSession(res, user);
  res.json({ accessToken, user: user.toJSON() });
}

// POST /api/auth/signout — revokes the refresh token and clears the cookie
export async function signout(req, res) {
  const raw = req.cookies?.[REFRESH_COOKIE];
  if (raw) {
    try {
      const payload = verifyRefreshToken(raw);
      await RefreshToken.deleteOne({ tokenHash: hashToken(payload.jti) });
    } catch {
      // Token already invalid — nothing to revoke
    }
  }
  res.clearCookie(REFRESH_COOKIE, refreshCookieOptions());
  res.json({ message: 'Signed out' });
}

// GET /api/auth/me — current user (behind requireAuth)
export async function me(req, res) {
  res.json({ user: req.user.toJSON() });
}

// POST /api/auth/change-password — change own password; clears the
// mustChangePassword flag set at HR account creation
export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

    const user = await User.findById(req.user.id).select('+passwordHash');
    if (!user) {
      return res.status(404).json({ message: 'Account not found' });
    }
    if (!(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    user.mustChangePassword = false;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
}
