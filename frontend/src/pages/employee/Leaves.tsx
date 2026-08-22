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
  return Math.round((+new Date(end) - +new Date(start)) / 86_400_000) + 1;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
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
    setSubmitting(true);
    try {
      const created = await applyLeave(form);
      push(`${created.type} leave requested for ${formatDate(created.startDate)}`);
      setForm({ ...EMPTY_FORM, type: form.type });
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
                    <select id="leave-type" className="input" value={form.type} onChange={set('type')}>
                      <option value="PAID">Paid leave</option>
                      <option value="SICK">Sick leave</option>
                      <option value="UNPAID">Unpaid leave</option>
                    </select>
                  </div>
                  <Input label="From" type="date" value={form.startDate} onChange={set('startDate')} min={todayISO} />
                  <Input label="To" type="date" value={form.endDate} onChange={set('endDate')} min={form.startDate || todayISO} />
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
                      <tr><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Status</th><th>Review</th></tr>
                    </thead>
                    <tbody>
                      {leaves.map((l) => (
                        <tr key={l.id}>
                          <td className="table-mono">{l.type}</td>
                          <td>{formatDate(l.startDate)}</td>
                          <td>{formatDate(l.endDate)}</td>
                          <td>{daysInclusive(l.startDate, l.endDate)}</td>
                          <td><Badge tone={STATUS_TONE[l.status]}>{l.status.toLowerCase()}</Badge></td>
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
