import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  verifyEmail,
  signin,
  refresh,
  signout,
  me,
  changePassword,
} from '../controllers/auth.controller.js';

const router = Router();

// NOTE: public self-signup was removed — accounts are created by HR/Admin
// via POST /api/employees (see employee.routes.js)

// GET  /api/auth/verify-email    one-time email verification token
router.get('/verify-email', verifyEmail);

// POST /api/auth/signin          email + password → access token + refresh cookie
router.post('/signin', signin);

// POST /api/auth/refresh         rotate refresh cookie → new access token
router.post('/refresh', refresh);

// POST /api/auth/signout         revoke refresh token, clear cookie
router.post('/signout', signout);

// GET  /api/auth/me              current user (protected)
router.get('/me', requireAuth, me);

// POST /api/auth/change-password change own password (clears mustChangePassword)
router.post('/change-password', requireAuth, changePassword);

export default router;
