import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  signup,
  verifyEmail,
  signin,
  refresh,
  signout,
  me,
} from '../controllers/auth.controller.js';

const router = Router();

// POST /api/auth/signup       register (employeeId, email, password, role)
router.post('/signup', signup);

// GET  /api/auth/verify-email one-time email verification token
router.get('/verify-email', verifyEmail);

// POST /api/auth/signin       email + password → access token + refresh cookie
router.post('/signin', signin);

// POST /api/auth/refresh      rotate refresh cookie → new access token
router.post('/refresh', refresh);

// POST /api/auth/signout      revoke refresh token, clear cookie
router.post('/signout', signout);

// GET  /api/auth/me           current user (protected)
router.get('/me', requireAuth, me);

export default router;
