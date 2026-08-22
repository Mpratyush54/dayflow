import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { ToastStack } from '../../components/common/Toast';
import { useToasts } from '../../hooks/useToasts';
import { useDelayedReady } from '../../hooks/useDelayedReady';
import { applyLeave, getMyLeaves } from '../../api/leaves';
import type { ApplyLeaveInput } from '../../api/leaves';
import type { LeaveRequest, LeaveStatus, LeaveType } from '../../types';
import './Leaves.css';

// Entitlement totals are mocked per issue #9 — real policy wiring lands with #11
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

function daysInclusive(start: string, end: string) {
  return Math.round((+new Date(`${end}T00:00:00`) - +new Date(`${start}T00:00:00`)) / 86_400_000) + 1;
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  });
}

const EMPTY_FORM: ApplyLeaveInput = { type: 'PAID', startDate: '', endDate: '', remarks: '' };

export default function Leaves() {
  const ready = useDelayedReady();
  const { toasts, push } = useToasts();
  const [leaves, setLeaves] = useState<LeaveRequest[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState<ApplyLeaveInput>(EMPTY_FORM);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMyLeaves()
      .then((data) => { if (!cancelled) setLeaves(data); })
      .catch((err) => { if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Failed to load'); });
    return () => { cancelled = true; };
  }, []);

  const pending = leaves?.filter((l) => l.status === 'PENDING').length ?? 0;

  const usedByType = BALANCE_TOTALS.map(({ type }) => ({
    type,
    used: (leaves ?? [])
      .filter((l) => l.type === type && l.status !== 'REJECTED')
      .reduce((sum, l) => sum + daysInclusive(l.startDate, l.endDate), 0),
  }));

  // Live forecast — mirrors backend entitlement (server minus PENDING+APPROVED)
  const entitlementForType = BALANCE_TOTALS.find((b) => b.type === form.type)?.total ?? 0;
  const usedForType = usedByType.find((u) => u.type === form.type)?.used ?? 0;
  const left = Math.max(entitlementForType - usedForType, 0);
  const hasValidRange = Boolean(form.startDate && form.endDate && form.endDate >= form.startDate);
  const requestedDays = hasValidRange ? daysInclusive(form.startDate, form.endDate) : 0;
  const forecastLeft = hasValidRange ? left - requestedDays : left;
  const forecastYear = (() => {
    if (form.startDate) {
      const y = Number(form.startDate.slice(0, 4));
      if (Number.isInteger(y) && y >= 2000 && y <= 2100) return y;
    }
    return new Date().getFullYear();
  })();
  const carryForwardHint =
    form.type === 'PAID'
      ? 'Carry-forward: up to 5 days'
      : 'Carry-forward: not applicable for this leave type';

  function set<K extends keyof ApplyLeaveInput>(key: K) {
    return (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
  }

  const todayISO = new Date().toISOString().slice(0, 10);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    if (!form.startDate || !form.endDate) {
      setFormError('Pick a start and end date');
      return;
    }
    if (form.startDate < todayISO) {
      setFormError('Start date cannot be in the past');
      return;
    }
    if (form.endDate < form.startDate) {
      setFormError('End date cannot be before the start date');
      return;
    }
    const requestedDays = daysInclusive(form.startDate, form.endDate);
    const entitlement = BALANCE_TOTALS.find((b) => b.type === form.type)?.total;
    if (entitlement !== undefined) {
      const usedForType = usedByType.find((u) => u.type === form.type)?.used ?? 0;
      if (usedForType + requestedDays > entitlement) {
        setFormError(`Insufficient ${form.type} balance: ${entitlement - usedForType} day(s) left, ${requestedDays} requested`);
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
      setForm({ ...EMPTY_FORM, type: form.type });
      setAttachment(null);
      const fileInput = document.getElementById('leave-attachment') as HTMLInputElement | null;
      if (fileInput) fileInput.value = '';
      setLeaves((prev) => [created, ...(prev ?? [])]);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
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
              {/* Leave balance cards × 3 */}
              <div className="skeleton-card bento__mid">
                <div className="skeleton-line skeleton-line--title" style={{ width: '55%' }} />
                <div className="skeleton-line" style={{ width: '35%', height: '32px', marginTop: 12 }} />
                <div className="skeleton-line" style={{ width: '70%', marginTop: 8 }} />
              </div>
              <div className="skeleton-card bento__mid">
                <div className="skeleton-line skeleton-line--title" style={{ width: '45%' }} />
                <div className="skeleton-line" style={{ width: '30%', height: '32px', marginTop: 12 }} />
                <div className="skeleton-line" style={{ width: '65%', marginTop: 8 }} />
              </div>
              <div className="skeleton-card bento__mid">
                <div className="skeleton-line skeleton-line--title" style={{ width: '50%' }} />
                <div className="skeleton-line" style={{ width: '40%', height: '32px', marginTop: 12 }} />
                <div className="skeleton-line" style={{ width: '60%', marginTop: 8 }} />
              </div>
              {/* Apply form skeleton */}
              <div className="skeleton-card bento__mid">
                <div className="skeleton-line skeleton-line--title" style={{ width: '50%' }} />
                <div className="skeleton-line" style={{ width: '80%', marginTop: 16 }} />
                <div className="skeleton-line" style={{ width: '80%', marginTop: 10 }} />
                <div className="skeleton-line" style={{ width: '60%', marginTop: 10 }} />
                <div className="skeleton-line" style={{ width: '40%', height: '36px', marginTop: 16, borderRadius: '999px' }} />
              </div>
              {/* History table skeleton */}
              <div className="skeleton-card bento__wide">
                <div className="skeleton-line skeleton-line--title" style={{ width: '40%' }} />
                <div style={{ marginTop: 16 }}>
                  {[85, 72, 90, 68].map((w, i) => (
                    <div key={i} style={{ display: 'flex', gap: 16, marginBottom: 12, opacity: 1 - i * 0.15 }}>
                      <div className="skeleton-line" style={{ width: '20%' }} />
                      <div className="skeleton-line" style={{ width: `${w - 30}%` }} />
                      <div className="skeleton-line" style={{ width: '15%' }} />
                      <div className="skeleton-line" style={{ width: '12%' }} />
                    </div>
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
              {pending > 0 && <div className="hero-actions"><Badge tone="neutral">{pending} pending</Badge></div>}
            </div>

            <div className="bento">
              <Card className="bento__mid" heading="Apply for leave">
                <form onSubmit={handleSubmit}>
                  <div className="field">
                    <label className="field__label" htmlFor="leave-type">Type</label>
                    <select id="leave-type" className="input" value={form.type} onChange={set('type')} aria-describedby="leave-forecast-helper">
                      <option value="PAID">Paid leave</option>
                      <option value="SICK">Sick leave</option>
                      <option value="UNPAID">Unpaid leave</option>
                    </select>
                  </div>
                  <Input label="From" type="date" value={form.startDate} onChange={set('startDate')} min={todayISO} aria-describedby="leave-forecast-helper" />
                  <Input label="To" type="date" value={form.endDate} onChange={set('endDate')} min={form.startDate || todayISO} aria-describedby="leave-forecast-helper" />
                  {/* Live forecast — updates as type/dates change; entitlement minus PENDING+APPROVED */}
                  <div
                    id="leave-forecast-card"
                    className="leave-forecast animate-in"
                    aria-live="polite"
                    aria-atomic="true"
                    role="status"
                  >
                    {hasValidRange ? (
                      <>
                        <p id="leave-forecast-helper" className="leave-forecast__primary">
                          If you take <strong>{requestedDays} day{requestedDays === 1 ? '' : 's'}</strong>, you&apos;ll have{' '}
                          <strong>{Math.max(forecastLeft, 0)} left</strong> in {forecastYear}.
                          <span className="leave-forecast__badge-wrap">
                            {forecastLeft < 0 ? (
                              <Badge tone="error">exceeds balance</Badge>
                            ) : (
                              <Badge tone="neutral">{forecastLeft} of {entitlementForType} left</Badge>
                            )}
                          </span>
                        </p>
                        <p className="leave-forecast__meta dash-sub">
                          {form.type} · {left} of {entitlementForType} remaining · {requestedDays} requested ·{' '}
                          <strong>{Math.max(forecastLeft, 0)} after</strong>
                        </p>
                      </>
                    ) : (
                      <>
                        <p id="leave-forecast-helper" className="leave-forecast__primary leave-forecast__primary--muted">
                          Select dates to see forecast — <strong>{left} of {entitlementForType}</strong> {form.type} days left in {forecastYear}.
                          <span className="leave-forecast__badge-wrap">
                            <Badge tone="neutral">{left} left</Badge>
                          </span>
                        </p>
                        <p className="leave-forecast__meta dash-sub">
                          Entitlement {entitlementForType} · used {usedForType} (PENDING+APPROVED)
                        </p>
                      </>
                    )}
                    <p className="leave-forecast__carry">{carryForwardHint}{form.type === 'PAID' ? ' — unused PAID balance may roll over per policy.' : '.'}</p>
                    {hasValidRange && forecastLeft < 0 && (
                      <p className="form-error" style={{ marginTop: 'var(--space-xs)', marginBottom: 0 }}>
                        Insufficient {form.type} balance: {left} left, {requestedDays} requested.
                      </p>
                    )}
                  </div>
                  <p className="dash-sub" style={{ marginTop: -8, marginBottom: 12 }}>Past dates are not allowed for employees.</p>
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
                    {attachment && <span className="dash-sub" style={{ display: 'block', marginTop: 6 }}>{attachment.name} · {(attachment.size / 1024).toFixed(0)} KB</span>}
                  </div>
                  {formError && <p className="form-error">{formError}</p>}
                  <Button type="submit" disabled={submitting} className={submitting ? 'btn--loading' : ''}>
                    {submitting && <span className="spinner" />}
                    {submitting ? 'Submitting…' : 'Submit request'}
                  </Button>
                </form>
              </Card>

              <Card className="bento__mid card--tint-peach" heading="Leave balance">
                {BALANCE_TOTALS.map(({ type, total, tone }) => {
                  const used = usedByType.find((u) => u.type === type)?.used ?? 0;
                  const left = Math.max(total - used, 0);
                  return (
                    <div key={type} className="balance-row">
                      <div className="balance-top">
                        <span>{type.charAt(0) + type.slice(1).toLowerCase()} leave</span>
                        <span>{left} of {total} left</span>
                      </div>
                      <div className="balance-track">
                        <div
                          className={`balance-fill balance-fill--${tone}`}
                          style={{ width: `${(left / total) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                <p className="dash-sub" style={{ marginTop: 12 }}>
                  Used days come from your approved requests · totals are provisional
                </p>
              </Card>

              <Card className="bento__wide table-card" heading="My requests">
                {leaves && leaves.length > 0 ? (
                  <table className="table">
                    <thead>
                      <tr><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Status</th><th>Certificate</th><th>Review</th></tr>
                    </thead>
                    <tbody>
                      {leaves.map((l) => (
                        <tr key={l.id}>
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
                  <p className="dash-sub">No requests yet — your first one is one form away.</p>
                )}
              </Card>
            </div>
          </>
        )}
      </div>
    </Sidebar>
  );
}
