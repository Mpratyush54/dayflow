import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';
import {
  listEmployees,
  getEmployee,
  updateEmployee,
} from '../controllers/employee.controller.js';

const router = Router();

// All employee routes require a valid token
router.use(requireAuth);

// GET /api/employees — list employees (admin)
router.get('/', requireRole('HR', 'ADMIN'), listEmployees);

// GET /api/employees/:id — view profile (self or admin)
router.get('/:id', getEmployee);

// PATCH /api/employees/:id — edit profile (limited fields for employee, all for admin)
router.patch('/:id', updateEmployee);

export default router;
