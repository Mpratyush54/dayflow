import Attendance from '../models/attendance.model.js';
import User, { USER_PUBLIC_FIELDS } from '../models/user.model.js';
import { HttpError } from '../utils/httpError.js';

const FULL_DAY_MIN_HOURS = 4;

// Local-calendar date key (server timezone) — one attendance record per day
function dateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function dayRecordJson(record) {
  const out = record.toJSON();
  out.weekday = new Date(`${out.date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short' });
  return out;
}

// POST /api/attendance/checkin — start today's record
export async function checkin(req, res) {
  const today = dateKey();
  const existing = await Attendance.findOne({ user: req.user._id, date: today });
  if (existing) {
    throw new HttpError(
      409,
      `Already checked in today at ${existing.checkIn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      'ALREADY_CHECKED_IN',
    );
  }
  const record = await Attendance.create({
    user: req.user._id,
    date: today,
    checkIn: new Date(),
  });
  res.status(201).json(dayRecordJson(record));
}

// POST /api/attendance/checkout — close today's record (>=4h = full day)
export async function checkout(req, res) {
  const today = dateKey();
  const record = await Attendance.findOne({ user: req.user._id, date: today });
  if (!record) {
    throw new HttpError(409, 'You have not checked in today', 'NOT_CHECKED_IN');
  }
  if (record.checkOut) {
    throw new HttpError(409, 'Already checked out today', 'ALREADY_CHECKED_OUT');
  }

  record.checkOut = new Date();
  const hours = (record.checkOut - record.checkIn) / 3600000;
  record.status = hours >= FULL_DAY_MIN_HOURS ? 'PRESENT' : 'HALF_DAY';
  await record.save();

  res.json(dayRecordJson(record));
}

function shiftDate(key, days) {
  const d = new Date(`${key}T00:00:00`);
  d.setDate(d.getDate() + days);
  return dateKey(d);
}

// GET /api/attendance?days=7 — own daily/weekly view + summary
export async function getMine(req, res) {
  const days = Math.min(Math.max(Number(req.query.days ?? 7) || 7, 1), 31);
  const to = dateKey();
  const from = shiftDate(to, -(days - 1));

  const records = await Attendance.find({
    user: req.user._id,
    date: { $gte: from, $lte: to },
  }).sort({ date: 1 });

  const byDate = new Map(records.map((r) => [r.date, dayRecordJson(r)]));
  const dayList = [];
  for (let i = 0; i < days; i++) {
    const key = shiftDate(from, i);
    dayList.push(
      byDate.get(key) ?? {
        date: key,
        weekday: new Date(`${key}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short' }),
        checkIn: null,
        checkOut: null,
        status: null,
        workedHours: 0,
      },
    );
  }

  const isWorkday = (key) => ![0, 6].includes(new Date(`${key}T00:00:00`).getDay());
  const workdays = dayList.filter((d) => d.date <= to && isWorkday(d.date)).length;
  const present = dayList.filter((d) => d.status === 'PRESENT').length;
  const halfDay = dayList.filter((d) => d.status === 'HALF_DAY').length;
  const hours =
    Math.round(dayList.reduce((sum, d) => sum + (d.workedHours ?? 0), 0) * 10) / 10;
  const rate = workdays === 0 ? null : Math.round(((present + halfDay * 0.5) / workdays) * 100);

  res.json({
    range: { from, to, days },
    days: dayList,
    summary: {
      workdays,
      present,
      halfDay,
      absent: Math.max(workdays - present - halfDay, 0),
      hours,
      rate,
    },
  });
}

// GET /api/attendance/team?date=YYYY-MM-DD — HR/ADMIN overview for a date
export async function getTeam(req, res) {
  const date = typeof req.query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)
    ? req.query.date
    : dateKey();

  const [users, records] = await Promise.all([
    User.find({ status: { $ne: 'RESIGNED' } })
      .select(`${USER_PUBLIC_FIELDS} status`)
      .sort({ employeeId: 1 }),
    Attendance.find({ date }).populate('user', 'employeeId name email role'),
  ]);

  const byUser = new Map(records.map((r) => [r.user?._id?.toString() ?? r.user?.toString(), r]));

  const rows = users.map((user) => {
    const record = byUser.get(user._id.toString());
    return {
      user: user.toJSON(),
      checkIn: record?.checkIn ?? null,
      checkOut: record?.checkOut ?? null,
      status: record ? record.status : 'ABSENT',
      workedHours: record ? record.toJSON().workedHours : 0,
    };
  });

  const weekday = new Date(`${date}T00:00:00`).getDay();
  res.json({
    date,
    isWeekend: weekday === 0 || weekday === 6,
    rows,
  });
}
