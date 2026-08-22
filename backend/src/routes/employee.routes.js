import { Router } from 'express';

const router = Router();

// GET    /api/employees        (admin) list employees
// GET    /api/employees/:id    view profile (self or admin)
// PATCH  /api/employees/:id    edit profile (limited fields for employee, all for admin)

export default router;
