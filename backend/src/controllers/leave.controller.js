import mongoose from 'mongoose';
import LeaveRequest from '../models/leave.model.js';
import User from '../models/user.model.js';
import { HttpError } from '../utils/httpError.js';
import { notifyLeaveDecision, notifyNewLeaveRequest } from '../utils/mailer.js';

const LEAVE_TYPES = ['PAID', 'SICK', 'UNPAID'];

// Malformed ids would throw a CastError (500) in findById
function assertValidId(id) {
  if (!mongoose.isValidObjectId(id)) {
    throw new HttpError(404, 'Leave request not found', 'NOT_FOUND');
  }
}

function parseDate(value, field) {
  const date = new Date(value);
  if (typeof value !== 'string' || Number.isNaN(date.getTime())) {
    throw new HttpError(400, `${field} must be a valid date (YYYY-MM-DD)`, 'VALIDATION_ERROR');
  }
  // Normalise to UTC midnight so day-granularity ranges compare cleanly
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

// POST /api/leaves — apply for leave (type, date range, remarks)
export async function applyLeave(req, res) {
  const { type, startDate, endDate, remarks } = req.body;

  if (!LEAVE_TYPES.includes(type)) {
    throw new HttpError(400, 'Leave type must be PAID, SICK or UNPAID', 'VALIDATION_ERROR');
  }
  const start = parseDate(startDate, 'startDate');
  const end = parseDate(endDate, 'endDate');
  if (end < start) {
    throw new HttpError(400, 'endDate cannot be before startDate', 'VALIDATION_ERROR');
  }

  // #38: Block backdated leave for employees — startDate must be today or later
  // Allows HR/ADMIN with allowPast flag (per spec), otherwise rejects past dates
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const isPrivileged = req.user?.role === 'HR' || req.user?.role === 'ADMIN';
  const allowPast = req.body?.allowPast === true;
  if (start < today && !(isPrivileged && allowPast)) {
    throw new HttpError(400, 'startDate cannot be in the past', 'VALIDATION_ERROR');
  }

  // Reject overlapping PENDING/APPROVED leave for the same user
  const overlap = await LeaveRequest.exists({
    userId: req.user.id,
    status: { $in: ['PENDING', 'APPROVED'] },
    startDate: { $lte: end },
    endDate: { $gte: start },
  });
  if (overlap) {
    throw new HttpError(
      409,
      'You already have a pending or approved leave overlapping these dates',
      'LEAVE_OVERLAP',
    );
  }

  const leave = await LeaveRequest.create({
    userId: req.user.id,
    type,
    startDate: start,
    endDate: end,
    remarks: typeof remarks === 'string' ? remarks : undefined,
  });

  // Fire-and-forget: notify HR/ADMIN approvers; mailer problems never break the request
  User.find({ role: { $in: ['HR', 'ADMIN'] } })
    .select('name email')
    .then((approvers) => notifyNewLeaveRequest(req.user, leave, approvers))
    .catch((err) => console.error(`[mailer] new-leave notification failed: ${err.message}`));

  res.status(201).json(leave);
}

// GET /api/leaves — own leave requests
export async function getMyLeaves(req, res) {
  const leaves = await LeaveRequest.find({ userId: req.user.id }).sort({ createdAt: -1 });
  res.json(leaves);
}

// GET /api/leaves/all?status= — all leave requests (HR/ADMIN)
export async function getAllLeaves(req, res) {
  const filter = {};
  if (req.query.status) {
    if (!['PENDING', 'APPROVED', 'REJECTED'].includes(req.query.status)) {
      throw new HttpError(400, 'status must be PENDING, APPROVED or REJECTED', 'VALIDATION_ERROR');
    }
    filter.status = req.query.status;
  }

  const leaves = await LeaveRequest.find(filter)
    .populate('userId', 'employeeId email name role')
    .sort({ createdAt: -1 });
  res.json(leaves);
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
