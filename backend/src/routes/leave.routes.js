import { Router } from 'express';

const router = Router();

// GET   /api/leaves            own leave requests
// POST  /api/leaves            apply for leave (type, date range, remarks)
// GET   /api/leaves/all        (admin) all leave requests
// PATCH  /api/leaves/:id/review  (admin) approve/reject with comment

export default router;
