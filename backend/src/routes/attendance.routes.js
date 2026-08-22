import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';
import { checkin, checkout, getMine, getTeam, report } from '../controllers/attendance.controller.js';

const router = Router();

// GET  /api/attendance           own daily/weekly attendance (+ summary)
router.get('/', requireAuth, getMine);

// GET  /api/attendance/team      (HR/ADMIN) everyone's attendance for a date
router.get('/team', requireAuth, requireRole('HR', 'ADMIN'), getTeam);

// GET  /api/attendance/report    (HR/ADMIN) monthly summary per employee, ?format=csv
router.get('/report', requireAuth, requireRole('HR', 'ADMIN'), report);

// POST /api/attendance/checkin
router.post('/checkin', requireAuth, checkin);

// POST /api/attendance/checkout
router.post('/checkout', requireAuth, checkout);

export default router;
