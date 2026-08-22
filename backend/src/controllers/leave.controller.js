import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import LeaveRequest from '../models/leave.model.js';
import User from '../models/user.model.js';
import { HttpError } from '../utils/httpError.js';
import { notifyLeaveDecision, notifyNewLeaveRequest } from '../utils/mailer.js';
import { parsePagination, paginatedResponse } from '../utils/pagination.js';
import { employeeTextFilter } from '../utils/searchFilter.js';
import {
  dateKeyFromDate,
  daysInclusiveKeys,
  parseDateKey,
  rangesOverlap,
  todayKeyUtc,
  utcFromDateKey,
} from '../utils/leaveDates.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');

const LEAVE_TYPES = ['PAID', 'SICK', 'UNPAID'];
const LEAVE_ENTITLEMENTS = { PAID: 18, SICK: 10, UNPAID: 5 };

function daysInclusiveUTC(start, end) {
  return daysInclusiveKeys(dateKeyFromDate(start), dateKeyFromDate(end));
}

// Malformed ids would throw a CastError (500) in findById
function assertValidId(id) {
  if (!mongoose.isValidObjectId(id)) {
    throw new HttpError(404, 'Leave request not found', 'NOT_FOUND');
  }
}

function parseDate(value, field) {
  const key = parseDateKey(value, field);
  return utcFromDateKey(key);
}

// POST /api/leaves — apply for leave (type, date range, remarks, attachment for sick)
export async function applyLeave(req, res) {
  const { type, startDate, endDate, remarks } = req.body;
  const cleanupFile = () => {
    if (req.file?.path) { try { fs.unlinkSync(req.file.path); } catch {} }
  };
  try {
  if (!LEAVE_TYPES.includes(type)) {
    throw new HttpError(400, 'Leave type must be PAID, SICK or UNPAID', 'VALIDATION_ERROR');
  }
  const startKey = parseDateKey(startDate, 'startDate');
  const endKey = parseDateKey(endDate, 'endDate');
  if (endKey < startKey) {
    throw new HttpError(400, 'endDate cannot be before startDate', 'VALIDATION_ERROR');
  }
  const start = utcFromDateKey(startKey);
  const end = utcFromDateKey(endKey);

  const todayKey = todayKeyUtc();
  const isPrivileged = req.user?.role === 'HR' || req.user?.role === 'ADMIN';
  const allowPast = req.body?.allowPast === true;
  if (startKey < todayKey && !(isPrivileged && allowPast)) {
    throw new HttpError(400, 'startDate cannot be in the past', 'VALIDATION_ERROR');
  }

  const existingLeaves = await LeaveRequest.find({
    userId: req.user._id,
    status: { $in: ['PENDING', 'APPROVED'] },
  }).select('startDate endDate status type');

  const conflict = existingLeaves.find((leave) =>
    rangesOverlap(
      dateKeyFromDate(leave.startDate),
      dateKeyFromDate(leave.endDate),
      startKey,
      endKey,
    ),
  );
  if (conflict) {
    const from = dateKeyFromDate(conflict.startDate);
    const to = dateKeyFromDate(conflict.endDate);
    throw new HttpError(
      409,
      `You already have a ${conflict.status.toLowerCase()} ${conflict.type} leave from ${from} to ${to} that overlaps these dates`,
      'LEAVE_OVERLAP',
    );
  }
  const entitlement = LEAVE_ENTITLEMENTS[type];
  if (entitlement !== undefined) {
    const requestedDays = daysInclusiveKeys(startKey, endKey);
    const sameTypeLeaves = existingLeaves.filter((l) => l.type === type);
    const usedDays = sameTypeLeaves.reduce(
      (sum, l) => sum + daysInclusiveKeys(dateKeyFromDate(l.startDate), dateKeyFromDate(l.endDate)),
      0,
    );
    if (usedDays + requestedDays > entitlement) {
      throw new HttpError(
        400,
        `Insufficient ${type} leave balance: ${entitlement - usedDays} day(s) remaining, ${requestedDays} requested`,
        'INSUFFICIENT_BALANCE',
      );
    }
  }

  let attachmentUrl;
  if (req.file) {
    attachmentUrl = `/uploads/${req.file.filename}`;
  }

  const leave = await LeaveRequest.create({
    userId: req.user.id,
    type,
    startDate: start,
    endDate: end,
    remarks: typeof remarks === 'string' ? remarks : undefined,
    attachmentUrl,
  });

  // Fire-and-forget: notify HR/ADMIN approvers; mailer problems never break the request
  User.find({ role: { $in: ['HR', 'ADMIN'] } })
    .select('name email')
    .then((approvers) => notifyNewLeaveRequest(req.user, leave, approvers))
    .catch((err) => console.error(`[mailer] new-leave notification failed: ${err.message}`));

  res.status(201).json(leave);
  } catch (err) {
    cleanupFile();
    throw err;
  }
}

// GET /api/leaves — own leave requests (?page=&limit=)
export async function getMyLeaves(req, res) {
  const hasPagination = req.query.page !== undefined || req.query.limit !== undefined;
  if (!hasPagination) {
    const leaves = await LeaveRequest.find({ userId: req.user.id }).sort({ createdAt: -1 });
    return res.json(leaves);
  }
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 10 });
  const filter = { userId: req.user.id };
  const [total, leaves] = await Promise.all([
    LeaveRequest.countDocuments(filter),
    LeaveRequest.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
  ]);
  res.json(paginatedResponse(leaves, total, page, limit));
}

// GET /api/leaves/all?status=&page=&limit= — all leave requests (HR/ADMIN)
export async function getAllLeaves(req, res) {
  const filter = {};
  if (req.query.status) {
    if (!['PENDING', 'APPROVED', 'REJECTED'].includes(req.query.status)) {
      throw new HttpError(400, 'status must be PENDING, APPROVED or REJECTED', 'VALIDATION_ERROR');
    }
    filter.status = req.query.status;
  }

  const textFilter = employeeTextFilter(req.query.q);
  if (textFilter) {
    const users = await User.find(textFilter).select('_id');
    filter.userId = { $in: users.map((u) => u._id) };
  }

  const hasPagination = req.query.page !== undefined || req.query.limit !== undefined;
  if (!hasPagination) {
    const leaves = await LeaveRequest.find(filter)
      .populate('userId', 'employeeId email name role')
      .sort({ createdAt: -1 });
    return res.json(leaves);
  }
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 10 });
  const [total, leaves] = await Promise.all([
    LeaveRequest.countDocuments(filter),
    LeaveRequest.find(filter).populate('userId', 'employeeId email name role').sort({ createdAt: -1 }).skip(skip).limit(limit),
  ]);
  res.json(paginatedResponse(leaves, total, page, limit));
}

// PATCH /api/leaves/:id/review — HR/ADMIN approve/reject with comment,
// only while PENDING; records the reviewer and syncs attendance on approval.
export async function reviewLeave(req, res) {
  assertValidId(req.params.id);
  const { status, comment } = req.body;
  if (!['APPROVED', 'REJECTED'].includes(status)) {
    throw new HttpError(400, 'Review status must be APPROVED or REJECTED', 'VALIDATION_ERROR');
  }
  if (comment !== undefined && typeof comment !== 'string') {
    throw new HttpError(400, 'comment must be a string', 'VALIDATION_ERROR');
  }

  const leave = await LeaveRequest.findById(req.params.id);
  if (!leave) {
    throw new HttpError(404, 'Leave request not found', 'NOT_FOUND');
  }
  if (leave.status !== 'PENDING') {
    throw new HttpError(
      409,
      `This request was already ${leave.status.toLowerCase()}`,
      'ALREADY_REVIEWED',
    );
  }
  if (leave.userId.toString() === req.user.id) {
    throw new HttpError(403, 'You cannot review your own leave request', 'FORBIDDEN');
  }

  leave.status = status;
  leave.reviewerId = req.user.id;
  leave.reviewerComment = comment?.trim() ? comment.trim() : undefined;
  await leave.save();

  // Attendance derives LEAVE days at read time — nothing to write here.

  const populated = await LeaveRequest.findById(leave.id).populate(
    'userId',
    'employeeId email name role',
  );

  // Fire-and-forget: notify the applicant of the decision (never throws)
  void notifyLeaveDecision(populated.userId, populated);

  res.json(populated);
}
