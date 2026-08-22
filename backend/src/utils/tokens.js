import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const REFRESH_COOKIE = 'dayflow_rt';

// Short-lived JWT (minutes) sent as a Bearer header; safe to keep in memory client-side
export function signAccessToken(user) {
  return jwt.sign({ role: user.role, employeeId: user.employeeId }, env.jwtAccessSecret, {
    subject: user._id.toString(),
    expiresIn: `${env.accessExpiresMinutes}m`,
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtAccessSecret);
}

// Refresh token: a signed JWT carrying a random jti. Only the hash of the jti
// is stored in the DB, so the token can be rotated and revoked.
export function signRefreshToken(user) {
  const jti = crypto.randomBytes(32).toString('hex');
  // jsonwebtoken v9 requires jti in the payload, not the options bag
  const token = jwt.sign({ jti }, env.jwtRefreshSecret, {
    subject: user._id.toString(),
    expiresIn: `${env.refreshExpiresDays}d`,
  });
  return { token, jti, expiresAt: new Date(Date.now() + env.refreshExpiresDays * 86400000) };
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwtRefreshSecret);
}

export function hashToken(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

// One-time email verification token (valid 24h), stored hashed
export function generateVerificationToken() {
  const token = crypto.randomBytes(32).toString('hex');
  return { token, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 86400000) };
}

export function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.isProd,
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: env.refreshExpiresDays * 86400000,
  };
}
