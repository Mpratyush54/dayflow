import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import CountdownRing from '../../components/common/CountdownRing';
import EmployeeDirectory from '../../components/common/EmployeeDirectory';
import Donut from '../../components/charts/Donut';
import AreaChart from '../../components/charts/AreaChart';
import Heatmap from '../../components/charts/Heatmap';
import { ToastStack } from '../../components/common/Toast';
import { useToasts } from '../../hooks/useToasts';
import { useNotifications } from '../../hooks/useNotifications';
import { useAuth } from '../../hooks/useAuth';
import { checkIn, checkOut, getMyAttendance } from '../../api/attendance';
import { getMyLeaves } from '../../api/leaves';
import { getMyPayroll } from '../../api/payroll';
import type { AttendanceDay, AttendanceWindow, LeaveRequest, Payroll } from '../../types';

type Data = {
  attendance: AttendanceWindow | null;
  leaves: LeaveRequest[] | null;
  payroll: Payroll | null;
};

function money(amount: number, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

function netPay(p: Payroll) {
  const allow = Object.values(p.allowances ?? {}).reduce((s, v) => s + v, 0);
  const deduct = Object.values(p.deductions ?? {}).reduce((s, v) => s + v, 0);
  return (p.basicSalary ?? 0) + allow - deduct;
}

function daysToPayday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
}

function daysInMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
}

function heatmapLevel(d: AttendanceDay): 0 | 1 | 2 | 3 {
  if (d.status === 'PRESENT') return 3;
  if (d.status === 'HALF_DAY') return 2;
  const dow = new Date(`${d.date}T00:00:00`).getDay();
  return dow === 0 || dow === 6 ? 1 : 0;
}

function computeStreak(days: AttendanceDay[] | undefined) {
  if (!days || days.length === 0) return 0;
  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    const d = days[i];
    if (d.status === 'PRESENT' || d.status === 'HALF_DAY') streak++;
    else if (i === days.length - 1) continue; // today is still open
    else break;
  }
  return streak;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function Skeletons() {
  return (
    <div className="bento">
      <div className="skeleton-card bento__hero"><div className="skeleton-line skeleton-line--title" /><div className="skeleton-line skeleton-line--wide" /></div>
      <div className="skeleton-card bento__mid"><div className="skeleton-line skeleton-line--title" /><div className="skeleton-line" /></div>
      <div className="skeleton-card bento__mid"><div className="skeleton-line skeleton-line--title" /><div className="skeleton-line" /></div>
      <div className="skeleton-card bento__wide"><div className="skeleton-line skeleton-line--title" /><div className="skeleton-line skeleton-line--wide" /></div>
      <div className="skeleton-card bento__mid"><div className="skeleton-line skeleton-line--title" /><div className="skeleton-line" /></div>
    </div>
  );
}

export default function EmployeeDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toasts, push } = useToasts();
  const { pushNotification } = useNotifications();
  const [now, setNow] = useState(() => new Date());
  const [data, setData] = useState<Data>({ attendance: null, leaves: null, payroll: null });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const refresh = useCallback(async () => {
    const [attendance, leaves, payroll] = await Promise.all([
      getMyAttendance(31).catch(() => null),
      getMyLeaves().catch(() => null),
      getMyPayroll().catch(() => null), // 404 until HR sets a structure
    ]);
    setData({ attendance, leaves, payroll });
  }, []);

  useEffect(() => {
    let alive = true;
    void (async () => {
      await refresh();
      void alive;
    })();
    return () => {
      alive = false;
    };
  }, [refresh]);

  useEffect(() => {
    const todayDay = data.attendance?.days[data.attendance.days.length - 1];
    if (data.attendance === null || !todayDay) return;
    const hour = now.getHours();
    if (!todayDay.checkIn && hour >= 9 && hour < 18) {
      const todayKey = now.toISOString().slice(0, 10);
      pushNotification(
        {
          kind: 'check-in-reminder',
          title: 'Check in reminder',
          message: "You haven't checked in yet today — tap to mark attendance",
          href: '/attendance',
        },
        { dedupeKey: `check-in-${todayKey}` },
      );
    }
  }, [data.attendance, now, pushNotification]);

  useEffect(() => {
    if (data.payroll) {
      pushNotification(
        {
          kind: 'payroll-ready',
          title: 'Payroll ready',
          message: 'Your latest payslip is available to view',
          href: '/payslip',
        },
        { dedupeKey: `payroll-ready-${data.payroll.id ?? 'current'}` },
      );
    }
  }, [data.payroll, pushNotification]);

  const firstName = (user?.name ?? user?.email ?? 'there').split(/\s+/)[0];
  const today = data.attendance?.days[data.attendance.days.length - 1];
  const week = data.attendance?.days.slice(-7) ?? [];
  const hours = week.map(d => d.workedHours ?? 0);
  const streak = computeStreak(data.attendance?.days);
  const pendingLeaves = data.leaves?.filter(l => l.status === 'PENDING').length ?? 0;
  const recentLeaves = data.leaves?.slice(0, 3) ?? [];
  const loading = data.attendance === null;
  const checkedIn = Boolean(today?.checkIn);
  const checkedOut = Boolean(today?.checkOut);
  const liveHours =
    checkedIn && !checkedOut && today?.checkIn
      ? Math.max((now.getTime() - new Date(today.checkIn).getTime()) / 3600000, 0)
      : 0;

  async function handleCheckInOut() {
    if (!today || busy) return;
    setBusy(true);
    try {
      if (today.checkIn && !today.checkOut) {
        await checkOut();
        push('Checked out — great work today ✓');
      } else if (!today.checkIn) {
        await checkIn();
        push('Checked in at ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' — have a productive day!');
      }
      await refresh();
    } catch (err) {
      push(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sidebar
      user={{ name: firstName, role: 'Employee', initials: '?' }}
      items={[
        { to: '/dashboard', label: 'Dashboard', icon: '◧', end: true },
        { to: '/profile', label: 'Profile', icon: '👤' },
        { to: '/attendance', label: 'Attendance', icon: '🗓' },
        { to: '/leaves', label: 'Leave', icon: '🌴', badge: pendingLeaves > 0 ? String(pendingLeaves) : undefined },
        { to: '/payslip', label: 'Payslip', icon: '💵' },
      ]}
      commands={[
        { label: 'Dashboard', hint: 'page', to: '/dashboard' },
        { label: 'My profile', hint: 'page', to: '/profile' },
        { label: 'Attendance', hint: 'page', to: '/attendance' },
        { label: 'Apply for leave', hint: 'action', to: '/leaves' },
        { label: 'View payslip', hint: 'action', to: '/payslip' },
      ]}
    >
      <div className="container page">
        <div className="orb page__orb" aria-hidden />
        <ToastStack toasts={toasts} />

        <div className="dash-head">
          <div>
            <p className="dash-sub">
              {now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
              {' · '}
              {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
            <h1>Good {now.getHours() < 12 ? 'morning' : now.getHours() < 17 ? 'afternoon' : 'evening'},<br /><span className="text-gradient">{firstName}</span></h1>
            {today && (
              <p className="ticker" style={{ marginTop: 12 }}>
                <span
                  className={`ticker__dot ${checkedIn && !checkedOut ? 'ticker__dot--active' : 'ticker__dot--idle'}`}
                  aria-hidden
                />
                {checkedOut
                  ? `Day complete · ${today.workedHours}h logged`
                  : checkedIn
                    ? `Working since ${fmtTime(today.checkIn!)} · ${liveHours.toFixed(1)}h`
                    : 'Not checked in yet — tap Check IN when you arrive'}
              </p>
            )}
          </div>
          <div className="hero-actions">
            {streak > 1 && <span className="streak">🔥 {streak}-day streak</span>}
            <Button
              variant={checkedIn && !checkedOut ? 'outline' : 'primary'}
              onClick={handleCheckInOut}
              disabled={busy || loading || checkedOut}
            >
              {busy ? '…' : checkedOut ? 'Done for today' : checkedIn ? 'Check OUT →' : 'Check IN →'}
            </Button>
          </div>
        </div>

        {loading ? <Skeletons /> : (<>
        <div className="bento">
          <EmployeeDirectory />

          <Card className="bento__hero card--grad" heading="Hours this week">
            {hours.some(h => h > 0) ? (
              <>
                <AreaChart id="hours" points={hours} labels={week.map(d => d.weekday)} suffix="h" height={200} />
                <p className="dash-sub">
                  {data.attendance!.summary.hours}h logged in the last 31 days · {data.attendance!.summary.present} present · {data.attendance!.summary.halfDay} half-days
                </p>
              </>
            ) : (
              <div className="empty-state">
                <p className="empty-state__title">No hours logged yet</p>
                <p className="dash-sub">Check in with the button above and your week fills in here.</p>
              </div>
            )}
          </Card>

          <Card className="bento__tall card--tint-mint donut-card">
            {data.attendance!.summary.rate !== null ? (
              <Donut value={data.attendance!.summary.rate} label="Attendance · last 31 days" sublabel={`${data.attendance!.summary.present + data.attendance!.summary.halfDay}/${data.attendance!.summary.workdays} workdays`} />
            ) : (
              <div className="empty-state">
                <p className="empty-state__title">No workdays yet</p>
                <p className="dash-sub">Your attendance rate appears after your first check-in.</p>
              </div>
            )}
          </Card>

          <Card className="bento__mid card--tint-lavender" heading="This month">
            <Heatmap days={(data.attendance?.days ?? []).map(d => ({ date: Number(d.date.slice(-2)), level: heatmapLevel(d) }))} />
            <div className="heatmap-legend">
              <span>less</span>
              <span className="heatmap__cell heatmap__cell--1" />
              <span className="heatmap__cell heatmap__cell--2" />
              <span className="heatmap__cell heatmap__cell--3" />
              <span>more</span>
            </div>
          </Card>

          <Card className="bento__mid card--dark">
            <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
              <CountdownRing days={daysToPayday()} total={daysInMonth()} label="to payday" />
              <div>
                <span className="stat-xl">{data.payroll ? money(netPay(data.payroll), data.payroll.currency) : '—'}</span>
                <p className="dash-sub" style={{ color: 'var(--color-on-dark-soft)', marginTop: 6 }}>Net pay · this month</p>
              </div>
            </div>
            <div className="summary-row" style={{ marginTop: 16 }}>
              <span className="summary-row__label">Basic</span>
              <span className="summary-row__value">{data.payroll ? money(data.payroll.basicSalary, data.payroll.currency) : '—'}</span>
            </div>
            <div className="summary-row">
              <span className="summary-row__label">Allowances − deductions</span>
              <span className="summary-row__value">
                {data.payroll
                  ? `${money(Object.values(data.payroll.allowances ?? {}).reduce((s, v) => s + v, 0), data.payroll.currency)} − ${money(Object.values(data.payroll.deductions ?? {}).reduce((s, v) => s + v, 0), data.payroll.currency)}`
                  : '—'}
              </span>
            </div>
            {!data.payroll && (
              <p className="dash-sub" style={{ color: 'var(--color-on-dark-soft)' }}>
                HR hasn&apos;t set your salary structure yet.
              </p>
            )}
          </Card>

          <Card className="bento__mid card--tint-peach" heading="Leave">
            {data.leaves === null ? (
              <p className="dash-sub">Could not load your leave requests.</p>
            ) : data.leaves.length === 0 ? (
              <div className="empty-state">
                <p className="empty-state__title">No leave requests</p>
                <p className="dash-sub">Apply for time off and track it here.</p>
                <Button variant="outline" onClick={() => navigate('/leaves')}>Apply for leave</Button>
              </div>
            ) : (
              <ul className="leave-list">
                {recentLeaves.map(l => (
                  <li key={l.id} className="leave-row">
                    <span>
                      <span className="leave-who">{l.type}</span>
                      <span className="leave-detail" style={{ display: 'block' }}>
                        {new Date(l.startDate).toLocaleDateString()} → {new Date(l.endDate).toLocaleDateString()}
                      </span>
                    </span>
                    <Badge tone={l.status === 'APPROVED' ? 'success' : l.status === 'REJECTED' ? 'error' : 'neutral'}>
                      {l.status.toLowerCase()}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
            <p className="dash-sub" style={{ marginTop: 12 }}>
              <Link to="/leaves">View all →</Link>
            </p>
          </Card>

          <Card className="bento__wide" heading="Recent activity">
            <ul className="activity-list">
              {(data.leaves ?? []).slice(0, 4).map(l => (
                <li key={`a-${l.id}`}>
                  <span>
                    {l.status === 'PENDING'
                      ? `Leave request (${l.type}) submitted`
                      : `Leave request (${l.type}) ${l.status.toLowerCase()}`}
                    {l.reviewerComment ? ` — “${l.reviewerComment}”` : ''}
                  </span>
                  <span className="activity-when">{new Date(l.startDate).toLocaleDateString()}</span>
                </li>
              ))}
              {(data.attendance?.days ?? []).slice(-5).reverse().filter(d => d.checkIn).slice(0, 3).map(d => (
                <li key={`b-${d.date}`}>
                  <span>Checked in at {new Date(d.checkIn!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} on {d.weekday}</span>
                  <span className="activity-when">{d.date.slice(5)}</span>
                </li>
              ))}
              {(!data.leaves || data.leaves.length === 0) && !(data.attendance?.days.some(d => d.checkIn)) && (
                <li><span>Your check-ins and leave activity will show up here.</span></li>
              )}
            </ul>
          </Card>
        </div>
        </>)}
      </div>
    </Sidebar>
  );
}
