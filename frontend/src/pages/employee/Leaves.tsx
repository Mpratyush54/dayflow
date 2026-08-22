import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Dialog from '../../components/common/Dialog';
import { ToastStack } from '../../components/common/Toast';
import { useToasts } from '../../hooks/useToasts';
import { useDelayedReady } from '../../hooks/useDelayedReady';
import { applyLeave, getMyLeaves } from '../../api/leaves';
import type { ApplyLeaveInput } from '../../api/leaves';
import type { LeaveRequest, LeaveStatus, LeaveType } from '../../types';
import './Leaves.css';

const BALANCE_TOTALS: { type: LeaveType; total: number; tone: string }[] = [
  { type: 'PAID', total: 18, tone: 'mint' },
  { type: 'SICK', total: 10, tone: 'peach' },
  { type: 'UNPAID', total: 5, tone: 'lavender' },
];

const STATUS_TONE: Record<LeaveStatus, 'success' | 'error' | 'neutral'> = {
  APPROVED: 'success',
  REJECTED: 'error',
  PENDING: 'neutral',
};

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

type TabKey = 'timeoff' | 'allocation';
type ViewKey = 'calendar' | 'list';
type CalendarDayStatus = 'approved' | 'pending';

const EMPTY_FORM: ApplyLeaveInput = { type: 'PAID', startDate: '', endDate: '', remarks: '' };

function daysInclusive(start: string, end: string) {
  return Math.round((+new Date(`${end}T00:00:00`) - +new Date(`${start}T00:00:00`)) / 86_400_000) + 1;
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  });
}

function dateKey(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function todayISO() {
  const d = new Date();
  return dateKey(d.getFullYear(), d.getMonth(), d.getDate());
}

function parseYear(raw: string | null) {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 2000 || n > 2100) return null;
  return n;
}

function eachDayInRange(start: string, end: string) {
  const days: string[] = [];
  const cur = new Date(`${start}T00:00:00`);
  const endD = new Date(`${end}T00:00:00`);
  while (cur <= endD) {
    days.push(dateKey(cur.getFullYear(), cur.getMonth(), cur.getDate()));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

function buildLeaveDayMap(leaves: LeaveRequest[]) {
  const map = new Map<string, CalendarDayStatus>();
  for (const leave of leaves) {
    if (leave.status === 'REJECTED') continue;
    const tone: CalendarDayStatus = leave.status === 'APPROVED' ? 'approved' : 'pending';
    for (const day of eachDayInRange(leave.startDate, leave.endDate)) {
      const existing = map.get(day);
      if (!existing || (tone === 'approved' && existing === 'pending')) {
        map.set(day, tone);
      }
    }
  }
  return map;
}

function monthCells(year: number, month: number) {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startPad = (first.getDay() + 6) % 7;
  const cells: Array<{ day: number | null }> = [];
  for (let i = 0; i < startPad; i++) cells.push({ day: null });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d });
  while (cells.length % 7 !== 0) cells.push({ day: null });
  return cells;
}

export default function Leaves() {
  const ready = useDelayedReady();
  const { toasts, push } = useToasts();
  const [searchParams, setSearchParams] = useSearchParams();

  const tab: TabKey = searchParams.get('tab') === 'allocation' ? 'allocation' : 'timeoff';
  const view: ViewKey = searchParams.get('view') === 'list' ? 'list' : 'calendar';
  const year = parseYear(searchParams.get('year')) ?? new Date().getFullYear();

  const [leaves, setLeaves] = useState<LeaveRequest[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<ApplyLeaveInput>(EMPTY_FORM);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const updateParams = useCallback((updates: Record<string, string | null>) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [key, value] of Object.entries(updates)) {
        if (value === null) next.delete(key);
        else next.set(key, value);
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  useEffect(() => {
    let cancelled = false;
    getMyLeaves()
      .then((data) => { if (!cancelled) setLeaves(data); })
      .catch((err) => { if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Failed to load'); });
    return () => { cancelled = true; };
  }, []);

  const pending = leaves?.filter((l) => l.status === 'PENDING').length ?? 0;
  const leaveDayMap = useMemo(() => buildLeaveDayMap(leaves ?? []), [leaves]);
  const today = todayISO();

  const usedByType = BALANCE_TOTALS.map(({ type }) => ({
    type,
    used: (leaves ?? [])
      .filter((l) => l.type === type && l.status !== 'REJECTED')
      .reduce((sum, l) => sum + daysInclusive(l.startDate, l.endDate), 0),
  }));

  const requestedDays = form.startDate && form.endDate
    ? daysInclusive(form.startDate, form.endDate)
    : 0;

  const remainingForType = (() => {
    const entitlement = BALANCE_TOTALS.find((b) => b.type === form.type)?.total ?? 0;
    const used = usedByType.find((u) => u.type === form.type)?.used ?? 0;
    return Math.max(entitlement - used, 0);
  })();

  function openModal(prefill?: { startDate: string; endDate?: string }) {
    setFormError('');
    setAttachment(null);
    setForm({
      ...EMPTY_FORM,
      startDate: prefill?.startDate ?? '',
      endDate: prefill?.endDate ?? prefill?.startDate ?? '',
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setFormError('');
    setAttachment(null);
    setForm(EMPTY_FORM);
  }

  function set<K extends keyof ApplyLeaveInput>(key: K) {
    return (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    if (!form.startDate || !form.endDate) {
      setFormError('Pick a start and end date');
      return;
    }
    if (form.startDate < today) {
      setFormError('Start date cannot be in the past');
      return;
    }
    if (form.endDate < form.startDate) {
      setFormError('End date cannot be before the start date');
      return;
    }
    const days = daysInclusive(form.startDate, form.endDate);
    const entitlement = BALANCE_TOTALS.find((b) => b.type === form.type)?.total;
    if (entitlement !== undefined) {
      const usedForType = usedByType.find((u) => u.type === form.type)?.used ?? 0;
      if (usedForType + days > entitlement) {
        setFormError(`Insufficient ${form.type} balance: ${entitlement - usedForType} day(s) left, ${days} requested`);
        return;
      }
    }
    if (attachment) {
      if (attachment.size > 5 * 1024 * 1024) {
        setFormError('Attachment must be ≤5MB (PDF/JPG/PNG)');
        return;
      }
      const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!allowed.includes(attachment.type)) {
        setFormError('Attachment must be PDF, JPG or PNG');
        return;
      }
    }
    setSubmitting(true);
    try {
      const created = await applyLeave({ ...form, attachment });
      push(`${created.type} leave requested for ${formatDate(created.startDate)}`);
      closeModal();
      setLeaves((prev) => [created, ...(prev ?? [])]);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  }

  function renderMonth(monthIndex: number) {
    const cells = monthCells(year, monthIndex);
    return (
      <div key={monthIndex} className="leave-cal-month animate-in" style={{ animationDelay: `${monthIndex * 0.02}s` }}>
        <p className="leave-cal-month__title">{MONTH_NAMES[monthIndex]}</p>
        <div className="leave-cal-weekdays" aria-hidden>
          {WEEKDAYS.map((d) => <span key={d}>{d}</span>)}
        </div>
        <div className="leave-cal-days">
          {cells.map((cell, idx) => {
            if (cell.day === null) {
              return <span key={`pad-${idx}`} className="leave-cal-day leave-cal-day--pad" aria-hidden />;
            }
            const iso = dateKey(year, monthIndex, cell.day);
            const status = leaveDayMap.get(iso);
            const isPast = iso < today;
            const isToday = iso === today;
            const clickable = !isPast;
            const classes = [
              'leave-cal-day',
              status === 'approved' ? 'leave-cal-day--approved' : '',
              status === 'pending' ? 'leave-cal-day--pending' : '',
              isPast && !status ? 'leave-cal-day--past' : '',
              isToday ? 'leave-cal-day--today' : '',
              clickable ? 'leave-cal-day--clickable' : '',
            ].filter(Boolean).join(' ');

            if (!clickable) {
              return (
                <span
                  key={iso}
                  className={classes}
                  title={status ? `${iso} · ${status}` : iso}
                  aria-label={`${iso}${status ? `, ${status}` : ''}`}
                >
                  {cell.day}
                </span>
              );
            }

            return (
              <button
                key={iso}
                type="button"
                className={classes}
                title={status ? `${iso} · ${status}` : `Apply leave starting ${iso}`}
                aria-label={`${iso}${status ? `, ${status}` : ''}. Click to apply leave.`}
                onClick={() => openModal({ startDate: iso, endDate: iso })}
              >
                {cell.day}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <Sidebar
      user={{ name: 'Pratyush M.', role: 'Employee · EMP-0042', initials: 'PM' }}
      items={[
        { to: '/dashboard', label: 'Dashboard', icon: '◧' },
        { to: '/profile', label: 'Profile', icon: '👤' },
        { to: '/attendance', label: 'Attendance', icon: '🗓' },
        { to: '/leaves', label: 'Leave', icon: '🌴', ...(pending > 0 ? { badge: String(pending) } : {}) },
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

        {!ready ? (
          <>
            <div className="dash-head">
              <div>
                <div className="skeleton-line" style={{ width: '120px', height: '14px' }} />
                <div className="skeleton-line skeleton-line--title" style={{ marginTop: 10, width: '200px', height: '36px' }} />
              </div>
            </div>
            <div className="bento">
              <div className="skeleton-card bento__wide">
                <div className="skeleton-line skeleton-line--title" style={{ width: '40%' }} />
                <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="skeleton-line" style={{ height: 120, borderRadius: 'var(--radius-lg)' }} />
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : loadError ? (
          <p className="dash-sub">{loadError}</p>
        ) : (
          <>
            <div className="dash-head">
              <div>
                <p className="dash-sub">Requests, balances and outcomes</p>
                <h1>Time <span className="text-gradient">off</span></h1>
              </div>
              <div className="hero-actions">
                {pending > 0 && <Badge tone="neutral">{pending} pending</Badge>}
                <Button onClick={() => openModal()}>New request</Button>
              </div>
            </div>

            <div className="leaves-toolbar animate-in">
              <div className="leaves-tabs" role="tablist" aria-label="Time off sections">
                <Button
                  variant={tab === 'timeoff' ? 'primary' : 'outline'}
                  role="tab"
                  aria-selected={tab === 'timeoff'}
                  onClick={() => updateParams({ tab: 'timeoff' })}
                >
                  Time Off
                </Button>
                <Button
                  variant={tab === 'allocation' ? 'primary' : 'outline'}
                  role="tab"
                  aria-selected={tab === 'allocation'}
                  onClick={() => updateParams({ tab: 'allocation' })}
                >
                  Allocation
                </Button>
              </div>

              {tab === 'timeoff' && (
                <div className="leaves-view-toggle" role="group" aria-label="Time off view">
                  <Button
                    variant={view === 'calendar' ? 'primary' : 'outline'}
                    onClick={() => updateParams({ view: 'calendar' })}
                  >
                    Calendar
                  </Button>
                  <Button
                    variant={view === 'list' ? 'primary' : 'outline'}
                    onClick={() => updateParams({ view: 'list' })}
                  >
                    List
                  </Button>
                </div>
              )}
            </div>

            {tab === 'allocation' ? (
              <div className="allocation-grid">
                {BALANCE_TOTALS.map(({ type, total, tone }, i) => {
                  const used = usedByType.find((u) => u.type === type)?.used ?? 0;
                  const left = Math.max(total - used, 0);
                  return (
                    <Card
                      key={type}
                      className={`animate-in card--tint-${tone === 'mint' ? 'mint' : tone === 'peach' ? 'peach' : 'lavender'}`}
                      style={{ animationDelay: `${i * 0.07}s` }}
                      heading={`${type.charAt(0) + type.slice(1).toLowerCase()} allocation`}
                    >
                      <span className="stat-xl">{left}</span>
                      <p className="dash-sub">of {total} days remaining</p>
                      <div className="balance-row" style={{ marginTop: 16 }}>
                        <div className="balance-top">
                          <span>Used</span>
                          <span>{used} days</span>
                        </div>
                        <div className="balance-track">
                          <div
                            className={`balance-fill balance-fill--${tone}`}
                            style={{ width: `${(left / total) * 100}%` }}
                          />
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : view === 'calendar' ? (
              <Card className="bento__wide animate-in" heading={`${year} calendar`}>
                <div className="leaves-year-nav" style={{ marginBottom: 'var(--space-base)' }}>
                  <Button
                    variant="outline"
                    aria-label="Previous year"
                    onClick={() => updateParams({ year: String(year - 1) })}
                  >
                    ←
                  </Button>
                  <span className="leaves-year-nav__label">{year}</span>
                  <Button
                    variant="outline"
                    aria-label="Next year"
                    onClick={() => updateParams({ year: String(year + 1) })}
                  >
                    →
                  </Button>
                </div>

                <div className="leave-legend" aria-label="Leave status legend">
                  <span className="leave-legend__item">
                    <span className="leave-legend__swatch leave-legend__swatch--approved" aria-hidden />
                    Approved
                  </span>
                  <span className="leave-legend__item">
                    <span className="leave-legend__swatch leave-legend__swatch--pending" aria-hidden />
                    Pending
                  </span>
                  <span className="leave-legend__item">
                    <span className="leave-legend__swatch leave-legend__swatch--pending" aria-hidden />
                    Submitted
                  </span>
                </div>

                <div className="leave-cal-grid">
                  {MONTH_NAMES.map((_, i) => renderMonth(i))}
                </div>
              </Card>
            ) : (
              <Card className="bento__wide table-card animate-in" heading="My requests">
                {leaves && leaves.length > 0 ? (
                  <table className="table">
                    <thead>
                      <tr><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Status</th><th>Certificate</th><th>Review</th></tr>
                    </thead>
                    <tbody>
                      {leaves.map((l) => (
                        <tr key={l.id} className="animate-in">
                          <td className="table-mono">{l.type}</td>
                          <td>{formatDate(l.startDate)}</td>
                          <td>{formatDate(l.endDate)}</td>
                          <td>{daysInclusive(l.startDate, l.endDate)}</td>
                          <td><Badge tone={STATUS_TONE[l.status]}>{l.status.toLowerCase()}</Badge></td>
                          <td>{l.attachmentUrl ? <a href={l.attachmentUrl} target="_blank" rel="noreferrer">View</a> : '—'}</td>
                          <td className="dash-sub" title={l.reviewerComment ?? ''}>
                            {l.reviewerComment || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="dash-sub">No requests yet — tap <strong>New request</strong> or a day on the calendar.</p>
                )}
              </Card>
            )}

            <Dialog open={modalOpen} onClose={closeModal} title="Apply for leave">
              <form onSubmit={(e) => void handleSubmit(e)}>
                <div className="field">
                  <label className="field__label" htmlFor="leave-type">Type</label>
                  <select id="leave-type" className="input" value={form.type} onChange={set('type')}>
                    <option value="PAID">Paid leave</option>
                    <option value="SICK">Sick leave</option>
                    <option value="UNPAID">Unpaid leave</option>
                  </select>
                </div>
                <Input label="From" type="date" value={form.startDate} onChange={set('startDate')} min={today} />
                <Input label="To" type="date" value={form.endDate} onChange={set('endDate')} min={form.startDate || today} />
                {form.startDate && form.endDate && form.endDate >= form.startDate && (
                  <div className="leave-form-meta">
                    <span>
                      Allocation days: <strong>{requestedDays}</strong>
                    </span>
                    <span>
                      {form.type} balance after: <strong>{Math.max(remainingForType - requestedDays, 0)}</strong> of{' '}
                      {BALANCE_TOTALS.find((b) => b.type === form.type)?.total ?? 0} left
                    </span>
                  </div>
                )}
                <div className="field">
                  <label className="field__label" htmlFor="leave-remarks">Remarks</label>
                  <textarea
                    id="leave-remarks"
                    className="input"
                    rows={3}
                    maxLength={500}
                    placeholder="Anything your approver should know"
                    value={form.remarks}
                    onChange={set('remarks')}
                  />
                </div>
                <div className="field">
                  <label className="field__label" htmlFor="leave-attachment">
                    Certificate {form.type === 'SICK' ? '(recommended for sick leave)' : '(optional)'} — PDF/JPG/PNG ≤5MB
                  </label>
                  <input
                    id="leave-attachment"
                    type="file"
                    accept=".pdf,image/jpeg,image/png,image/jpg"
                    className="input"
                    onChange={(e) => setAttachment(e.target.files?.[0] ?? null)}
                  />
                  {attachment && (
                    <span className="dash-sub" style={{ display: 'block', marginTop: 6 }}>
                      {attachment.name} · {(attachment.size / 1024).toFixed(0)} KB
                    </span>
                  )}
                </div>
                {formError && <p className="form-error">{formError}</p>}
                <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end', marginTop: 'var(--space-base)' }}>
                  <Button type="button" variant="outline" onClick={closeModal} disabled={submitting}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting} className={submitting ? 'btn--loading' : ''}>
                    {submitting && <span className="spinner" />}
                    {submitting ? 'Submitting…' : 'Submit request'}
                  </Button>
                </div>
              </form>
            </Dialog>
          </>
        )}
      </div>
    </Sidebar>
  );
}
