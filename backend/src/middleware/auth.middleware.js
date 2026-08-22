import User from '../models/user.model.js';
import { HttpError } from '../utils/httpError.js';
import { verifyAccessToken } from '../utils/tokens.js';

// Verifies the Bearer access token and loads the fresh user onto req.user
// (a Mongoose document: req.user.id and req.user.role are available).
// For SSE (EventSource) which cannot set Authorization headers, also accepts
// the token via query param `token` or `accessToken`.
export async function requireAuth(req, _res, next) {
  try {
    let rawToken = null;
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) rawToken = header.slice(7);
    else if (typeof req.query?.token === 'string' && req.query.token) rawToken = req.query.token;
    else if (typeof req.query?.accessToken === 'string' && req.query.accessToken) rawToken = req.query.accessToken;

    if (!rawToken) {
      throw new HttpError(401, 'Authentication required', 'NO_TOKEN');
    }

    let payload;
    try {
      payload = verifyAccessToken(rawToken);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new HttpError(401, 'Access token expired', 'TOKEN_EXPIRED');
      }
      throw new HttpError(401, 'Invalid access token', 'INVALID_TOKEN');
    }

    const user = await User.findById(payload.sub);
    if (!user) {
      throw new HttpError(401, 'Account not found', 'INVALID_TOKEN');
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

// Restricts a route to specific roles, e.g. requireRole('HR', 'ADMIN')
export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new HttpError(401, 'Authentication required', 'NO_TOKEN'));
    }
    if (!roles.includes(req.user.role)) {
      return next(
        new HttpError(403, 'You do not have permission to access this resource', 'FORBIDDEN'),
      );
    }
    next();
  };
}
