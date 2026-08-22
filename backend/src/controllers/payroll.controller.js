import mongoose from 'mongoose';
import PDFDocument from 'pdfkit';
import Payroll from '../models/payroll.model.js';
import User from '../models/user.model.js';
import { HttpError } from '../utils/httpError.js';
import { notifyPayslipReady } from '../utils/mailer.js';

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

  // Fire-and-forget payslip-ready notification; never throws, never blocks
  void notifyPayslipReady(populated.userId, populated.toJSON(), req.user);

  res.json(populated);
}

// ---- PDF salary slip (issue #15) -------------------------------------------

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const CURRENCY_CODES = { INR: 'INR', USD: 'USD', EUR: 'EUR', GBP: 'GBP' };

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(month) {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

// GET /api/payroll/slip?month=YYYY-MM[&userId=] — PDF slip from the current
// Payroll structure (self, or HR/ADMIN for anyone)
export async function slip(req, res) {
  const month =
    typeof req.query.month === 'string' && MONTH_RE.test(req.query.month)
      ? req.query.month
      : currentMonthKey();

  let targetUser = req.user;
  if (req.query.userId && req.query.userId !== req.user.id) {
    if (!['HR', 'ADMIN'].includes(req.user.role)) {
      throw new HttpError(403, 'You can only download your own payslip', 'FORBIDDEN');
    }
    assertValidId(req.query.userId);
    targetUser = await User.findById(req.query.userId).select(
      'employeeId name email role designation department',
    );
    if (!targetUser) throw new HttpError(404, 'Employee not found');
  }

  const payroll = await Payroll.findOne({ userId: targetUser._id });
  if (!payroll) {
    throw new HttpError(
      422,
      'No payroll record for this employee yet — HR needs to set a salary structure',
      'NO_PAYROLL',
    );
  }

  const allowances = Object.fromEntries(payroll.allowances ?? []);
  const deductions = Object.fromEntries(payroll.deductions ?? []);
  const basic = payroll.basicSalary ?? 0;
  const totalAllowances = Object.values(allowances).reduce((a, b) => a + b, 0);
  const totalDeductions = Object.values(deductions).reduce((a, b) => a + b, 0);
  const gross = basic + totalAllowances;
  const net = gross - totalDeductions;

  const code = CURRENCY_CODES[payroll.currency] ?? payroll.currency ?? 'INR';
  const money = (n) => `${code} ${Number(n).toLocaleString('en-IN')}`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="payslip-${targetUser.employeeId}-${month}.pdf"`,
  );

  const doc = new PDFDocument({ size: 'A4', margin: 48 });
  doc.pipe(res);

  doc.fontSize(22).font('Helvetica-Bold').text('DayFlow');
  doc.fontSize(10).font('Helvetica').fillColor('#777169').text('Human Resource Management System');
  doc.moveTo(48, doc.y + 6).lineTo(547, doc.y + 6).lineWidth(1).strokeColor('#e7e5e4').stroke();

  doc.fontSize(16).font('Helvetica-Bold').fillColor('#0c0a09')
    .text(`Salary Slip — ${monthLabel(month)}`, 48, doc.y + 18);

  const employeeRows = [
    ['Employee', targetUser.name?.trim() || targetUser.email],
    ['Employee ID', targetUser.employeeId],
    ['Email', targetUser.email],
    ...(targetUser.designation ? [['Designation', targetUser.designation]] : []),
    ...(targetUser.department ? [['Department', targetUser.department]] : []),
  ];
  let y = doc.y + 12;
  for (const [label, value] of employeeRows) {
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#292524').text(label, 48, y);
    doc.font('Helvetica').fillColor('#4e4e4e').text(String(value), 170, y);
    y += 16;
  }

  const tableTop = y + 14;
  doc.rect(48, tableTop, 499, 22).fill('#f0efed');
  doc.fillColor('#292524').font('Helvetica-Bold').fontSize(10)
    .text('Earnings', 58, tableTop + 6)
    .text('Amount', 400, tableTop + 6);
  let row = tableTop + 22;
  const line = (label, value) => {
    doc.font('Helvetica').fillColor('#4e4e4e').fontSize(10).text(label, 58, row + 6);
    doc.text(money(value), 400, row + 6);
    doc.moveTo(48, row + 22).lineTo(547, row + 22).lineWidth(0.5).strokeColor('#f0efed').stroke();
    row += 22;
  };
  line('Basic salary', basic);
  for (const [label, value] of Object.entries(allowances)) {
    line(label.replaceAll('_', ' '), value);
  }
  line('Gross earnings', gross);

  row += 10;
  doc.rect(48, row, 499, 22).fill('#f0efed');
  doc.fillColor('#292524').font('Helvetica-Bold').fontSize(10)
    .text('Deductions', 58, row + 6)
    .text('Amount', 400, row + 6);
  row += 22;
  if (Object.keys(deductions).length === 0) line('None', 0);
  for (const [label, value] of Object.entries(deductions)) {
    line(label.replaceAll('_', ' '), value);
  }
  line('Total deductions', totalDeductions);

  row += 12;
  doc.rect(48, row, 499, 34).fill('#0c0a09');
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(12)
    .text('Net pay', 58, row + 11)
    .text(money(net), 400, row + 11);

  doc.fontSize(8).font('Helvetica').fillColor('#a8a29e')
    .text(
      `Computer-generated slip · DayFlow HRMS · generated ${new Date().toLocaleString('en-IN')}`,
      48,
      row + 52,
    );

  doc.end();
}
