import { Fragment, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import AvatarStack from '../../components/common/AvatarStack';
import Donut from '../../components/charts/Donut';
import AreaChart from '../../components/charts/AreaChart';
import Sparkline from '../../components/charts/Sparkline';
import { ToastStack } from '../../components/common/Toast';
import { useToasts } from '../../hooks/useToasts';
import { useCountUp } from '../../hooks/useCountUp';
import { useDelayedReady } from '../../hooks/useDelayedReady';

const employees = [
  { id: 'EMP-0042', name: 'Pratyush M.', initials: 'PM', tone: 'mint', role: 'Employee', status: 'PRESENT', streak: 12 },
  { id: 'EMP-0038', name: 'Aisha K.', initials: 'AK', tone: 'peach', role: 'Employee', status: 'PRESENT', streak: 5 },
  { id: 'EMP-0051', name: 'Rohan S.', initials: 'RS', tone: 'lavender', role: 'Employee', status: 'HALF_DAY', streak: 2 },
  { id: 'EMP-0027', name: 'Meera T.', initials: 'MT', tone: 'sky', role: 'HR', status: 'LEAVE', streak: 0 },
];

const pendingLeaves = [
  { id: 'LV-104', who: 'Pratyush M. · EMP-0042', detail: 'Sick · Aug 24–25', initials: 'PM', tone: 'mint' },
  { id: 'LV-105', who: 'Rohan S. · EMP-0051', detail: 'Paid · Aug 28', initials: 'RS', tone: 'lavender' },
];

const attendanceTrend = [3, 4, 4, 3, 4, 3, 2, 4, 4, 3, 4, 4, 3, 4];
const trendLabels = ['W1', '', 'W2', '', 'W3', '', 'W4'];

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
  const present = useCountUp(3, 700, 150);
  const pending = useCountUp(2, 700, 250);
  const ready = useDelayedReady();
  const { toasts, push } = useToasts();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [resolved, setResolved] = useState<string[]>([]);

  const visibleLeaves = pendingLeaves.filter(l => !resolved.includes(l.id));

  return (
    <Sidebar
      user={{ name: 'Meera T.', role: 'HR · Admin', initials: 'MT' }}
      items={[
        { to: '/admin', label: 'Overview', icon: '◧' },
        { to: '/admin/employees', label: 'Employees', icon: '👥' },
        { to: '/admin/attendance', label: 'Attendance', icon: '🗓' },
        { to: '/admin/approvals', label: 'Approvals', icon: '✓', badge: '2' },
        { to: '/admin/payroll', label: 'Payroll', icon: '💵' },
      ]}
      commands={[
        { label: 'Overview', hint: 'page', to: '/admin' },
        { label: 'Employees', hint: 'page', to: '/admin/employees' },
        { label: 'Attendance', hint: 'page', to: '/admin/attendance' },
        { label: 'Leave approvals', hint: 'page', to: '/admin/approvals' },
        { label: 'Payroll', hint: 'page', to: '/admin/payroll' },
        { label: 'Pratyush M.', hint: 'employee', to: '/admin/employees' },
        { label: 'Aisha K.', hint: 'employee', to: '/admin/employees' },
        { label: 'Employee view', hint: 'demo', to: '/dashboard' },
      ]}
    >
      <div className="container page">
        <div className="orb page__orb" aria-hidden />
        <ToastStack toasts={toasts} />

        {!ready ? <Skeletons /> : (<>
        <div className="dash-head">
          <div>
            <p className="dash-sub">Friday, August 22</p>
            <h1>Admin <span className="text-gradient">overview</span></h1>
            <p className="ticker" style={{ marginTop: 12 }}>
              <span className="ticker__dot" aria-hidden />
              <AvatarStack people={employees.slice(0, 3).map(e => ({ initials: e.initials, tone: e.tone }))} />
              in now · Meera on leave
            </p>
          </div>
          <div className="hero-actions">
            <Button variant="outline">Export report</Button>
            <Button onClick={() => navigate('/admin/approvals')}>Review approvals</Button>
          </div>
        </div>

        <div className="bento">
          <Card className="bento__mid stat-card card--tint-mint">
            <Sparkline points={[3, 3, 4, 4, 4]} tone="mint" />
            <span className="stat-xl">{employees.length}</span>
            <span className="stat-label">Employees <span className="stat-delta">↑ 1</span></span>
          </Card>
          <Card className="bento__mid stat-card card--tint-sky">
            <Sparkline points={[3, 4, 4, 3, 3]} tone="sky" />
            <span className="stat-xl">{present}</span>
            <span className="stat-label">Present today <span className="stat-delta">75%</span></span>
          </Card>
          <Card className="bento__mid stat-card card--tint-peach">
            <Sparkline points={[1, 2, 1, 3, 2]} tone="peach" />
            <span className="stat-xl">{pending}</span>
            <span className="stat-label">Pending approvals</span>
          </Card>
          <Card className="bento__mid stat-card card--dark">
            <Sparkline points={[0, 1, 0, 1, 1]} tone="lavender" />
            <span className="stat-xl">1</span>
            <span className="stat-label">On leave <span className="stat-delta stat-delta--down">↓ 1</span></span>
          </Card>

          <Card className="bento__hero card--grad" heading="Attendance trend">
            <AreaChart id="admin-attendance" points={attendanceTrend} labels={trendLabels} height={220} />
            <p className="dash-sub">Weekly present count · last 14 weeks <span className="stat-delta">↑ 8% vs Q1</span></p>
          </Card>

          <Card className="bento__tall card--tint-lavender">
            {/* TODO(#11): wire to GET /api/payroll/all + GET /api/employees */}
            <Donut value={75} label="Payroll processed" sublabel="3 of 4 employees" />
          </Card>

          <Card className="bento__wide table-card" heading="Employees">
            <table className="table">
              <thead>
                <tr><th>ID</th><th>Name</th><th>Role</th><th>Today</th></tr>
              </thead>
              <tbody>
                {employees.map((e) => (
                  <Fragment key={e.id}>
                    <tr
                      className="expandable-row"
                      onClick={() => setExpanded(expanded === e.id ? null : e.id)}
                    >
                      <td className="table-mono">{e.id}</td>
                      <td><span className="cell-name"><span className={`avatar avatar--${e.tone}`}>{e.initials}</span>{e.name}</span></td>
                      <td>{e.role}</td>
                      <td>
                        <Badge tone={e.status === 'PRESENT' ? 'success' : e.status === 'LEAVE' ? 'error' : 'neutral'}>
                          {e.status.replace('_', '-').toLowerCase()}
                        </Badge>
                      </td>
                    </tr>
                    {expanded === e.id && (
                      <tr className="row-detail">
                        <td colSpan={4}>
                          <div className="row-detail__inner">
                            <span className={`avatar avatar--${e.tone}`}>{e.initials}</span>
                            <div>
                              <strong>{e.name}</strong> · {e.id}
                              <div className="dash-sub">{e.streak > 0 ? `🔥 ${e.streak}-day attendance streak` : 'No active streak'}</div>
                            </div>
                            <Button variant="outline" style={{ marginLeft: 'auto' }}>View profile</Button>
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
            <ul className="leave-list">
              {visibleLeaves.map((l) => (
                <li key={l.id} className="leave-row">
                  <span className="cell-name">
                    <span className={`avatar avatar--${l.tone}`}>{l.initials}</span>
                    <span>
                      <span className="leave-who">{l.who}</span>
                      <span className="leave-detail" style={{ display: 'block' }}>{l.detail}</span>
                    </span>
                  </span>
                  <span className="leave-actions">
                    <Button variant="outline" onClick={() => { setResolved(r => [...r, l.id]); push(`Rejected ${l.id} · ${l.detail}`); }}>Reject</Button>
                    <Button onClick={() => { setResolved(r => [...r, l.id]); push(`Approved ${l.id} · ${l.detail}`); }}>Approve</Button>
                  </span>
                </li>
              ))}
              {visibleLeaves.length === 0 && (
                <li className="leave-row" style={{ justifyContent: 'center', color: 'var(--color-muted)' }}>
                  All caught up ✓
                </li>
              )}
            </ul>
            <p className="dash-sub" style={{ marginTop: 16 }}>2 pending · 14 approved this month</p>
          </Card>
        </div>

        <div className="cta-band">
          <div className="orb" aria-hidden />
          <div className="art" style={{ position: 'absolute', inset: 0, borderRadius: 'inherit' }} aria-hidden />
          <div className="cta-band__text">
            <h3 className="cta-band__title">August payroll is almost ready</h3>
            <p className="cta-band__sub">3 of 4 salary structures reviewed · 1 pending update</p>
          </div>
          <Button onClick={() => navigate('/admin/payroll')}>Review payroll</Button>
        </div>
        </>)}
      </div>
    </Sidebar>
  );
}
