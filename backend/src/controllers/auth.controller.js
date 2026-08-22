import bcrypt from 'bcryptjs';
import User from '../models/user.model.js';
import RefreshToken from '../models/refreshToken.model.js';
import { env } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';
import { signupSchema, signinSchema } from '../utils/validation.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
  generateVerificationToken,
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

// POST /api/auth/signup — register with employeeId, email, password, role (EMPLOYEE | HR)
export async function signup(req, res) {
  const data = signupSchema.parse(req.body);

  const existing = await User.findOne({
    $or: [{ email: data.email }, { employeeId: data.employeeId.toUpperCase() }],
  })
    .select('email employeeId')
    .lean();
  if (existing) {
    const message =
      existing.email === data.email
        ? 'An account with this email already exists'
        : 'This Employee ID is already registered';
    throw new HttpError(409, message, 'ACCOUNT_EXISTS');
  }

  const { token, tokenHash, expiresAt } = generateVerificationToken();
  const user = await User.create({
    employeeId: data.employeeId,
    email: data.email,
    passwordHash: await bcrypt.hash(data.password, SALT_ROUNDS),
    role: data.role,
    isVerified: false,
    verificationTokenHash: tokenHash,
    verificationTokenExpires: expiresAt,
  });

  // No SMTP configured yet — log the verification link, and expose it outside
  // production so the flow can be completed end-to-end during development.
  const verificationUrl = `${env.clientUrl}/verify-email?token=${token}`;
  console.log(`[auth] Email verification for ${data.email}: ${verificationUrl}`);

  res.status(201).json({
    message: 'Account created. Please verify your email to sign in.',
    user: user.toJSON(),
    ...(env.isProd ? {} : { verificationUrl }),
  });
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
  res.json({ accessToken, user: user.toJSON() });
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
