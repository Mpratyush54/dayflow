import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Donut from '../../components/charts/Donut';
import AreaChart from '../../components/charts/AreaChart';
import { ToastStack } from '../../components/common/Toast';
import { useToasts } from '../../hooks/useToasts';
import { checkIn, checkOut, getMyAttendance } from '../../api/attendance';
import type { AttendanceWindow } from '../../types';

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function Skeletons() {
  return (
    <div className="bento">
      <div className="skeleton-card bento__hero">
        <div className="skeleton-line skeleton-line--title" />
        <div className="skeleton-line skeleton-line--wide" />
        <div className="skeleton-line" />
      </div>
      <div className="skeleton-card bento__mid"><div className="skeleton-line skeleton-line--title" /><div className="skeleton-line skeleton-line--wide" /></div>
      <div className="skeleton-card bento__wide"><div className="skeleton-line skeleton-line--title" /><div className="skeleton-line skeleton-line--wide" /></div>
    </div>
  );
}

function fmtTime(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(key: string) {
  return new Date(`${key}T00:00:00`).toLocaleDateString([], { day: 'numeric', month: 'short' });
}

export default function Attendance() {
  const { toasts, push } = useToasts();
  const [searchParams, setSearchParams] = useSearchParams();
  const dateParam = searchParams.get('date');
  const selectedDate = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : todayKey();
  const [data, setData] = useState<AttendanceWindow | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [now, setNow] = useState(() => new Date());

  const load = useCallback(async (forDate: string) => {
    setLoading(true);
    try {
      setData(await getMyAttendance(7, forDate));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(selectedDate);
  }, [load, selectedDate]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const today = data?.days[data.days.length - 1] ?? null;
  const checkedIn = !!today?.checkIn;
  const checkedOut = !!today?.checkOut;
  const liveHours =
    checkedIn && !checkedOut && today?.checkIn
      ? Math.max((now.getTime() - new Date(today.checkIn).getTime()) / 3600000, 0)
      : 0;

  async function handleAction() {
    setActing(true);
    try {
      const record = checkedIn ? await checkOut() : await checkIn();
      push(
        checkedIn
          ? `Checked out · ${record.workedHours}h today`
          : `Checked in at ${fmtTime(record.checkIn)}`,
      );
      await load(selectedDate);
    } catch (err) {
      push(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setActing(false);
    }
  }

  const chartPoints = data ? data.days.map((d) => (d.checkOut ? d.workedHours : d.checkIn ? Math.round(liveHours * 10) / 10 : 0)) : [];
  const chartLabels = data ? data.days.map((d) => d.weekday) : [];

  return (
    <Sidebar
      user={{ name: 'Employee', role: 'Employee', initials: '··' }}
      items={[
        { to: '/dashboard', label: 'Dashboard', icon: '◧' },
        { to: '/profile', label: 'Profile', icon: '👤' },
        { to: '/attendance', label: 'Attendance', icon: '🗓' },
        { to: '/leaves', label: 'Leave', icon: '🌴' },
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

        {loading ? (
          <Skeletons />
        ) : error ? (
          <Card heading="Attendance">
            <p className="form-error">{error}</p>
            <Button variant="outline" onClick={() => void load(selectedDate)}>Retry</Button>
          </Card>
        ) : data && (
          <>
            <div className="dash-head">
              <div>
                <p className="dash-sub">{now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })} · {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                <h1>My <span className="text-gradient">attendance</span></h1>
                {today && (
                  <p className="ticker" style={{ marginTop: 12 }}>
                    <span className="ticker__dot" aria-hidden />
                    {checkedOut
                      ? `Day complete · ${today.workedHours}h logged`
                      : checkedIn
                        ? `Working since ${fmtTime(today.checkIn)} · ${liveHours.toFixed(1)}h`
                        : 'Not checked in yet'}
                  </p>
                )}
              </div>
              <div className="hero-actions">
                <input
                  type="date"
                  className="input"
                  style={{ width: 'auto', height: 'var(--button-height)' }}
                  value={selectedDate}
                  max={todayKey()}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
                      setSearchParams({ date: v });
                    } else {
                      setSearchParams({});
                    }
                  }}
                  aria-label="Pick a date"
                />
                <Button variant="outline" onClick={() => setSearchParams({})}>Today</Button>
                <Badge tone={checkedOut ? 'success' : checkedIn ? 'success' : 'neutral'}>
                  {checkedOut ? 'Day complete' : checkedIn ? 'Checked in' : 'Not checked in'}
                </Badge>
                <Button
                  variant={checkedIn ? 'outline' : 'primary'}
                  onClick={() => void handleAction()}
                  disabled={acting || checkedOut}
                >
                  {acting ? '…' : checkedOut ? 'Checked out' : checkedIn ? 'Check out' : 'Check in'}
                </Button>
              </div>
            </div>

            <div className="bento">
              <Card className="bento__hero card--grad" heading="Hours this week">
                <div className="art" style={{ marginBottom: 16 }} aria-hidden />
                {chartPoints.length === 0 || chartPoints.every((p) => p === 0) ? (
                  <p className="dash-sub" style={{ minHeight: 200, display: 'grid', placeItems: 'center', margin: 0 }}>
                    No hours logged this week — check in to start tracking
                  </p>
                ) : (
                  <AreaChart id="attendance-hours" points={chartPoints} labels={chartLabels} suffix="h" height={200} />
                )}
                <p className="dash-sub">
                  {data.summary.hours}h logged · {data.summary.workdays} workdays
                </p>
              </Card>

              <Card className="bento__mid card--tint-mint">
                <Donut
                  value={data.summary.rate ?? 0}
                  label="Attendance"
                  sublabel={data.summary.rate === null ? 'no workdays yet' : `${data.summary.rate}% present`}
                />
              </Card>

              <Card className="bento__mid card--dark">
                <span className="stat-xl">{data.summary.present}</span>
                <p className="dash-sub" style={{ color: 'var(--color-on-dark-soft)' }}>Full days</p>
                <div className="summary-row" style={{ marginTop: 16 }}>
                  <span className="summary-row__label">Half days</span>
                  <span className="summary-row__value">{data.summary.halfDay}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-row__label">On leave</span>
                  <span className="summary-row__value">{data.summary.leave}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-row__label">Absent</span>
                  <span className="summary-row__value">{data.summary.absent}</span>
                </div>
              </Card>

              <Card className="bento__wide" heading="Last 7 days">
                <div className="table-card">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Day</th>
                        <th>Checked in</th>
                        <th>Checked out</th>
                        <th>Hours</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.days.map((d) => {
                        const isToday = d.date === today?.date;
                        const isWeekend = d.weekday === 'Sat' || d.weekday === 'Sun';
                        const hours = d.checkOut
                          ? `${d.workedHours.toFixed(1)}h`
                          : d.checkIn && isToday
                            ? `${liveHours.toFixed(1)}h`
                            : '—';
                        return (
                          <tr key={d.date} className="animate-in">
                            <td>{fmtDate(d.date)} <span style={{ color: 'var(--color-muted)' }}>· {d.weekday}</span></td>
                            <td className="table-mono">{fmtTime(d.checkIn)}</td>
                            <td className="table-mono">{fmtTime(d.checkOut)}</td>
                            <td className="table-mono">{hours}</td>
                            <td>
                              {d.status === 'PRESENT' && <Badge tone="success">Present</Badge>}
                              {d.status === 'HALF_DAY' && <Badge tone="neutral">Half day</Badge>}
                              {d.status === 'LEAVE' && <Badge tone="neutral">On leave</Badge>}
                              {!d.status && isWeekend && <Badge tone="neutral">Weekend</Badge>}
                              {!d.status && !isWeekend && <Badge tone="error">Absent</Badge>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </Sidebar>
  );
}
