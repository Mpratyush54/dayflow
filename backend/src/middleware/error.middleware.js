import { HttpError } from '../utils/httpError.js';

// Central error handler — keep last in the middleware chain
export function errorHandler(err, _req, res, _next) {
  let status = err instanceof HttpError ? err.status : 500;
  let message = err.message || 'Internal server error';
  let code = err.code;

  if (err.type === 'entity.too.large' || err.status === 413) {
    status = 413;
    code = 'PAYLOAD_TOO_LARGE';
    message = 'Request payload is too large';
  } else if (err.name === 'ZodError') {
    status = 400;
    code = 'VALIDATION_ERROR';
    message = err.issues?.[0]?.message ?? 'Invalid input';
  } else if (err.code === 11000) {
    status = 409;
    code = 'ACCOUNT_EXISTS';
    message = 'An account with this email or Employee ID already exists';
  } else if (err.name === 'ValidationError') {
    status = 400;
    code = 'VALIDATION_ERROR';
  } else if (status === 500) {
    console.error(err);
    message = 'Internal server error';
  }

  res.status(status).json({ message, ...(code ? { code } : {}) });
}
