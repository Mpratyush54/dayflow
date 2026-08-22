import 'dotenv/config';

const isProd = process.env.NODE_ENV === 'production';

if (isProd && (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET)) {
  throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be set in production');
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProd,
  port: Number(process.env.PORT ?? 5000),

  // Frontend origin allowed to call the API with credentials (cookies)
  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:5173',

  // Short-lived access token, sent as a Bearer header and kept in memory client-side
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret-change-me',
  accessExpiresMinutes: Number(process.env.JWT_ACCESS_EXPIRES_MINUTES ?? 15),

  // Long-lived refresh token, stored hashed in DB and sent as an httpOnly cookie
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret-change-me',
  refreshExpiresDays: Number(process.env.JWT_REFRESH_EXPIRES_DAYS ?? 7),
};
