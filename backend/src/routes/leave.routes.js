import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';
import {
  applyLeave,
  getMyLeaves,
  getAllLeaves,
  reviewLeave,
} from '../controllers/leave.controller.js';

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

// All leave routes require a valid token
router.use(requireAuth);

// GET   /api/leaves              own leave requests
// POST  /api/leaves              apply for leave (type, date range, remarks, attachment for sick)
router.get('/', getMyLeaves);
router.post('/', upload.single('attachment'), applyLeave);

// GET   /api/leaves/all          (HR/ADMIN) all leave requests, optional ?status=
router.get('/all', requireRole('HR', 'ADMIN'), getAllLeaves);

// PATCH /api/leaves/:id/review   (HR/ADMIN) approve/reject with comment
router.patch('/:id/review', requireRole('HR', 'ADMIN'), reviewLeave);

export default router;
