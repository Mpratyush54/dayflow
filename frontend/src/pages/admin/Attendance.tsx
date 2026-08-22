import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Sparkline from '../../components/charts/Sparkline';
import { ToastStack } from '../../components/common/Toast';
import { useToasts } from '../../hooks/useToasts';
import { getTeamAttendance } from '../../api/attendance';
import type { TeamAttendance } from '../../types';

function Skeletons() {
  return (
    <div className="bento">
      <div className="skeleton-card bento__wide"><div className="skeleton-line skeleton-line--title" /><div className="skeleton-line skeleton-line--wide" /></div>
      <div className="skeleton-card bento__mid"><div className="skeleton-line skeleton-line--title" /><div className="skeleton-line" /></div>
      <div className="skeleton-card bento__mid"><div className="skeleton-line skeleton-line--title" /><div className="skeleton-line" /></div>
      <div className="skeleton-card bento__mid"><div className="skeleton-line skeleton-line--title" /><div className="skeleton-line" /></div>
    </div>
  );
}

function fmtTime(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function AttendanceOverview() {
  const { toasts, push } = useToasts();
  const [searchParams, setSearchParams] = useSearchParams();
  const paramDate = searchParams.get('date');
  const date = paramDate && /^\d{4}-\d{2}-\d{2}$/.test(paramDate) ? paramDate : todayKey();
  const [data, setData] = useState<TeamAttendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (forDate: string) => {
    setLoading(true);
    try {
      setData(await getTeamAttendance(forDate));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team attendance');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(date);
  }, [date, load]);

  const rows = data?.rows ?? [];
  const present = rows.filter((r) => r.status === 'PRESENT').length;
  const halfDay = rows.filter((r) => r.status === 'HALF_DAY').length;
  const absent = rows.filter((r) => r.status === 'ABSENT').length;
  const onLeave = rows.filter((r) => r.status === 'LEAVE').length;
  const stillIn = rows.filter((r) => r.checkIn && !r.checkOut).length;

  return (
    <Sidebar
      user={{ name: 'HR', role: 'HR · Admin', initials: '··' }}
      items={[
        { to: '/admin', label: 'Overview', icon: '◧' },
        { to: '/admin/employees', label: 'Employees', icon: '👥' },
        { to: '/admin/attendance', label: 'Attendance', icon: '🗓' },
        { to: '/admin/approvals', label: 'Approvals', icon: '✓' },
        { to: '/admin/payroll', label: 'Payroll', icon: '💵' },
        { to: '/admin/reports', label: 'Reports', icon: '📊' },
      ]}
      commands={[
        { label: 'Overview', hint: 'page', to: '/admin' },
        { label: 'Employees', hint: 'page', to: '/admin/employees' },
        { label: 'Attendance', hint: 'page', to: '/admin/attendance' },
        { label: 'Leave approvals', hint: 'page', to: '/admin/approvals' },
        { label: 'Payroll', hint: 'page', to: '/admin/payroll' },
      ]}
    >
      <div className="container page">
        <div className="orb page__orb" aria-hidden />
        <ToastStack toasts={toasts} />

        {loading && !data ? (
          <Skeletons />
        ) : error && !data ? (
          <Card heading="Team attendance">
            <p className="form-error">{error}</p>
            <Button variant="outline" onClick={() => void load(date)}>Retry</Button>
          </Card>
        ) : data && (
          <>
            <div className="dash-head">
              <div>
                <p className="dash-sub">{new Date(`${data.date}T00:00:00`).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                <h1>Team <span className="text-gradient">attendance</span></h1>
                {data.isWeekend && (
                  <p className="ticker" style={{ marginTop: 12 }}>
                    <span className="ticker__dot" aria-hidden />
                    Weekend — no attendance expected
                  </p>
                )}
              </div>
              <div className="hero-actions">
                <input
                  type="date"
                  className="input"
                  style={{ width: 'auto', height: 'var(--button-height)' }}
                  value={date}
                  max={todayKey()}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v && /^\d{4}-\d{2}-\d{2}$/.test(v)) setSearchParams({ date: v });
                    else setSearchParams({});
                  }}
                  aria-label="Pick a date"
                />
                <Button variant="outline" onClick={() => { setSearchParams({}); push('Showing today'); }}>Today</Button>
              </div>
            </div>

            <div className="bento">
              <Card className="bento__mid stat-card card--tint-mint">
                <Sparkline points={rows.map((r) => (r.status === 'PRESENT' ? 1 : 0))} tone="mint" />
                <span className="stat-xl">{present}</span>
                <span className="stat-label">Full days</span>
              </Card>
              <Card className="bento__mid stat-card card--tint-lavender">
                <Sparkline points={rows.map((r) => (r.status === 'HALF_DAY' ? 1 : 0))} tone="lavender" />
                <span className="stat-xl">{halfDay}</span>
                <span className="stat-label">Half days</span>
              </Card>
              <Card className="bento__mid stat-card card--tint-peach">
                <Sparkline points={rows.map((r) => (r.status === 'ABSENT' ? 1 : 0))} tone="peach" />
                <span className="stat-xl">{absent}</span>
                <span className="stat-label">Absent{onLeave > 0 ? ` · ${onLeave} on leave` : ''}</span>
              </Card>
              <Card className="bento__mid stat-card card--tint-sky">
                <Sparkline points={rows.map((r) => (r.checkIn && !r.checkOut ? 1 : 0))} tone="sky" />
                <span className="stat-xl">{stillIn}</span>
                <span className="stat-label">Still in</span>
              </Card>

              <Card className="bento__wide" heading={`Attendance · ${data.date}`}>
                {rows.length === 0 ? (
                  <p className="dash-sub">No employees yet.</p>
                ) : (
                  <div className="table-card">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Employee</th>
                          <th>Role</th>
                          <th>Checked in</th>
                          <th>Checked out</th>
                          <th>Hours</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r) => (
                          <tr key={r.user.id} className="animate-in">
                            <td>
                              <span className="sidebar__username">{r.user.name?.trim() || r.user.email}</span>{' '}
                              <span style={{ color: 'var(--color-muted)' }}>· {r.user.employeeId}</span>
                            </td>
                            <td>{r.user.role}</td>
                            <td className="table-mono">{fmtTime(r.checkIn)}</td>
                            <td className="table-mono">{fmtTime(r.checkOut)}</td>
                            <td className="table-mono">{r.checkOut ? `${r.workedHours.toFixed(1)}h` : '—'}</td>
                            <td>
                              {r.status === 'PRESENT' && <Badge tone="success">Present</Badge>}
                              {r.status === 'HALF_DAY' && <Badge tone="neutral">Half day</Badge>}
                              {r.status === 'LEAVE' && <Badge tone="neutral">On leave</Badge>}
                              {r.status === 'ABSENT' && (data.isWeekend
                                ? <Badge tone="neutral">Weekend</Badge>
                                : <Badge tone="error">Absent</Badge>)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          </>
        )}
      </div>
    </Sidebar>
  );
}
