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
    const q = searchQ.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const u = r.user;
      const hay = `${u.name ?? ''} ${u.email ?? ''} ${u.employeeId ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rows, searchQ]);
  const present = rows.filter((r) => r.status === 'PRESENT').length;
  const halfDay = rows.filter((r) => r.status === 'HALF_DAY').length;
  const absent = rows.filter((r) => r.status === 'ABSENT').length;
  const onLeave = rows.filter((r) => r.status === 'LEAVE').length;
  const stillInBase = rows.filter((r) => r.checkIn && !r.checkOut).length;
  const stillIn = liveStillIn ?? stillInBase;
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedRows = filteredRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const isToday = date === todayKey();

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
                <Input
                  label="Search"
                  type="search"
                  placeholder="Name, email or ID"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="list-search-input"
                />
                <input
                  type="date"
                  className="input"
                  style={{ width: 'auto', height: 'var(--button-height)' }}
                  value={date}
                  max={todayKey()}
                  onChange={(e) => {
                    const v = e.target.value;
                    const next = new URLSearchParams(searchParams);
                    if (v && /^\d{4}-\d{2}-\d{2}$/.test(v)) next.set('date', v);
                    else next.delete('date');
                    next.delete('page');
                    setSearchParams(next, { replace: true });
                  }}
                  aria-label="Pick a date"
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    const next = new URLSearchParams(searchParams);
                    next.delete('date');
                    next.delete('page');
                    setSearchParams(next, { replace: true });
                    push('Showing today');
                  }}
                >
                  Today
                </Button>
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

              <Card className="bento__wide" heading={`Attendance · ${data.date} (${rows.length})`}>
                {rows.length === 0 ? (
                  <p className="dash-sub">No employees yet.</p>
                ) : (
                  <>
                    <div className="table-card">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Employee</th>
                            <th>Role</th>
                            <th>Checked in</th>
                            <th>Checked out</th>
                            <th>Hours</th>
                            <th>Work hours</th>
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
                            <td>{r.user.role}</td>
                            <td className="table-mono">{fmtTime(r.checkIn)}</td>
                            <td className="table-mono">{fmtTime(r.checkOut)}</td>
                            <td className="table-mono">{fmtHours(total)}</td>
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
