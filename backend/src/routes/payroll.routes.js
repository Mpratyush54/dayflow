import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';
import {
  getMyPayroll,
  getAllPayroll,
  updatePayroll,
  slip,
} from '../controllers/payroll.controller.js';

const router = Router();

// All payroll routes require a valid token; salary structures are read-only
// for employees — only HR/ADMIN can write.
router.use(requireAuth);

// GET   /api/payroll          own salary structure (read-only)
router.get('/', getMyPayroll);

// GET   /api/payroll/all      all salary structures (HR/ADMIN)
router.get('/all', requireRole('HR', 'ADMIN'), getAllPayroll);

// GET   /api/payroll/slip     PDF salary slip (?month=, self or HR/ADMIN ?userId=)
// Must be before /:userId param route — otherwise "slip" is captured as userId and 404s
router.get('/slip', slip);

// PATCH /api/payroll/:userId  update a structure with revision trail (HR/ADMIN)
router.patch('/:userId', requireRole('HR', 'ADMIN'), updatePayroll);

export default router;
