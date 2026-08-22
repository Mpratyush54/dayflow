import mongoose from 'mongoose';
import Payroll from '../models/payroll.model.js';
import User from '../models/user.model.js';
import { HttpError } from '../utils/httpError.js';

function assertValidId(id) {
  if (!mongoose.isValidObjectId(id)) {
    throw new HttpError(404, 'Employee not found', 'NOT_FOUND');
  }
}

// Validates + normalises an allowances/deductions map from the request body:
// { house_rent: 8000 } → { house_rent: 8000 }; drops non-numeric junk.
function parseAmountMap(value, field) {
  if (value === undefined || value === null) return {};
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new HttpError(400, `${field} must be an object of name → amount`, 'VALIDATION_ERROR');
  }
  const result = {};
  for (const [key, amount] of Object.entries(value)) {
    const num = Number(amount);
    if (!key.trim() || Number.isNaN(num) || num < 0) {
      throw new HttpError(
        400,
        `${field} entries must be label → non-negative number (got "${key}")`,
        'VALIDATION_ERROR',
      );
    }
    result[key.trim()] = num;
  }
  return result;
}

// GET /api/payroll — own salary structure, read-only for employees
export async function getMyPayroll(req, res) {
  const payroll = await Payroll.findOne({ userId: req.user.id });
  if (!payroll) {
    throw new HttpError(404, 'No payroll record yet — HR will set one up', 'NO_PAYROLL');
  }
  res.json(payroll);
}

// GET /api/payroll/all — every salary structure (HR/ADMIN), employee populated
export async function getAllPayroll(_req, res) {
  const records = await Payroll.find()
    .populate('userId', 'employeeId email name role')
    .sort({ updatedAt: -1 });
  res.json(records);
}

// PATCH /api/payroll/:userId — HR/ADMIN update a salary structure (upsert),
// keeping a revision trail of who changed what and when.
export async function updatePayroll(req, res) {
  assertValidId(req.params.userId);

  const target = await User.findById(req.params.userId).select('_id');
  if (!target) {
    throw new HttpError(404, 'Employee not found', 'NOT_FOUND');
  }

  const { basicSalary, currency, effectiveFrom } = req.body;
  if (basicSalary !== undefined && (Number.isNaN(Number(basicSalary)) || Number(basicSalary) < 0)) {
    throw new HttpError(400, 'basicSalary must be a non-negative number', 'VALIDATION_ERROR');
  }
  const allowances = parseAmountMap(req.body.allowances, 'allowances');
  const deductions = parseAmountMap(req.body.deductions, 'deductions');

  const existing = await Payroll.findOne({ userId: req.params.userId });
  let saved;
  if (existing) {
    existing.revisions.push({
      changedBy: req.user.id,
      previous: {
        basicSalary: existing.basicSalary,
        currency: existing.currency,
        allowances: existing.allowances,
        deductions: existing.deductions,
      },
    });
    if (basicSalary !== undefined) existing.basicSalary = Number(basicSalary);
    if (currency !== undefined) existing.currency = String(currency);
    existing.allowances = allowances;
    existing.deductions = deductions;
    existing.effectiveFrom = effectiveFrom ? new Date(effectiveFrom) : new Date();
    saved = await existing.save();
  } else {
    saved = await Payroll.create({
      userId: req.params.userId,
      basicSalary: basicSalary !== undefined ? Number(basicSalary) : 0,
      currency: currency !== undefined ? String(currency) : 'INR',
      allowances,
      deductions,
      effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
    });
  }

  const populated = await Payroll.findById(saved.id).populate(
    'userId',
    'employeeId email name role',
  );
  res.json(populated);
}
