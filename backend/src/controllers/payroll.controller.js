import mongoose from 'mongoose';
import PDFDocument from 'pdfkit';
import Payroll from '../models/payroll.model.js';
import User from '../models/user.model.js';
import Attendance from '../models/attendance.model.js';
import LeaveRequest from '../models/leave.model.js';
import { HttpError } from '../utils/httpError.js';
import { notifyPayslipReady } from '../utils/mailer.js';
import { parsePagination, paginatedResponse } from '../utils/pagination.js';

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

// GET /api/payroll/all — every salary structure (HR/ADMIN), employee populated (?page=&limit=)
export async function getAllPayroll(req, res) {
  const hasPagination = req.query.page !== undefined || req.query.limit !== undefined;
  if (!hasPagination) {
    const records = await Payroll.find()
      .populate('userId', 'employeeId email name role')
      .sort({ updatedAt: -1 });
    return res.json(records);
  }
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 10 });
  const [total, records] = await Promise.all([
    Payroll.countDocuments(),
    Payroll.find().populate('userId', 'employeeId email name role').sort({ updatedAt: -1 }).skip(skip).limit(limit),
  ]);
  res.json(paginatedResponse(records, total, page, limit));
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

function localDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function monthWorkdays(month) {
  const [y, m] = month.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const last = new Date(y, m, 0);
  const today = new Date();
  const cappedLast = first <= today && today <= last ? today : last;
  if (cappedLast < first) return { first, last: cappedLast, total: 0 };
  let total = 0;
  for (let d = new Date(first); d <= cappedLast; d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) total++;
  }
  return { first, last: cappedLast, total };
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

  // Try Payroll collection first; fallback to User.salary (seeded demo data)
  let payroll = await Payroll.findOne({ userId: targetUser._id });
  let allowances;
  let deductions;
  let basic;
  let currency;
  if (payroll) {
    const toObj = (v) => {
      if (!v) return {};
      if (v instanceof Map) return Object.fromEntries(v);
      if (typeof v === 'object') return v;
      return {};
    };
    allowances = toObj(payroll.allowances);
    deductions = toObj(payroll.deductions);
    basic = payroll.basicSalary ?? 0;
    currency = payroll.currency ?? 'INR';
  } else {
    // fallback: use embedded salary on User (seeded) — avoids 404 before HR creates Payroll
    const fullUser = await User.findById(targetUser._id).select('salary employeeId name email role designation department');
    const salary = (fullUser && fullUser.salary) || {};
    const toObj = (v) => {
      if (!v) return {};
      if (v instanceof Map) return Object.fromEntries(v);
      if (typeof v === 'object') return v;
      return {};
    };
    if (!fullUser || (salary.basicSalary === undefined && Object.keys(toObj(salary.allowances)).length === 0 && Object.keys(toObj(salary.deductions)).length === 0)) {
      throw new HttpError(
        422,
        'No payroll record for this employee yet — HR needs to set a salary structure',
        'NO_PAYROLL',
      );
    }
    // use seeded salary if payroll not yet created
    targetUser = fullUser;
    allowances = toObj(salary.allowances);
    deductions = toObj(salary.deductions);
    basic = salary.basicSalary ?? 0;
    currency = salary.currency ?? 'INR';
  }
  // --- Dynamic LOP: attendance-linked unpaid days for the requested month
  const { first: lopFirst, last: lopLast, total: totalWorkdays } = monthWorkdays(month);
  let lopUnpaidDays = 0;
  if (totalWorkdays > 0 && basic > 0) {
    const [records, unpaidLeaves, allLeaves] = await Promise.all([
      Attendance.find({ user: targetUser._id, date: { $gte: localDateKey(lopFirst), $lte: localDateKey(lopLast) } }).select('date status checkIn'),
      LeaveRequest.find({ userId: targetUser._id, status: 'APPROVED', type: 'UNPAID', startDate: { $lte: lopLast }, endDate: { $gte: lopFirst } }).select('startDate endDate'),
      LeaveRequest.find({ userId: targetUser._id, status: 'APPROVED', startDate: { $lte: lopLast }, endDate: { $gte: lopFirst } }).select('type startDate endDate'),
    ]);
    const byDate = new Map(records.map((r) => [r.date, r]));
    const unpaidSet = new Set();
    for (const lv of unpaidLeaves) {
      for (let d = new Date(lv.startDate); d <= lv.endDate; d.setDate(d.getDate() + 1)) {
        if (d < lopFirst || d > lopLast) continue;
        if (d.getDay() === 0 || d.getDay() === 6) continue;
        unpaidSet.add(localDateKey(d));
      }
    }
    const anyLeaveSet = new Set();
    for (const lv of allLeaves) {
      for (let d = new Date(lv.startDate); d <= lv.endDate; d.setDate(d.getDate() + 1)) {
        if (d < lopFirst || d > lopLast) continue;
        if (d.getDay() === 0 || d.getDay() === 6) continue;
        anyLeaveSet.add(localDateKey(d));
      }
    }
    for (let d = new Date(lopFirst); d <= lopLast; d.setDate(d.getDate() + 1)) {
      if (d.getDay() === 0 || d.getDay() === 6) continue;
      if (d > new Date()) continue;
      const key = localDateKey(d);
      const rec = byDate.get(key);
      if (rec && rec.checkIn) {
        if (rec.status === 'HALF_DAY') lopUnpaidDays += 0.5;
      } else if (unpaidSet.has(key)) {
        lopUnpaidDays += 1;
      } else if (anyLeaveSet.has(key)) {
        // paid/sick leave — not unpaid
      } else {
        lopUnpaidDays += 1;
      }
    }
    if (lopUnpaidDays > 0) {
      const dailyRate = basic / totalWorkdays;
      const lopAmount = Math.round(lopUnpaidDays * dailyRate);
      if (lopAmount > 0) {
        const lopLabel = `LOP (${lopUnpaidDays} day${lopUnpaidDays === 1 ? '' : 's'} unpaid)`;
        deductions[lopLabel] = (deductions[lopLabel] || 0) + lopAmount;
      }
    }
  }

  const totalAllowances = Object.values(allowances).reduce((a, b) => a + b, 0);
  const totalDeductions = Object.values(deductions).reduce((a, b) => a + b, 0);
  const gross = basic + totalAllowances;
  const net = gross - totalDeductions;

  const code = CURRENCY_CODES[currency] ?? currency ?? 'INR';
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
