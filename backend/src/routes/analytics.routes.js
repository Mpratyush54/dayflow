import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';
import { summary } from '../controllers/analytics.controller.js';

const router = Router();

// GET /api/analytics/summary?month=YYYY-MM — HR/ADMIN analytics (headcount, attendance trend, leave usage, payroll totals)
router.get('/summary', requireAuth, requireRole('HR', 'ADMIN'), summary);

export default router;
