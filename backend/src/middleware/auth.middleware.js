import User from '../models/user.model.js';
import { env } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';
import { verifyAccessToken } from '../utils/tokens.js';

// Verifies the Bearer access token and loads the fresh user onto req.user
export async function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new HttpError(401, 'Authentication required', 'NO_TOKEN');
    }

    let payload;
    try {
      payload = verifyAccessToken(header.slice(7));
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
      return next(new HttpError(403, 'You do not have permission to access this resource', 'FORBIDDEN'));
    }
    next();
  };
}
