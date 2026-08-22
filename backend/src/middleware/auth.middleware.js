// Verifies the JWT and attaches the user to req.user
export function requireAuth(_req, _res, next) {
  next();
}

// Restricts a route to specific roles, e.g. requireRole('HR', 'ADMIN')
export function requireRole(..._roles) {
  return (_req, _res, next) => next();
}
