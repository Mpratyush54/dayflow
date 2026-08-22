import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import { ToastStack } from '../../components/common/Toast';
import { useToasts } from '../../hooks/useToasts';
import { checkIn, checkOut, getMyAttendanceByMonth } from '../../api/attendance';
import type { AttendanceWindow } from '../../types';
import { extraHours, fmtHours, liveHoursFromCheckIn, totalLoggedHours, workHours } from '../../utils/overtime';
import { enqueue, flushQueue, getQueue } from '../../pwa';

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthShortLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString([], { month: 'short' });
}

function monthLongLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString([], { month: 'long', year: 'numeric' });
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

function fmtTime(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(key: string): string {
  return new Date(`${key}T00:00:00`).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function Attendance() {
  const { toasts, push } = useToasts();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawMonth = searchParams.get('month');
  const curMonth = currentMonthKey();
  const selectedMonth = rawMonth && MONTH_RE.test(rawMonth) && rawMonth <= curMonth ? rawMonth : curMonth;
  const [data, setData] = useState<AttendanceWindow | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [now, setNow] = useState(() => new Date());

  const load = useCallback(async (month: string) => {
    setLoading(true);
    try {
      setData(await getMyAttendanceByMonth(month));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(selectedMonth);
  }, [load, selectedMonth]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const todayStr = todayKey();
  const today = data?.days.find((d) => d.date === todayStr) ?? data?.days[data.days.length - 1] ?? null;
  const checkedIn = !!today?.checkIn;
  const checkedOut = !!today?.checkOut;
  const isCurrentMonth = selectedMonth === curMonth;
  const liveHours = checkedIn && !checkedOut && today?.checkIn && isCurrentMonth ? liveHoursFromCheckIn(today.checkIn, now) : 0;

  // Flush any queued offline actions when back online
  useEffect(() => {
    const onOnline = async () => {
      const q = getQueue();
      if (q.length === 0) return;
      try {
        const n = await flushQueue(checkIn, checkOut);
        if (n > 0) {
          push(`Synced ${n} queued check-${q[0]?.type === 'checkin' ? 'in' : 'out'}${n > 1 ? 's' : ''}`);
          await load(selectedDate);
        }
      } catch {
        // keep remaining queue for next online event
      }
    };
    window.addEventListener('online', onOnline);
    // Also attempt flush on mount if already online and queue exists
    if (navigator.onLine && getQueue().length > 0) void onOnline();
    return () => window.removeEventListener('online', onOnline);
  }, [load, selectedDate, push]);

  async function handleAction() {
    const actionType = checkedIn ? 'checkout' : 'checkin';
    // Offline: queue locally
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      enqueue({ type: actionType as 'checkin' | 'checkout', ts: Date.now() });
      push('Queued offline');
      return;
    }
    setActing(true);
    try {
      const record = checkedIn ? await checkOut() : await checkIn();
      push(
        checkedIn
          ? `Checked out · ${record.workedHours}h today`
          : `Checked in at ${fmtTime(record.checkIn)}`,
      );
      await load(selectedMonth);
    } catch (err) {
      // Network failure while online — also queue for retry
      const msg = err instanceof Error ? err.message : '';
      const isNetwork = /Failed to fetch|NetworkError|Load failed/i.test(msg);
      if (isNetwork && typeof navigator !== 'undefined' && !navigator.onLine) {
        enqueue({ type: actionType as 'checkin' | 'checkout', ts: Date.now() });
        push('Queued offline');
      } else {
        push(err instanceof Error ? err.message : 'Something went wrong');
      }
    } finally {
      setActing(false);
    }
  }

  const prevMonth = shiftMonth(selectedMonth, -1);
  const nextMonth = shiftMonth(selectedMonth, 1);
  const canNext = nextMonth <= curMonth;

  const monthOptions = useMemo(() => {
    const opts: string[] = [];
    for (let i = -11; i <= 0; i++) opts.push(shiftMonth(curMonth, i));
    if (!opts.includes(selectedMonth)) opts.push(selectedMonth);
    opts.sort();
    return opts;
  }, [curMonth, selectedMonth]);

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
            <Button variant="outline" onClick={() => void load(selectedMonth)}>Retry</Button>
          </Card>
        ) : data && (
          <>
            <div className="dash-head">
              <div>
                <p className="dash-sub">{now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })} · {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                <h1>My <span className="text-gradient">attendance</span></h1>
                <p className="dash-sub" style={{ marginTop: 8, color: 'var(--color-muted)' }}>
                  {monthLongLabel(selectedMonth)} · {data.range.from} → {data.range.to}
                </p>
                {today && isCurrentMonth && (
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
              <div className="hero-actions" style={{ flexWrap: 'wrap' }}>
                <div
                  className="month-nav"
                  role="navigation"
                  aria-label="Month navigator"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-xs)',
                    padding: 'var(--space-xxs)',
                    border: '1px solid var(--color-hairline)',
                    borderRadius: 'var(--radius-pill)',
                    background: 'var(--color-surface-card)',
                  }}
                >
                  <Button
                    variant="outline"
                    aria-label="Previous month"
                    onClick={() => setSearchParams({ month: prevMonth })}
                    style={{ border: 'none', minWidth: 72 }}
                  >
                    &lt; Prev
                  </Button>
                  <label htmlFor="month-select" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>Select month</label>
                  <select
                    id="month-select"
                    aria-label="Select month"
                    value={selectedMonth}
                    onChange={(e) => setSearchParams({ month: e.target.value })}
                    style={{
                      border: '1px solid var(--color-hairline)',
                      borderRadius: 'var(--radius-pill)',
                      padding: '6px 12px',
                      font: 'var(--type-button)',
                      background: 'var(--color-surface-card)',
                      color: 'var(--color-ink)',
                      minWidth: 110,
                      textAlign: 'center',
                    }}
                  >
                    {monthOptions.map((m) => (
                      <option key={m} value={m}>{monthShortLabel(m)} {m.slice(0, 4)}</option>
                    ))}
                  </select>
                  <span aria-hidden style={{ color: 'var(--color-muted)' }}>▼</span>
                  <Button
                    variant="outline"
                    aria-label="Next month"
                    disabled={!canNext}
                    onClick={() => { if (canNext) setSearchParams({ month: nextMonth }); }}
                    style={{ border: 'none', minWidth: 72, opacity: canNext ? 1 : 0.45 }}
                  >
                    Next &gt;
                  </Button>
                </div>
                <Badge tone={checkedOut ? 'success' : checkedIn ? 'success' : 'neutral'}>
                  {checkedOut ? 'Day complete' : checkedIn ? 'Checked in' : 'Not checked in'}
                </Badge>
                <Button
                  variant={checkedIn ? 'outline' : 'primary'}
                  onClick={() => void handleAction()}
                  disabled={acting || checkedOut}
                  className={acting ? 'btn--loading' : ''}
                >
                  {acting && <span className={`spinner${checkedIn ? ' spinner--dark' : ''}`} />}
                  {acting ? (checkedIn ? 'Checking out…' : 'Checking in…') : checkedOut ? 'Checked out' : checkedIn ? 'Check out' : 'Check in'}
                </Button>
              </div>
            </div>

            <div className="bento" style={{ marginBottom: 'var(--space-lg)' }}>
              <Card className="bento__mid stat-card card--tint-mint">
                <span className="stat-xl">{data.summary.present}</span>
                <span className="stat-label">Count present</span>
                <span className="dash-sub" style={{ fontSize: 12, color: 'var(--color-muted)' }}>{monthShortLabel(selectedMonth)} present days</span>
              </Card>
              <Card className="bento__mid stat-card card--tint-peach">
                <span className="stat-xl">{data.summary.leave}</span>
                <span className="stat-label">Leaves count</span>
                <span className="dash-sub" style={{ fontSize: 12, color: 'var(--color-muted)' }}>Approved leaves in month</span>
              </Card>
              <Card className="bento__mid stat-card card--tint-lavender">
                <span className="stat-xl">{data.summary.workdays}</span>
                <span className="stat-label">Total working days</span>
                <span className="dash-sub" style={{ fontSize: 12, color: 'var(--color-muted)' }}>{monthLongLabel(selectedMonth)}</span>
              </Card>
              <Card className="bento__mid stat-card card--tint-sky">
                <span className="stat-xl" style={{ fontSize: 18, lineHeight: 1.2 }}>{monthLongLabel(selectedMonth)}</span>
                <span className="stat-label">Selected date</span>
                <span className="dash-sub" style={{ fontSize: 12, color: 'var(--color-muted)' }}>{data.range.from} → {data.range.to}</span>
              </Card>
            </div>

            <div className="bento">
              <Card className="bento__wide" heading={`Attendance · ${monthLongLabel(selectedMonth)} (${data.days.length} days)`}>
                <p className="dash-sub" style={{ marginBottom: 12 }}>
                  {data.summary.hours}h logged · {data.summary.workdays} workdays · {data.summary.present} present · {data.summary.leave} leaves
                </p>
                <div className="table-card">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Check In</th>
                        <th>Check Out</th>
                        <th>Work Hours</th>
                        <th>Extra hours</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.days.map((d) => {
                        const isToday = d.date === todayStr && isCurrentMonth;
                        const isWeekend = d.weekday === 'Sat' || d.weekday === 'Sun';
                        const total = totalLoggedHours(
                          d.workedHours,
                          d.checkIn,
                          d.checkOut,
                          isToday,
                          liveHours,
                        );
                        const work = total !== null ? workHours(total) : null;
                        const extra = total !== null ? extraHours(total) : null;
                        return (
                          <tr key={d.date} className="animate-in">
                            <td>{fmtDate(d.date)} <span style={{ color: 'var(--color-muted)' }}>· {d.weekday}</span>{isWeekend && <Badge tone="neutral" style={{ marginLeft: 8 }}>Weekend</Badge>}{d.status === 'LEAVE' && <Badge tone="neutral" style={{ marginLeft: 8 }}>Leave</Badge>}{d.status === 'PRESENT' && <Badge tone="success" style={{ marginLeft: 8 }}>Present</Badge>}{d.status === 'HALF_DAY' && <Badge tone="neutral" style={{ marginLeft: 8 }}>Half day</Badge>}</td>
                            <td className="table-mono">{fmtTime(d.checkIn)}</td>
                            <td className="table-mono">{fmtTime(d.checkOut)}</td>
                            <td className="table-mono">{work !== null ? fmtHours(work) : '—'}</td>
                            <td className="table-mono">{extra !== null ? fmtHours(extra) : '—'}</td>
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
