// DEV-ONLY auth stub for the employee profile feature.
// The auth module (built separately) will replace this file with real JWT
// verification — until then the bearer token is a base64-encoded JSON
// payload: { "id": "<userId>", "role": "EMPLOYEE" | "HR" | "ADMIN" }.
// `npm run seed` prints ready-made dev tokens.

const ROLES = ['EMPLOYEE', 'HR', 'ADMIN'];

function decodeDevToken(token) {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
    if (ROLES.includes(payload.role) && typeof payload.id === 'string') {
      return { id: payload.id, role: payload.role };
    }
  } catch {
    // fall through — malformed token
  }
  return null;
}

// Verifies the dev token and attaches the user to req.user
export function requireAuth(req, res, next) {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const user = token ? decodeDevToken(token) : null;
  if (!user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  req.user = user;
  next();
}

// Restricts a route to specific roles, e.g. requireRole('HR', 'ADMIN')
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
}
