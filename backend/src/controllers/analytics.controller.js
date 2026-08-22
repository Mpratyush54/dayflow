import Attendance from '../models/attendance.model.js';
import LeaveRequest from '../models/leave.model.js';
import Payroll from '../models/payroll.model.js';
import User from '../models/user.model.js';

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// GET /api/analytics/summary?month=YYYY-MM — HR/ADMIN analytics for the reports page
export async function summary(req, res) {
  const month =
    typeof req.query.month === 'string' && MONTH_RE.test(req.query.month)
      ? req.query.month
      : currentMonthKey();

  const [y, m] = month.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const lastDay = new Date(y, m, 0);
  const today = new Date();
  const last = first <= today && today <= lastDay ? today : lastDay;
  const fromKey = dateKey(first);
  const toKey = dateKey(last);

  const [users, attendance, leaves, payrolls] = await Promise.all([
    User.find().select('role status'),
    Attendance.find({ date: { $gte: fromKey, $lte: toKey } }).select('date status'),
    LeaveRequest.find({
      status: 'APPROVED',
      startDate: { $lte: last },
      endDate: { $gte: first },
    }).select('type startDate endDate'),
    Payroll.find().select('basicSalary allowances deductions'),
    // PENDING count fetched separately below (different filter)
  ]);

  const pendingLeaves = await LeaveRequest.countDocuments({ status: 'PENDING' });

  // Headcount
  const byRole = { EMPLOYEE: 0, HR: 0, ADMIN: 0 };
  for (const u of users) byRole[u.role] = (byRole[u.role] ?? 0) + 1;
  const headcount = {
    total: users.length,
    active: users.filter((u) => u.status !== 'RESIGNED').length,
    byRole,
  };

  // Attendance trend: present/half-day counts per day of the month (with data so far)
  const trendMap = new Map();
  for (const r of attendance) {
    const t = trendMap.get(r.date) ?? { date: r.date, present: 0, halfDay: 0 };
    if (r.status === 'HALF_DAY') t.halfDay++;
    else t.present++;
    trendMap.set(r.date, t);
  }
  const attendanceTrend = [...trendMap.values()].sort((a, b) => a.date.localeCompare(b.date));

  // Leave usage by type: approved weekday-days overlapping the month
  const leaveByType = { PAID: 0, SICK: 0, UNPAID: 0 };
  for (const lv of leaves) {
    const from = new Date(Math.max(lv.startDate, first));
    const to = new Date(Math.min(lv.endDate, last));
    let days = 0;
    for (const d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      const day = new Date(d).getDay();
      if (day !== 0 && day !== 6) days++;
    }
    leaveByType[lv.type] += days;
  }
  const leaveUsage = Object.entries(leaveByType).map(([type, days]) => ({ type, days }));

  // Payroll totals across employees with a Payroll record
  let gross = 0;
  let deductions = 0;
  for (const p of payrolls) {
    gross += (p.basicSalary ?? 0) + [...(p.allowances?.values() ?? [])].reduce((a, b) => a + b, 0);
    deductions += [...(p.deductions?.values() ?? [])].reduce((a, b) => a + b, 0);
  }

  res.json({
    month,
    headcount,
    attendanceTrend,
    leaveUsage,
    pendingLeaves,
    payroll: { withSalary: payrolls.length, gross, deductions, net: gross - deductions },
    generatedAt: new Date().toISOString(),
  });
}
