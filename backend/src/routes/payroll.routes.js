import { Router } from 'express';

const router = Router();

// GET   /api/payroll            own salary details (read-only)
// GET   /api/payroll/all        (admin) payroll of all employees
// PATCH /api/payroll/:employeeId  (admin) update salary structure

export default router;
