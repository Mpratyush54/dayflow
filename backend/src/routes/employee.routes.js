import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';
import {
  createEmployee,
  listEmployees,
  getEmployee,
  updateEmployee,
  uploadDocument,
  deleteDocument,
} from '../controllers/employee.controller.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'].includes(file.mimetype);
    cb(null, ok);
  },
});

const router = Router();

// All employee routes require a valid token
router.use(requireAuth);

// POST /api/employees — create an employee (HR/ADMIN only);
// employeeId + one-time password are system-generated
router.post('/', requireRole('HR', 'ADMIN'), createEmployee);

// GET /api/employees — list employees (admin)
router.get('/', requireRole('HR', 'ADMIN'), listEmployees);

// GET /api/employees/:id — view profile (self or admin)
router.get('/:id', getEmployee);

// PATCH /api/employees/:id — edit profile (limited fields for employee, all for admin)
router.patch('/:id', updateEmployee);

// POST /api/employees/:id/documents — upload ID proof / PDF (PDF/JPG/PNG ≤5MB)
router.post('/:id/documents', upload.single('file'), uploadDocument);

// DELETE /api/employees/:id/documents/:docId — delete document
router.delete('/:id/documents/:docId', deleteDocument);

export default router;
