import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import User, { USER_PUBLIC_FIELDS } from '../models/user.model.js';
import { env } from '../config/env.js';
import { createEmployeeSchema } from '../utils/validation.js';
import { generateVerificationToken } from '../utils/tokens.js';
import { nextEmployeeId } from '../utils/employeeId.js';
import { generatePassword } from '../utils/password.js';
import { parsePagination, paginatedResponse } from '../utils/pagination.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');

const SALT_ROUNDS = 12;

// Fields an EMPLOYEE may change on their own profile (SRS 3.3.2)
const SELF_EDITABLE_FIELDS = ['phone', 'address', 'profilePicture'];

const PHONE_RE = /^\+?[0-9]{10,15}$/;
function normalizePhone(value) {
  return String(value).replace(/[\s\-()]/g, '');
}

function canViewProfile(requester, targetId) {
  return (
    requester.id === targetId ||
    requester.role === 'HR' ||
    requester.role === 'ADMIN'
  );
}

// POST /api/employees — HR/ADMIN creates an employee (replaces public signup).
// Employee ID and the one-time password are generated server-side:
//   ID: OI + <2 first-name letters><2 last-name letters> + <join year> + <4-digit year serial>
// The password is returned exactly once so the HR officer can hand it over.
export async function createEmployee(req, res, next) {
  try {
    const data = createEmployeeSchema.parse(req.body);

    const existing = await User.findOne({ email: data.email }).select('email').lean();
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    const { token, tokenHash, expiresAt } = generateVerificationToken();
    const verificationUrl = `${env.clientUrl}/verify-email?token=${token}`;

    // Retry on serial collisions from concurrent creations (unique index backs this up)
    for (let attempt = 0; attempt < 3; attempt++) {
      const employeeId = await nextEmployeeId(data.firstName, data.lastName);
      const password = generatePassword();
      try {
        const user = await User.create({
          employeeId,
          name: `${data.firstName} ${data.lastName}`.trim(),
          email: data.email,
          passwordHash: await bcrypt.hash(password, SALT_ROUNDS),
          role: data.role,
          isVerified: false,
          mustChangePassword: true,
          verificationTokenHash: tokenHash,
          verificationTokenExpires: expiresAt,
        });
        console.log(`[employees] Created ${employeeId} for ${data.email}: ${verificationUrl}`);
        return res.status(201).json({
          message: `Employee ${employeeId} created. Share the one-time password — it will not be shown again.`,
          employeeId,
          generatedPassword: password,
          user: user.toJSON(),
          ...(env.isProd ? {} : { verificationUrl }),
        });
      } catch (err) {
        const duplicate = err.code === 11000;
        if (!duplicate) throw err;
        // Collided on employeeId or email between the check and the insert
        if (err.keyPattern?.email) {
          return res.status(409).json({ message: 'An account with this email already exists' });
        }
      }
    }
    return res.status(503).json({ message: 'Could not allocate a unique Employee ID, please retry' });
  } catch (err) {
    next(err);
  }
}

// GET /api/employees — list employees (HR/ADMIN)
export async function listEmployees(req, res, next) {
  try {
    const hasPagination = req.query.page !== undefined || req.query.limit !== undefined;
    if (!hasPagination) {
      const employees = await User.find().select(USER_PUBLIC_FIELDS).sort({ employeeId: 1 });
      return res.json(employees);
    }
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 10 });
    const [total, employees] = await Promise.all([
      User.countDocuments(),
      User.find().select(USER_PUBLIC_FIELDS).sort({ employeeId: 1 }).skip(skip).limit(limit),
    ]);
    res.json(paginatedResponse(employees, total, page, limit));
  } catch (err) {
    next(err);
  }
}

// GET /api/employees/:id — view profile (self or HR/ADMIN)
export async function getEmployee(req, res, next) {
  try {
    const { id } = req.params;
    if (!canViewProfile(req.user, id)) {
      return res.status(403).json({ message: 'You can only view your own profile' });
    }

    const employee = await User.findById(id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    res.json(employee);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/employees/:id — edit profile
// Employees edit limited fields on their own profile; ADMIN edits all fields.
export async function updateEmployee(req, res, next) {
  try {
    const { id } = req.params;
    const isAdmin = req.user.role === 'ADMIN';
    const isSelf = req.user.id === id;

    if (!isSelf && !isAdmin) {
      return res
        .status(403)
        .json({ message: 'Only admins can edit other employees' });
    }

    // Pick only allowed keys from the request body
    const allowedFields = isSelf && !isAdmin
      ? SELF_EDITABLE_FIELDS
      : [
          ...SELF_EDITABLE_FIELDS,
          'name',
          'dateOfBirth',
          'designation',
          'department',
          'employmentType',
          'dateOfJoining',
          'workLocation',
          'status',
          'salary',
          'documents',
        ];

    const updates = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    // Phone validation — reject before DB write (client also validates)
    if (updates.phone !== undefined) {
      const raw = String(updates.phone).trim();
      if (raw !== '') {
        const normalized = normalizePhone(raw);
        if (!PHONE_RE.test(normalized)) {
          return res.status(400).json({ message: 'Invalid phone — use 10-15 digits, optional leading +', code: 'VALIDATION_ERROR' });
        }
        updates.phone = normalized;
      } else {
        updates.phone = '';
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message:
          isSelf && !isAdmin
            ? `Employees may only update: ${SELF_EDITABLE_FIELDS.join(', ')}`
            : 'No valid fields to update',
      });
    }

    const dateKeys = ['dateOfBirth', 'dateOfJoining'];
    for (const key of dateKeys) {
      if (updates[key]) {
        const d = new Date(updates[key]);
        if (Number.isNaN(d.getTime())) {
          return res.status(400).json({ message: `${key} must be a valid date` });
        }
        updates[key] = d;
      }
    }

    const employee = await User.findByIdAndUpdate(id, updates, {
      returnDocument: 'after',
      runValidators: true,
    });
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.json(employee);
  } catch (err) {
    next(err);
  }
}

// POST /api/employees/:id/documents — upload ID proof / PDF / image (≤5MB, PDF/JPG/PNG)
export async function uploadDocument(req, res, next) {
  try {
    const { id } = req.params;
    const isAdmin = req.user.role === 'ADMIN';
    const isSelf = req.user.id === id;
    if (!isSelf && !isAdmin) {
      return res.status(403).json({ message: 'Only self or ADMIN can upload documents' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded. Field name must be \"file\" (PDF/JPG/PNG, ≤5MB)', code: 'VALIDATION_ERROR' });
    }

    const allowedMime = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedMime.includes(req.file.mimetype)) {
      // remove rejected file
      try { fs.unlinkSync(req.file.path); } catch {}
      return res.status(400).json({ message: 'Only PDF, JPG, PNG allowed', code: 'VALIDATION_ERROR' });
    }

    const employee = await User.findById(id);
    if (!employee) {
      try { fs.unlinkSync(req.file.path); } catch {}
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Build public URL — served via GET /uploads/<file> (app.js static)
    const url = `/uploads/${req.file.filename}`;
    const docName = req.body.name?.trim() || req.file.originalname;
    employee.documents.push({ name: docName, url, uploadedAt: new Date() });
    await employee.save();
    const added = employee.documents[employee.documents.length - 1];
    res.status(201).json(added);
  } catch (err) {
    // cleanup file on error
    if (req.file?.path) { try { fs.unlinkSync(req.file.path); } catch {} }
    next(err);
  }
}

// DELETE /api/employees/:id/documents/:docId — remove a document and its file
export async function deleteDocument(req, res, next) {
  try {
    const { id, docId } = req.params;
    const isAdmin = req.user.role === 'ADMIN';
    const isSelf = req.user.id === id;
    if (!isSelf && !isAdmin) {
      return res.status(403).json({ message: 'Only self or ADMIN can delete documents' });
    }
    const employee = await User.findById(id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    const doc = employee.documents.id(docId);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    // try to remove file from uploads dir if it lives there
    if (doc.url?.startsWith('/uploads/')) {
      const filePath = path.join(UPLOAD_DIR, path.basename(doc.url));
      try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}
    }
    doc.deleteOne();
    await employee.save();
    res.json({ message: 'Document deleted' });
  } catch (err) {
    next(err);
  }
}
