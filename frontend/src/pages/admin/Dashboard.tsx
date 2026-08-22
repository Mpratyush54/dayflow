import { Fragment, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import AvatarStack from '../../components/common/AvatarStack';
import Donut from '../../components/charts/Donut';
import AreaChart from '../../components/charts/AreaChart';
import { ToastStack } from '../../components/common/Toast';
import { useToasts } from '../../hooks/useToasts';
import { useAuth } from '../../hooks/useAuth';
import { getTeamAttendance } from '../../api/attendance';
import { getAllLeaves, reviewLeave } from '../../api/leaves';
import { getAllPayroll } from '../../api/payroll';
import type { LeaveRequest, Payroll, TeamAttendance } from '../../types';

function money(amount: number, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

function initialsOf(name: string) {
  return name.split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase() || '?';
}

const TONES = ['mint', 'peach', 'lavender', 'sky'];
const toneFor = (id: string) => TONES[[...(id ?? '')].reduce((s, c) => s + c.charCodeAt(0), 0) % TONES.length];

function netPay(p: Payroll) {
  const allow = Object.values(p.allowances ?? {}).reduce((s, v) => s + v, 0);
  const deduct = Object.values(p.deductions ?? {}).reduce((s, v) => s + v, 0);
  return (p.basicSalary ?? 0) + allow - deduct;
}

type Data = {
  team: TeamAttendance | null;
  pending: LeaveRequest[] | null;
  payroll: Payroll[] | null;
};

function Skeletons() {
  return (
    <div className="bento">
      <div className="skeleton-card bento__wide"><div className="skeleton-line skeleton-line--title" /><div className="skeleton-line skeleton-line--wide" /></div>
      <div className="skeleton-card bento__mid"><div className="skeleton-line skeleton-line--title" /><div className="skeleton-line" /></div>
      <div className="skeleton-card bento__mid"><div className="skeleton-line skeleton-line--title" /><div className="skeleton-line" /></div>
      <div className="skeleton-card bento__hero"><div className="skeleton-line skeleton-line--title" /><div className="skeleton-line skeleton-line--wide" /></div>
      <div className="skeleton-card bento__tall"><div className="skeleton-line skeleton-line--title" /><div className="skeleton-line" /></div>
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toasts, push } = useToasts();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [data, setData] = useState<Data>({ team: null, pending: null, payroll: null });
  const [reviewing, setReviewing] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  const refresh = useCallback(async () => {
    const [team, pending, payroll] = await Promise.all([
      getTeamAttendance(today).catch(() => null),
      getAllLeaves('PENDING').catch(() => null),
      getAllPayroll().catch(() => null),
    ]);
    setData({ team, pending, payroll });
  }, [today]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleReview(id: string, status: 'APPROVED' | 'REJECTED') {
    if (reviewing) return;
    setReviewing(id);
    try {
      await reviewLeave(id, status);
      push(`${status === 'APPROVED' ? 'Approved' : 'Rejected'} request ${id.slice(-4)}`);
      await refresh();
    } catch (err) {
      push(err instanceof Error ? err.message : 'Review failed');
    } finally {
      setReviewing(null);
    }
  }

  const rows = data.team?.rows ?? [];
  const present = rows.filter(r => r.status === 'PRESENT').length;
  const halfDay = rows.filter(r => r.status === 'HALF_DAY').length;
  const absent = rows.filter(r => r.status === 'ABSENT').length;
  const inNow = rows.filter(r => r.status === 'PRESENT' || r.status === 'HALF_DAY');
  const employeesWithPayroll = data.payroll?.length ?? 0;
  const payrollRate = rows.length > 0 ? Math.round((employeesWithPayroll / rows.length) * 100) : 0;
  const totalPayroll = (data.payroll ?? []).reduce((s, p) => s + netPay(p), 0);
  const loading = data.team === null;

  const firstName = (user?.name ?? user?.email ?? 'HR').split(/\s+/)[0];

  return (
    <Sidebar
      user={{ name: firstName, role: 'HR', initials: '?' }}
      items={[
        { to: '/admin', label: 'Overview', icon: '◧', end: true },
        { to: '/admin/employees', label: 'Employees', icon: '👥' },
        { to: '/admin/attendance', label: 'Attendance', icon: '🗓' },
        { to: '/admin/approvals', label: 'Approvals', icon: '✓', badge: (data.pending?.length ?? 0) > 0 ? String(data.pending!.length) : undefined },
        { to: '/admin/payroll', label: 'Payroll', icon: '💵' },
      ]}
      commands={[
        { label: 'Overview', hint: 'page', to: '/admin' },
        { label: 'Employees', hint: 'page', to: '/admin/employees' },
        { label: 'Attendance', hint: 'page', to: '/admin/attendance' },
        { label: 'Leave approvals', hint: 'page', to: '/admin/approvals' },
        { label: 'Payroll', hint: 'page', to: '/admin/payroll' },
        { label: 'Create employee', hint: 'action', to: '/admin/employees' },
      ]}
    >
      <div className="container page">
        <div className="orb page__orb" aria-hidden />
        <ToastStack toasts={toasts} />

        <div className="dash-head">
          <div>
            <p className="dash-sub">{new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            <h1>Admin <span className="text-gradient">overview</span></h1>
            {inNow.length > 0 && (
              <p className="ticker" style={{ marginTop: 12 }}>
                <span className="ticker__dot" aria-hidden />
                <AvatarStack people={inNow.slice(0, 3).map(r => ({ initials: initialsOf(r.user.name || r.user.email), tone: toneFor(r.user.id) }))} />
                in now · {absent} out
              </p>
            )}
          </div>
          <div className="hero-actions">
            <Button variant="outline" onClick={() => navigate('/admin/attendance')}>Full attendance</Button>
            <Button onClick={() => navigate('/admin/approvals')}>Review approvals</Button>
          </div>
        </div>

        {loading ? <Skeletons /> : (<>
        <div className="bento">
          <Card className="bento__mid stat-card card--tint-mint">
            <span className="stat-xl">{rows.length}</span>
            <span className="stat-label">Employees</span>
          </Card>
          <Card className="bento__mid stat-card card--tint-sky">
            <span className="stat-xl">{present + halfDay}</span>
            <span className="stat-label">In today {rows.length > 0 && <span className="stat-delta">{Math.round(((present + halfDay) / rows.length) * 100)}%</span>}</span>
          </Card>
          <Card className="bento__mid stat-card card--tint-peach">
            <span className="stat-xl">{data.pending?.length ?? 0}</span>
            <span className="stat-label">Pending approvals</span>
          </Card>
          <Card className="bento__mid stat-card card--dark">
            <span className="stat-xl">{absent}</span>
            <span className="stat-label">Out today</span>
          </Card>

          <Card className="bento__hero card--grad" heading="Today at a glance">
            {rows.length === 0 ? (
              <div className="empty-state">
                <p className="empty-state__title">No employees yet</p>
                <p className="dash-sub">Create employees and today&apos;s breakdown lands here.</p>
              </div>
            ) : (
              <>
                <AreaChart
                  id="admin-today"
                  points={[present, halfDay, absent]}
                  labels={['present', 'half-day', 'out']}
                  height={200}
                />
                <p className="dash-sub">
                  {data.team?.isWeekend ? 'Weekend — records are informational only.' : 'Live from check-ins · click a row below for details'}
                </p>
              </>
            )}
          </Card>

          <Card className="bento__tall card--tint-lavender">
            <Donut
              value={payrollRate}
              label="Payroll set up"
              sublabel={`${employeesWithPayroll} of ${rows.length || '—'} employees`}
            />
            <p className="dash-sub" style={{ marginTop: 12 }}>
              Monthly total {money(totalPayroll)}
            </p>
          </Card>

          <Card className="bento__wide table-card" heading={`Team · ${data.team?.date ?? today}`}>
            <table className="table">
              <thead>
                <tr><th>ID</th><th>Name</th><th>Role</th><th>Today</th></tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <Fragment key={r.user.id}>
                    <tr className="expandable-row" onClick={() => setExpanded(expanded === r.user.id ? null : r.user.id)}>
                      <td className="table-mono">{r.user.employeeId}</td>
                      <td>
                        <span className="cell-name">
                          <span className={`avatar avatar--${toneFor(r.user.id)}`}>{initialsOf(r.user.name || r.user.email)}</span>
                          {r.user.name || r.user.email}
                        </span>
                      </td>
                      <td>{r.user.role}</td>
                      <td>
                        <Badge tone={r.status === 'PRESENT' ? 'success' : r.status === 'ABSENT' ? 'error' : 'neutral'}>
                          {r.status.replace('_', '-').toLowerCase()}
                        </Badge>
                      </td>
                    </tr>
                    {expanded === r.user.id && (
                      <tr className="row-detail">
                        <td colSpan={4}>
                          <div className="row-detail__inner">
                            <span className={`avatar avatar--${toneFor(r.user.id)}`}>{initialsOf(r.user.name || r.user.email)}</span>
                            <div>
                              <strong>{r.user.name || r.user.email}</strong> · {r.user.employeeId}
                              <div className="dash-sub">
                                {r.checkIn
                                  ? `In at ${new Date(r.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}${r.checkOut ? ` · out at ${new Date(r.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''} · ${r.workedHours}h`
                                  : 'No check-in today'}
                              </div>
                            </div>
                            <Button variant="outline" style={{ marginLeft: 'auto' }} onClick={() => navigate('/admin/attendance')}>Full history</Button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
            <p className="dash-sub" style={{ marginTop: 12 }}>Click a row for details</p>
          </Card>

          <Card className="bento__mid card--tint-peach" heading="Leave approvals">
            {data.pending === null ? (
              <p className="dash-sub">Could not load pending requests.</p>
            ) : data.pending.length === 0 ? (
              <div className="empty-state">
                <p className="empty-state__title">All caught up ✓</p>
                <p className="dash-sub">No pending leave requests right now.</p>
              </div>
            ) : (
              <ul className="leave-list">
                {data.pending.slice(0, 4).map(l => {
                  const who = typeof l.userId === 'object' && l.userId ? l.userId : null;
                  return (
                    <li key={l.id} className="leave-row">
                      <span className="cell-name">
                        <span className={`avatar avatar--${toneFor(who?.id ?? l.id)}`}>{initialsOf(who?.name ?? who?.email ?? '?')}</span>
                        <span>
                          <span className="leave-who">{who?.name ?? 'Employee'}</span>
                          <span className="leave-detail" style={{ display: 'block' }}>
                            {l.type} · {new Date(l.startDate).toLocaleDateString()} → {new Date(l.endDate).toLocaleDateString()}
                          </span>
                        </span>
                      </span>
                      <span className="leave-actions">
                        <Button variant="outline" disabled={reviewing === l.id} onClick={() => handleReview(l.id, 'REJECTED')}>Reject</Button>
                        <Button disabled={reviewing === l.id} onClick={() => handleReview(l.id, 'APPROVED')}>Approve</Button>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="dash-sub" style={{ marginTop: 16 }}>
              <a href="#/admin/approvals" onClick={() => navigate('/admin/approvals')}>Open approvals →</a>
            </p>
          </Card>
        </div>

        <div className="cta-band">
          <div className="orb" aria-hidden />
          <div className="cta-band__text">
            <h3 className="cta-band__title">
              {payrollRate === 100
                ? 'Payroll is fully set up'
                : `${rows.length - employeesWithPayroll} employee${rows.length - employeesWithPayroll === 1 ? '' : 's'} still need${rows.length - employeesWithPayroll === 1 ? 's' : ''} a salary structure`}
            </h3>
            <p className="dash-sub">Monthly total {money(totalPayroll)} · next payroll run on the 1st</p>
          </div>
          <Button onClick={() => navigate('/admin/payroll')}>Manage payroll</Button>
        </div>
        </>)}
      </div>
    </Sidebar>
  );
}
