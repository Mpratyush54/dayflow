import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';
import {
  applyLeave,
  getMyLeaves,
  getAllLeaves,
  reviewLeave,
} from '../controllers/leave.controller.js';

const router = Router();

// All leave routes require a valid token
router.use(requireAuth);

// GET   /api/leaves              own leave requests
// POST  /api/leaves              apply for leave (type, date range, remarks)
router.get('/', getMyLeaves);
router.post('/', applyLeave);

// GET   /api/leaves/all          (HR/ADMIN) all leave requests, optional ?status=
router.get('/all', requireRole('HR', 'ADMIN'), getAllLeaves);

// PATCH /api/leaves/:id/review   (HR/ADMIN) approve/reject with comment
router.patch('/:id/review', requireRole('HR', 'ADMIN'), reviewLeave);

export default router;
