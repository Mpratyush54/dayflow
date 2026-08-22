import Attendance from '../models/attendance.model.js';
import LeaveRequest from '../models/leave.model.js';
import User, { USER_PUBLIC_FIELDS } from '../models/user.model.js';
import { HttpError } from '../utils/httpError.js';
import { getApprovedLeaveDays } from '../services/attendance.service.js';

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

// SSE clients for team presence updates
const sseClients = new Set();

async function fetchStillIn() {
  const today = dateKey();
  return Attendance.countDocuments({ date: today, checkIn: { $ne: null }, checkOut: null });
}

async function broadcastStillIn() {
  try {
    const stillIn = await fetchStillIn();
    const payload = `data: ${JSON.stringify({ stillIn })}\n\n`;
    for (const res of sseClients) {
      try { res.write(payload); } catch { /* client gone */ }
    }
  } catch { /* ignore broadcast errors */ }
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
  // Notify SSE listeners asynchronously (do not block response)
  broadcastStillIn().catch(() => {});
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

  broadcastStillIn().catch(() => {});
  res.json(dayRecordJson(record));
}

// GET /api/attendance/stream — SSE for team presence (`stillIn` count)
export async function stream(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  // Send initial retry hint and comment to establish stream
  res.write(': connected\n\n');

  sseClients.add(res);

  const send = async () => {
    try {
      const stillIn = await fetchStillIn();
      res.write(`data: ${JSON.stringify({ stillIn })}\n\n`);
    } catch {
      // keep stream alive even if DB errors
    }
  };

  // Immediate push then every 5s
  await send();
  const interval = setInterval(send, 5000);
  // Keep-alive comment every 15s to prevent proxy timeouts
  const keepAlive = setInterval(() => {
    try { res.write(': keepalive\n\n'); } catch {}
  }, 15000);

  const cleanup = () => {
    clearInterval(interval);
    clearInterval(keepAlive);
    sseClients.delete(res);
    try { res.end(); } catch {}
  };

  req.on('close', cleanup);
  req.on('error', cleanup);
}

function shiftDate(key, days) {
  const d = new Date(`${key}T00:00:00`);
  d.setDate(d.getDate() + days);
  return dateKey(d);
}

// GET /api/attendance?days=7&date=YYYY-MM-DD — own daily/weekly view + summary
export async function getMine(req, res) {
  const days = Math.min(Math.max(Number(req.query.days ?? 7) || 7, 1), 31);
  let to = dateKey();
  if (typeof req.query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)) {
    const requested = req.query.date;
    // Clamp future dates to today
    if (requested <= to) to = requested;
  }
  const from = shiftDate(to, -(days - 1));

  const [records, leaveDays] = await Promise.all([
    Attendance.find({
      user: req.user._id,
      date: { $gte: from, $lte: to },
    }).sort({ date: 1 }),
    getApprovedLeaveDays([req.user._id], from, to),
  ]);
  const myLeaveDays = leaveDays.get(req.user._id.toString()) ?? new Set();

  const byDate = new Map(records.map((r) => [r.date, dayRecordJson(r)]));
  const dayList = [];
  for (let i = 0; i < days; i++) {
    const key = shiftDate(from, i);
    if (byDate.has(key)) {
      dayList.push(byDate.get(key));
    } else {
      dayList.push({
        date: key,
        weekday: new Date(`${key}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short' }),
        checkIn: null,
        checkOut: null,
        // Days covered by approved leave derive LEAVE at read time
        status: myLeaveDays.has(key) ? 'LEAVE' : null,
        workedHours: 0,
      });
    }
  }

  const isWorkday = (key) => ![0, 6].includes(new Date(`${key}T00:00:00`).getDay());
  const workdays = dayList.filter((d) => d.date <= to && isWorkday(d.date)).length;
  const present = dayList.filter((d) => d.status === 'PRESENT').length;
  const halfDay = dayList.filter((d) => d.status === 'HALF_DAY').length;
  const leave = dayList.filter((d) => d.status === 'LEAVE' && isWorkday(d.date)).length;
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
      leave,
      absent: Math.max(workdays - present - halfDay - leave, 0),
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

  const users = await User.find({ status: { $ne: 'RESIGNED' } })
    .select(`${USER_PUBLIC_FIELDS} status`)
    .sort({ employeeId: 1 });

  const [records, leaveDays] = await Promise.all([
    Attendance.find({ date }).populate('user', 'employeeId name email role'),
    // Approved-leave days derive LEAVE at read time
    getApprovedLeaveDays(users.map((u) => u._id), date, date),
  ]);

  const byUser = new Map(records.map((r) => [r.user?._id?.toString() ?? r.user?.toString(), r]));

  const rows = users.map((user) => {
    const record = byUser.get(user._id.toString());
    const onLeave = leaveDays.get(user._id.toString())?.has(date);
    return {
      user: user.toJSON(),
      checkIn: record?.checkIn ?? null,
      checkOut: record?.checkOut ?? null,
      status: record ? record.status : onLeave ? 'LEAVE' : 'ABSENT',
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

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function monthBounds(month) {
  const [y, m] = month.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const last = new Date(y, m, 0); // day 0 of next month = last day
  const today = new Date();
  const cap = first <= today && today <= last ? today : last; // current month: up to today
  return { first, last: new Date(Math.min(last, cap)) };
}

function workdaysInMonth(month) {
  const { first, last } = monthBounds(month);
  let count = 0;
  for (const d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
    const day = new Date(d).getDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}

function monthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// GET /api/attendance/report?month=YYYY-MM[&format=csv] — HR/ADMIN monthly summary per employee
export async function report(req, res) {
  const month =
    typeof req.query.month === 'string' && MONTH_RE.test(req.query.month)
      ? req.query.month
      : monthKey();

  const { first, last } = monthBounds(month);
  const workdays = workdaysInMonth(month);

  const [users, records] = await Promise.all([
    User.find({ status: { $ne: 'RESIGNED' } })
      .select(`${USER_PUBLIC_FIELDS} status`)
      .sort({ employeeId: 1 }),
    Attendance.find({
      date: { $gte: dateKey(first), $lte: dateKey(last) },
    }).select('user status checkIn checkOut'),
  ]);

  const stats = new Map(); // userId -> { present, halfDay, hours }
  for (const r of records) {
    const id = r.user.toString();
    const s = stats.get(id) ?? { present: 0, halfDay: 0, hours: 0 };
    if (r.status === 'HALF_DAY') s.halfDay++;
    else s.present++;
    if (r.checkOut) s.hours += (r.checkOut - r.checkIn) / 3600000;
    stats.set(id, s);
  }

  // Approved leave days per employee (weekdays overlapping the month window)
  const leaves = await LeaveRequest.find({
    status: 'APPROVED',
    startDate: { $lte: last },
    endDate: { $gte: first },
  }).select('userId startDate endDate');
  const leaveDaysByUser = new Map();
  for (const lv of leaves) {
    const from = new Date(Math.max(lv.startDate, first));
    const to = new Date(Math.min(lv.endDate, last));
    let days = 0;
    for (const d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      const day = new Date(d).getDay();
      if (day !== 0 && day !== 6) days++;
    }
    if (days <= 0) continue;
    const id = lv.userId.toString();
    leaveDaysByUser.set(id, (leaveDaysByUser.get(id) ?? 0) + days);
  }

  const rows = users.map((user) => {
    const s = stats.get(user._id.toString()) ?? { present: 0, halfDay: 0, hours: 0 };
    const leaveDays = Math.min(leaveDaysByUser.get(user._id.toString()) ?? 0, workdays);
    const absent = Math.max(workdays - s.present - s.halfDay - leaveDays, 0);
    return {
      employeeId: user.employeeId,
      name: user.name?.trim() || user.email,
      email: user.email,
      role: user.role,
      present: s.present,
      halfDay: s.halfDay,
      leaveDays,
      absent,
      workdays,
      hours: Math.round(s.hours * 10) / 10,
      rate: workdays === 0 ? null : Math.round(((s.present + s.halfDay * 0.5) / workdays) * 100),
    };
  });

  if (req.query.format === 'csv') {
    const header = [
      'Employee ID', 'Name', 'Email', 'Role', 'Present', 'Half days', 'Leave days',
      'Absent', 'Workdays', 'Hours', 'Rate %',
    ];
    const esc = (v) => (typeof v === 'string' && /[",\n]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v);
    const csv = [
      header.join(','),
      ...rows.map((r) =>
        [r.employeeId, r.name, r.email, r.role, r.present, r.halfDay, r.leaveDays, r.absent, r.workdays, r.hours, r.rate ?? '']
          .map(esc)
          .join(','),
      ),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="attendance-${month}.csv"`);
    return res.send(csv);
  }

  res.json({ month, workdays, generatedAt: new Date().toISOString(), rows });
}
