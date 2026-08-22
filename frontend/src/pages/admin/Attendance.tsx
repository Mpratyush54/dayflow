import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Sparkline from '../../components/charts/Sparkline';
import Pagination from '../../components/common/Pagination';
import { ToastStack } from '../../components/common/Toast';
import { useToasts } from '../../hooks/useToasts';
import { useDebouncedSearchParam, setPageParam } from '../../hooks/useDebouncedSearchParam';
import { getAttendanceStreamUrl, getTeamAttendance } from '../../api/attendance';
import type { TeamAttendance } from '../../types';
import { extraHours, fmtHours, liveHoursFromCheckIn, totalLoggedHours, workHours } from '../../utils/overtime';

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
function resolveDateForMonth(month: string): string {
  const today = todayKey();
  if (month === today.slice(0, 7)) return today;
  const [y, m] = month.split('-').map(Number);
  const last = new Date(y, m, 0);
  return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`;
}

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

function fmtTime(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function AttendanceOverview() {
  const { toasts, push } = useToasts();
  const [searchParams, setSearchParams] = useSearchParams();
  const curMonth = currentMonthKey();
  const rawMonth = searchParams.get('month');
  const rawDate = searchParams.get('date');
  let selectedMonth: string;
  if (rawMonth && MONTH_RE.test(rawMonth) && rawMonth <= curMonth) selectedMonth = rawMonth;
  else if (rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)) selectedMonth = rawDate.slice(0, 7) <= curMonth ? rawDate.slice(0, 7) : curMonth;
  else selectedMonth = curMonth;

  const date = resolveDateForMonth(selectedMonth);
  const [data, setData] = useState<TeamAttendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [now, setNow] = useState(() => new Date());
  const [liveStillIn, setLiveStillIn] = useState<number | null>(null);
  const page = Math.max(Number(searchParams.get('page') || 1), 1);
  const { input: searchInput, setInput: setSearchInput, debounced: searchQ } = useDebouncedSearchParam('q');
  const PAGE_SIZE = 10;

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

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // SSE live stillIn with fallback to polling
  useEffect(() => {
    let es: EventSource | null = null;
    let pollId: ReturnType<typeof setInterval> | null = null;
    let closed = false;

    const startPolling = () => {
      if (pollId) return;
      pollId = setInterval(() => { void load(date); }, 5000);
    };

    const cleanupPolling = () => {
      if (pollId) { clearInterval(pollId); pollId = null; }
    };

    // Only subscribe for today's view (historical dates don't need live)
    if (date !== todayKey()) {
      setLiveStillIn(null);
      return () => { cleanupPolling(); };
    }

    try {
      if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
        startPolling();
        return () => cleanupPolling();
      }
      const url = getAttendanceStreamUrl();
      es = new EventSource(url);
      es.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data) as { stillIn?: number };
          if (typeof msg.stillIn === 'number') setLiveStillIn(msg.stillIn);
        } catch { /* ignore malformed */ }
      };
      es.onerror = () => {
        if (closed) return;
        // SSE unavailable — close and fallback to polling
        try { es?.close(); } catch {}
        es = null;
        setLiveStillIn(null);
        startPolling();
      };
    } catch {
      startPolling();
    }

    return () => {
      closed = true;
      if (es) try { es.close(); } catch {}
      cleanupPolling();
    };
  }, [date, load]);

  const rows = data?.rows ?? [];
  const filteredRows = useMemo(() => {
    const needle = searchQ.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) => {
      const name = (r.user.name ?? '').toLowerCase();
      const email = (r.user.email ?? '').toLowerCase();
      const empId = (r.user.employeeId ?? '').toLowerCase();
      return name.includes(needle) || email.includes(needle) || empId.includes(needle);
    });
  }, [rows, searchQ]);

  const present = filteredRows.filter((r) => r.status === 'PRESENT').length;
  const onLeave = filteredRows.filter((r) => r.status === 'LEAVE').length;
  const stillInBase = filteredRows.filter((r) => r.checkIn && !r.checkOut).length;
  const stillIn = liveStillIn ?? stillInBase;
  const totalWorkingDays = rows.length > 0 ? rows.length - (data?.isWeekend ? rows.length : 0) : 0;
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedRows = filteredRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const isToday = date === todayKey();

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

  function updateSearchParams(next: Record<string, string | undefined>) {
    const sp = new URLSearchParams(searchParams);
    Object.entries(next).forEach(([k, v]) => {
      if (v === undefined || v === '') sp.delete(k);
      else sp.set(k, v);
    });
    setSearchParams(sp);
  }

  return (
    <Sidebar
      user={{ name: 'HR', role: 'HR · Admin', initials: '··' }}
      items={[
        { to: '/admin', label: 'Overview', icon: '◧', end: true },
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
        { label: 'Reports & analytics', hint: 'page', to: '/admin/reports' },
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
                <p className="dash-sub">{monthLongLabel(selectedMonth)} · {new Date(`${data.date}T00:00:00`).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
                <h1>Team <span className="text-gradient">attendance</span></h1>
                <p className="dash-sub" style={{ marginTop: 6, color: 'var(--color-muted)' }}>
                  {present} present · {onLeave} leaves · {filteredRows.length} total · {totalWorkingDays} working · {data.date}
                </p>
                {data.isWeekend && (
                  <p className="ticker" style={{ marginTop: 12 }}>
                    <span className="ticker__dot" aria-hidden />
                    Weekend — no attendance expected
                  </p>
                )}
              </div>
              <div className="hero-actions" style={{ flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
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
                    onClick={() => updateSearchParams({ month: prevMonth, page: undefined })}
                    style={{ border: 'none', minWidth: 72 }}
                  >
                    &lt; Prev
                  </Button>
                  <label htmlFor="admin-month-select" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>Select month</label>
                  <select
                    id="admin-month-select"
                    aria-label="Select month"
                    value={selectedMonth}
                    onChange={(e) => updateSearchParams({ month: e.target.value, page: undefined })}
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
                    onClick={() => { if (canNext) updateSearchParams({ month: nextMonth, page: undefined }); }}
                    style={{ border: 'none', minWidth: 72, opacity: canNext ? 1 : 0.45 }}
                  >
                    Next &gt;
                  </Button>
                </div>
                <Button variant="outline" onClick={() => { setSearchParams({}); push('Showing current month'); }}>Today</Button>
              </div>
            </div>

            <div style={{ marginBottom: 'var(--space-md)', display: 'flex', gap: 'var(--space-sm)', alignItems: 'center', flexWrap: 'wrap' }}>
              <Input
                label="Search employees"
                type="search"
                placeholder="Search employees..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="list-search-input"
              />
              {searchQ && (
                <Button variant="outline" onClick={() => setSearchInput('')}>Clear</Button>
              )}
              <span className="dash-sub" style={{ color: 'var(--color-muted)' }}>{filteredRows.length} employees</span>
            </div>

            <div className="bento">
              <Card className="bento__mid stat-card card--tint-mint">
                <Sparkline points={filteredRows.map((r) => (r.status === 'PRESENT' ? 1 : 0))} tone="mint" />
                <span className="stat-xl">{present}</span>
                <span className="stat-label">Count present</span>
              </Card>
              <Card className="bento__mid stat-card card--tint-peach">
                <Sparkline points={filteredRows.map((r) => (r.status === 'LEAVE' ? 1 : 0))} tone="peach" />
                <span className="stat-xl">{onLeave}</span>
                <span className="stat-label">Leaves count</span>
              </Card>
              <Card className="bento__mid stat-card card--tint-lavender">
                <Sparkline points={filteredRows.map((r) => (r.status === 'ABSENT' ? 1 : 0))} tone="lavender" />
                <span className="stat-xl">{rows.length}</span>
                <span className="stat-label">Total working days</span>
              </Card>
              <Card className="bento__mid stat-card card--tint-sky">
                <Sparkline points={filteredRows.map((r) => (r.checkIn && !r.checkOut ? 1 : 0))} tone="sky" />
                <span className="stat-xl">{stillIn}</span>
                <span className="stat-label">Selected date · {data.date}</span>
              </Card>

              <Card className="bento__wide" heading={`Attendance · ${data.date} (${filteredRows.length}${searchQ ? ' filtered' : ''})`}>
                {filteredRows.length === 0 ? (
                  <p className="dash-sub">{searchQ ? `No employees matching "${searchQ}".` : 'No employees yet.'}</p>
                ) : (
                  <>
                    <div className="table-card">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Employee</th>
                            <th>Date</th>
                            <th>Check In</th>
                            <th>Check Out</th>
                            <th>Work Hours</th>
                            <th>Extra hours</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedRows.map((r) => {
                          const live = r.checkIn ? liveHoursFromCheckIn(r.checkIn, now) : 0;
                          const total = totalLoggedHours(r.workedHours, r.checkIn, r.checkOut, isToday, live);
                          return (
                          <tr key={r.user.id} className="animate-in">
                            <td>
                              <span className="sidebar__username">{r.user.name?.trim() || r.user.email}</span>{' '}
                              <span style={{ color: 'var(--color-muted)' }}>· {r.user.employeeId}</span>
                            </td>
                            <td className="table-mono">{data.date}</td>
                            <td className="table-mono">{fmtTime(r.checkIn)}</td>
                            <td className="table-mono">{fmtTime(r.checkOut)}</td>
                            <td className="table-mono">{total !== null ? fmtHours(workHours(total)) : '—'}</td>
                            <td className="table-mono">{total !== null ? fmtHours(extraHours(total)) : '—'}</td>
                            <td>
                              {r.status === 'PRESENT' && <Badge tone="success">Present</Badge>}
                              {r.status === 'HALF_DAY' && <Badge tone="neutral">Half day</Badge>}
                              {r.status === 'LEAVE' && <Badge tone="neutral">On leave</Badge>}
                              {r.status === 'ABSENT' && (data.isWeekend
                                ? <Badge tone="neutral">Weekend</Badge>
                                : <Badge tone="error">Absent</Badge>)}
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                    {filteredRows.length > PAGE_SIZE && (
                      <Pagination
                        page={safePage}
                        pages={totalPages}
                        total={filteredRows.length}
                        onPageChange={(p) => setPageParam(searchParams, setSearchParams, p)}
                      />
                    )}
                  </>
                )}
              </Card>
            </div>
          </>
        )}
      </div>
    </Sidebar>
  );
}
