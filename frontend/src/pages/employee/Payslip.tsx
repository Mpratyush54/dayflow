import { useEffect, useState } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import CountdownRing from '../../components/common/CountdownRing';
import { useDelayedReady } from '../../hooks/useDelayedReady';
import { ToastStack } from '../../components/common/Toast';
import { useToasts } from '../../hooks/useToasts';
import { useNotifications } from '../../hooks/useNotifications';
import { downloadPayslip, getMyPayroll } from '../../api/payroll';
import type { Payroll } from '../../types';

function money(amount: number, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function daysToPayday() {
  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return endOfMonth - now.getDate();
}

function daysInMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
}

function formatDate(value?: string) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatMonthName(monthKey: string) {
  const [y, m] = monthKey.split('-').map(Number);
  if (!y || !m) return monthKey;
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function getRecentMonths(count = 6) {
  const result: { key: string; label: string; isCurrent: boolean }[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    result.push({
      key,
      label: i === 0 ? `${label} (Current)` : label,
      isCurrent: i === 0,
    });
  }
  return result;
}

function getRevisionDiff(payroll: Payroll) {
  const revs = payroll.revisions ?? [];
  if (!revs.length) return null;
  const last = revs[revs.length - 1];
  const prev = (last.previous ?? {}) as {
    basicSalary?: number;
    currency?: string;
    allowances?: Record<string, number>;
    deductions?: Record<string, number>;
  };
  const currAllow = (payroll.allowances ?? {}) as Record<string, number>;
  const prevAllow = (prev.allowances ?? {}) as Record<string, number>;
  const currDed = (payroll.deductions ?? {}) as Record<string, number>;
  const prevDed = (prev.deductions ?? {}) as Record<string, number>;

  type Entry = { label: string; prev: string; curr: string; changed: boolean; kind: string };
  const entries: Entry[] = [];

  const basicChanged = prev.basicSalary !== undefined && prev.basicSalary !== payroll.basicSalary;
  entries.push({
    label: 'Basic salary',
    prev: prev.basicSalary !== undefined ? money(prev.basicSalary, prev.currency ?? payroll.currency) : '—',
    curr: money(payroll.basicSalary, payroll.currency),
    changed: basicChanged,
    kind: 'basic',
  });

  if ((prev.currency ?? payroll.currency) !== payroll.currency) {
    entries.push({ label: 'Currency', prev: prev.currency ?? '—', curr: payroll.currency, changed: true, kind: 'currency' });
  }

  const allowKeys = new Set([...Object.keys(prevAllow), ...Object.keys(currAllow)]);
  for (const k of allowKeys) {
    const pv = prevAllow[k];
    const cv = currAllow[k];
    const changed = pv !== cv;
    entries.push({
      label: `Allowance: ${k.replace(/_/g, ' ')}`,
      prev: pv !== undefined ? money(pv, payroll.currency) : '— (added)',
      curr: cv !== undefined ? money(cv, payroll.currency) : '— (removed)',
      changed,
      kind: 'allowance',
    });
  }

  const dedKeys = new Set([...Object.keys(prevDed), ...Object.keys(currDed)]);
  for (const k of dedKeys) {
    const pv = prevDed[k];
    const cv = currDed[k];
    const changed = pv !== cv;
    entries.push({
      label: `Deduction: ${k.replace(/_/g, ' ')}`,
      prev: pv !== undefined ? money(pv, payroll.currency) : '— (added)',
      curr: cv !== undefined ? money(cv, payroll.currency) : '— (removed)',
      changed,
      kind: 'deduction',
    });
  }

  const changedOnly = entries.filter((e) => e.changed);
  return { last, prev, entries, changedOnly, at: last.at };
}

export default function Payslip() {
  const ready = useDelayedReady();
  const { toasts, push } = useToasts();
  const { pushNotification } = useNotifications();
  const [payroll, setPayroll] = useState<Payroll | null>(null);
  const [loadError, setLoadError] = useState('');
  const [downloadingMonth, setDownloadingMonth] = useState<string | null>(null);
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [month, setMonth] = useState(currentMonth);
  const recentMonths = getRecentMonths(6);

  async function handleDownload(targetMonth = month) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(targetMonth)) {
      push('Pick a valid month (YYYY-MM)');
      return;
    }
    setDownloadingMonth(targetMonth);
    try {
      await downloadPayslip(targetMonth);
      push(`Payslip for ${formatMonthName(targetMonth)} downloaded`);
    } catch (err) {
      push(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setDownloadingMonth(null);
    }
  }

  useEffect(() => {
    let cancelled = false;
    getMyPayroll()
      .then((data) => { if (!cancelled) setPayroll(data); })
      .catch((err) => { if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Failed to load'); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!payroll) return;
    pushNotification(
      {
        kind: 'payroll-ready',
        title: 'Payroll ready',
        message: 'Your salary structure and payslip are ready to view',
        href: '/payslip',
      },
      { dedupeKey: `payroll-ready-${payroll.id ?? 'current'}` },
    );
  }, [payroll, pushNotification]);

  return (
    <Sidebar
      user={{ name: 'Pratyush M.', role: 'Employee · EMP-0042', initials: 'PM' }}
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

        {!ready ? (
          <>
            <div className="dash-head">
              <div>
                <div className="skeleton-line" style={{ width: '140px', height: '13px' }} />
                <div className="skeleton-line skeleton-line--title" style={{ marginTop: 10, width: '160px', height: '36px' }} />
              </div>
            </div>
            <div className="bento">
              {/* Net pay hero card */}
              <div className="skeleton-card bento__mid">
                <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                  <div className="skeleton-avatar" style={{ width: 72, height: 72, borderRadius: '50%' }} />
                  <div style={{ flex: 1 }}>
                    <div className="skeleton-line" style={{ width: '70%', height: '28px' }} />
                    <div className="skeleton-line" style={{ width: '50%', marginTop: 8 }} />
                  </div>
                </div>
                <div className="skeleton-line" style={{ width: '90%', marginTop: 16 }} />
                <div className="skeleton-line" style={{ width: '75%', marginTop: 8 }} />
                <div className="skeleton-line" style={{ width: '80%', marginTop: 8 }} />
              </div>
              {/* Breakdown card */}
              <div className="skeleton-card bento__mid">
                <div className="skeleton-line skeleton-line--title" style={{ width: '45%' }} />
                <div className="skeleton-line" style={{ width: '90%', marginTop: 16 }} />
                <div className="skeleton-line" style={{ width: '75%', marginTop: 8 }} />
                <div className="skeleton-line" style={{ width: '80%', marginTop: 8 }} />
                <div className="skeleton-line" style={{ width: '65%', marginTop: 8 }} />
              </div>
              {/* Export table skeleton */}
              <div className="skeleton-card bento__wide">
                <div className="skeleton-line skeleton-line--title" style={{ width: '35%', marginBottom: 20 }} />
                {[85, 72, 90, 68, 78, 82].map((_, i) => (
                  <div key={i} style={{ display: 'flex', gap: 16, marginBottom: 12, opacity: 1 - i * 0.12 }}>
                    <div className="skeleton-line" style={{ width: '30%' }} />
                    <div className="skeleton-line" style={{ width: '20%' }} />
                    <div className="skeleton-line" style={{ width: '12%', borderRadius: '999px' }} />
                    <div className="skeleton-line" style={{ width: '20%', borderRadius: '999px' }} />
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : loadError ? (
          <>
            <div className="dash-head">
              <div>
                <p className="dash-sub">Salary structure</p>
                <h1>Pay<span className="text-gradient">slip</span></h1>
              </div>
            </div>
            <Card className="bento__mid">
              <p className="dash-sub">{loadError}</p>
            </Card>
          </>
        ) : payroll ? (
          <>
            {/* ── Page header ─────────────────────────────────── */}
            <div className="dash-head">
              <div>
                <p className="dash-sub">Effective {formatDate(payroll.effectiveFrom)} · read-only</p>
                <h1>Pay<span className="text-gradient">slip</span></h1>
              </div>
              {/* Consolidated single month selector + download */}
              <div className="hero-actions" style={{ flexWrap: 'wrap' }}>
                <Badge tone="success">{payroll.currency}</Badge>
                <select
                  className="input"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  style={{ width: 'auto', height: 'var(--button-height)', minWidth: 170 }}
                  aria-label="Select payslip month"
                >
                  {recentMonths.map((m) => (
                    <option key={m.key} value={m.key}>{m.label}</option>
                  ))}
                </select>
                <Button
                  onClick={() => void handleDownload(month)}
                  disabled={downloadingMonth === month}
                  className={downloadingMonth === month ? 'btn--loading' : ''}
                >
                  {downloadingMonth === month && <span className="spinner" />}
                  {downloadingMonth === month ? 'Preparing…' : `Download ${formatMonthName(month)} PDF`}
                </Button>
              </div>
            </div>

            {/* ── Bento cards ─────────────────────────────────── */}
            <div className="bento">

              {/* Net pay summary — with tooltip explaining gross → net */}
              <Card className="bento__mid animate-in" style={{ animationDelay: '60ms' }}>
                <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 'var(--space-base)' }}>
                  <CountdownRing days={daysToPayday()} total={daysInMonth()} label="to payday" />
                  <div>
                    <span
                      className="stat-xl"
                      title={`Net pay = Gross (Basic ${money(payroll.basicSalary, payroll.currency)} + Allowances ${money(payroll.totalAllowances, payroll.currency)} = ${money(payroll.grossPay, payroll.currency)}) − Deductions ${money(payroll.totalDeductions, payroll.currency)}`}
                      style={{ cursor: 'help', borderBottom: '1px dashed var(--color-hairline-strong)' }}
                      aria-label={`Net pay ${money(payroll.netPay, payroll.currency)}: Gross ${money(payroll.grossPay, payroll.currency)} minus Deductions ${money(payroll.totalDeductions, payroll.currency)}`}
                    >
                      {money(payroll.netPay, payroll.currency)}
                    </span>
                    <p className="dash-sub" style={{ marginTop: 4 }}>
                      Net pay · this month{' '}
                      <span
                        title={`Gross ${money(payroll.grossPay, payroll.currency)} − Deductions ${money(payroll.totalDeductions, payroll.currency)} = Net ${money(payroll.netPay, payroll.currency)}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 18,
                          height: 18,
                          borderRadius: 'var(--radius-pill)',
                          background: 'var(--color-surface-strong)',
                          color: 'var(--color-muted)',
                          fontSize: 11,
                          cursor: 'help',
                          verticalAlign: 'middle',
                          marginLeft: 6,
                        }}
                        aria-label="How net pay is calculated"
                      >
                        ?
                      </span>
                    </p>
                    <p className="dash-sub" style={{ marginTop: 2, fontSize: 12, color: 'var(--color-muted-soft)' }}>
                      Gross − Deductions
                    </p>
                  </div>
                </div>
                <div style={{ borderTop: '1px solid var(--color-hairline)', paddingTop: 'var(--space-sm)' }}>
                  <div className="summary-row">
                    <span className="summary-row__label">Basic</span>
                    <span className="summary-row__value">{money(payroll.basicSalary, payroll.currency)}</span>
                  </div>
                  <div className="summary-row">
                    <span className="summary-row__label">Allowances</span>
                    <span className="summary-row__value">+ {money(payroll.totalAllowances, payroll.currency)}</span>
                  </div>
                  <div className="summary-row">
                    <span className="summary-row__label">Deductions</span>
                    <span className="summary-row__value">− {money(payroll.totalDeductions, payroll.currency)}</span>
                  </div>
                  <div className="summary-row">
                    <span className="summary-row__label">Gross</span>
                    <span className="summary-row__value">{money(payroll.grossPay, payroll.currency)}</span>
                  </div>
                </div>
              </Card>

              {/* Itemised breakdown */}
              <Card className="bento__mid animate-in" heading="Breakdown" style={{ animationDelay: '120ms' }}>
                <div className="summary-row">
                  <span className="summary-row__label">Basic salary</span>
                  <span className="summary-row__value">{money(payroll.basicSalary, payroll.currency)}</span>
                </div>
                {Object.entries(payroll.allowances ?? {}).map(([key, value]) => (
                  <div className="summary-row" key={`a-${key}`}>
                    <span className="summary-row__label">{key.replace(/_/g, ' ')}</span>
                    <span className="summary-row__value">+ {money(value, payroll.currency)}</span>
                  </div>
                ))}
                {Object.entries(payroll.deductions ?? {}).map(([key, value]) => (
                  <div className="summary-row" key={`d-${key}`}>
                    <span className="summary-row__label">{key.replace(/_/g, ' ')}</span>
                    <span className="summary-row__value">− {money(value, payroll.currency)}</span>
                  </div>
                ))}
                <div className="summary-row" style={{ borderTop: '1px solid var(--color-hairline)', paddingTop: 'var(--space-xs)', marginTop: 'var(--space-xs)' }}>
                  <span className="summary-row__label">Net pay</span>
                  <span
                    className="summary-row__value"
                    title={`Net = Gross ${money(payroll.grossPay, payroll.currency)} − Deductions ${money(payroll.totalDeductions, payroll.currency)}`}
                    style={{ cursor: 'help', borderBottom: '1px dashed var(--color-hairline-strong)' }}
                  >
                    {money(payroll.netPay, payroll.currency)}
                  </span>
                </div>
                <p className="dash-sub" style={{ marginTop: 12 }}>
                  Computed server-side · corrections go through HR
                </p>
              </Card>

              {/* HTML preview — mirrors PDF data as HTML */}
              <Card className="bento__wide animate-in" heading={`Payslip preview — ${formatMonthName(month)}`} style={{ animationDelay: '180ms' }}>
                <p className="dash-sub" style={{ marginBottom: 'var(--space-base)' }}>
                  HTML preview of the same data in your PDF. Verify before downloading.
                </p>
                <div
                  style={{
                    border: '1px solid var(--color-hairline-soft)',
                    borderRadius: 'var(--radius-lg)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      background: 'var(--color-surface-strong)',
                      padding: 'var(--space-base) var(--space-lg)',
                      borderBottom: '1px solid var(--color-hairline)',
                    }}
                  >
                    <div style={{ font: 'var(--type-title-sm)', color: 'var(--color-ink)' }}>DayFlow</div>
                    <div style={{ font: 'var(--type-caption)', color: 'var(--color-muted)' }}>Human Resource Management System · Salary Slip</div>
                    <div style={{ marginTop: 6, font: 'var(--type-caption-uppercase)', color: 'var(--color-muted)', letterSpacing: 'var(--type-caption-uppercase-spacing)' }}>
                      Payslip for {formatMonthName(month)} · {payroll.currency}
                    </div>
                  </div>

                  <div style={{ padding: 'var(--space-lg)' }}>
                    {/* Earnings */}
                    <div
                      style={{
                        background: 'var(--color-hairline-soft)',
                        padding: 'var(--space-xs) var(--space-sm)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        font: 'var(--type-caption-uppercase)',
                        color: 'var(--color-ink)',
                        letterSpacing: 'var(--type-caption-uppercase-spacing)',
                      }}
                    >
                      <span>Earnings</span>
                      <span>Amount</span>
                    </div>
                    <div className="summary-row">
                      <span className="summary-row__label">Basic salary</span>
                      <span className="summary-row__value">{money(payroll.basicSalary, payroll.currency)}</span>
                    </div>
                    {Object.entries(payroll.allowances ?? {}).map(([k, v]) => (
                      <div className="summary-row" key={`prev-a-${k}`}>
                        <span className="summary-row__label">{k.replace(/_/g, ' ')}</span>
                        <span className="summary-row__value">{money(v, payroll.currency)}</span>
                      </div>
                    ))}
                    <div
                      className="summary-row"
                      style={{ fontWeight: 600, borderTop: '1px solid var(--color-hairline)', paddingTop: 'var(--space-xs)', marginTop: 'var(--space-xs)' }}
                    >
                      <span className="summary-row__label">Gross earnings</span>
                      <span className="summary-row__value">{money(payroll.grossPay, payroll.currency)}</span>
                    </div>

                    {/* Deductions */}
                    <div
                      style={{
                        background: 'var(--color-hairline-soft)',
                        padding: 'var(--space-xs) var(--space-sm)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        font: 'var(--type-caption-uppercase)',
                        color: 'var(--color-ink)',
                        letterSpacing: 'var(--type-caption-uppercase-spacing)',
                        marginTop: 'var(--space-base)',
                      }}
                    >
                      <span>Deductions</span>
                      <span>Amount</span>
                    </div>
                    {Object.keys(payroll.deductions ?? {}).length === 0 ? (
                      <div className="summary-row">
                        <span className="summary-row__label" style={{ color: 'var(--color-muted)' }}>None</span>
                        <span className="summary-row__value">{money(0, payroll.currency)}</span>
                      </div>
                    ) : (
                      Object.entries(payroll.deductions ?? {}).map(([k, v]) => (
                        <div className="summary-row" key={`prev-d-${k}`}>
                          <span className="summary-row__label">{k.replace(/_/g, ' ')}</span>
                          <span className="summary-row__value">− {money(v, payroll.currency)}</span>
                        </div>
                      ))
                    )}
                    <div className="summary-row" style={{ fontWeight: 600, borderTop: '1px solid var(--color-hairline)', paddingTop: 'var(--space-xs)', marginTop: 'var(--space-xs)' }}>
                      <span className="summary-row__label">Total deductions</span>
                      <span className="summary-row__value">− {money(payroll.totalDeductions, payroll.currency)}</span>
                    </div>

                    {/* Net pay highlight with tooltip */}
                    <div
                      title={`Net pay = Gross ${money(payroll.grossPay, payroll.currency)} − Deductions ${money(payroll.totalDeductions, payroll.currency)} = ${money(payroll.netPay, payroll.currency)}`}
                      style={{
                        marginTop: 'var(--space-base)',
                        background: 'var(--color-surface-dark)',
                        color: 'var(--color-on-dark)',
                        borderRadius: 'var(--radius-md)',
                        padding: 'var(--space-sm) var(--space-base)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'help',
                      }}
                    >
                      <span style={{ font: 'var(--type-title-sm)' }}>Net pay</span>
                      <span style={{ font: 'var(--type-title-sm)', letterSpacing: '0.2px' }}>{money(payroll.netPay, payroll.currency)}</span>
                    </div>
                    <p className="dash-sub" style={{ marginTop: 8, fontSize: 12 }}>
                      Hover net pay to see formula: Gross − Deductions. Matches PDF exactly.
                    </p>
                  </div>
                  <div
                    style={{
                      borderTop: '1px solid var(--color-hairline-soft)',
                      padding: 'var(--space-xs) var(--space-lg)',
                      font: 'var(--type-caption)',
                      color: 'var(--color-muted-soft)',
                      background: 'var(--color-canvas-soft)',
                    }}
                  >
                    Computer-generated slip · DayFlow HRMS · Effective {formatDate(payroll.effectiveFrom)}
                  </div>
                </div>
              </Card>

              {/* Revision diff — highlight changed allowances/deductions/basic */}
              {(() => {
                const diff = getRevisionDiff(payroll);
                if (!diff) return null;
                const hasChanges = diff.changedOnly.length > 0;
                return (
                  <Card
                    className="bento__wide animate-in"
                    heading="Revision history"
                    style={{ animationDelay: '240ms' } as React.CSSProperties}
                  >
                    <p className="dash-sub" style={{ marginBottom: 6 }}>
                      Last change {formatDate(diff.at)} · previous → current
                      {diff.last.changedBy ? ` · by ${String(diff.last.changedBy).slice(0, 8)}` : ''}
                    </p>
                    {!hasChanges ? (
                      <p className="dash-sub" style={{ color: 'var(--color-muted)' }}>No field changes detected in the latest revision.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)', marginTop: 'var(--space-sm)' }}>
                        {diff.entries.map((e) =>
                          e.changed ? (
                            <div
                              key={e.label}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: 'var(--space-sm)',
                                padding: 'var(--space-xs) var(--space-sm)',
                                borderRadius: 'var(--radius-md)',
                                background: 'var(--color-surface-strong)',
                                border: '1px solid var(--color-hairline)',
                              }}
                            >
                              <span style={{ font: 'var(--type-caption)', color: 'var(--color-ink)', flex: 1 }}>{e.label}</span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                <span style={{ font: 'var(--type-caption)', color: 'var(--color-muted)', textDecoration: 'line-through' }}>{e.prev}</span>
                                <span style={{ color: 'var(--color-muted)' }}>→</span>
                                <Badge tone="success" style={{ background: 'var(--color-gradient-mint)', color: 'var(--color-ink)' }}>{e.curr}</Badge>
                              </span>
                            </div>
                          ) : null,
                        )}
                        <div style={{ marginTop: 'var(--space-xs)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <Badge tone="success">{diff.changedOnly.length} field{diff.changedOnly.length === 1 ? '' : 's'} changed</Badge>
                          <span className="dash-sub">Unchanged fields hidden</span>
                        </div>
                        <p className="dash-sub" style={{ marginTop: 4, fontSize: 12, color: 'var(--color-muted-soft)' }}>
                          Net pay recalculated server-side after each revision.
                        </p>
                      </div>
                    )}
                    {payroll.revisions && payroll.revisions.length > 1 && (
                      <p className="dash-sub" style={{ marginTop: 'var(--space-sm)', fontSize: 12 }}>
                        {payroll.revisions.length} revisions total · showing latest diff
                      </p>
                    )}
                  </Card>
                );
              })()}

              {/* Monthly export table */}
              <Card className="bento__wide table-card" heading="Export payslip by month">
                <p className="dash-sub" style={{ marginBottom: 'var(--space-base)' }}>
                  Download official PDF payslips for any payroll cycle. Each statement includes gross earnings, statutory deductions, and net pay.
                </p>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Net pay</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentMonths.map((m) => (
                      <tr key={m.key}>
                        <td>
                          <strong>{m.label}</strong>
                          <span className="dash-sub" style={{ display: 'block' }}>
                            Cycle: {m.key}-01 to {m.key}-28/31
                          </span>
                        </td>
                        <td className="table-mono">{money(payroll.netPay, payroll.currency)}</td>
                        <td>
                          <Badge tone="success">Ready</Badge>
                        </td>
                        <td>
                          <Button
                            variant={month === m.key ? 'primary' : 'outline'}
                            disabled={downloadingMonth === m.key}
                            className={downloadingMonth === m.key ? 'btn--loading' : ''}
                            onClick={() => {
                              setMonth(m.key);
                              void handleDownload(m.key);
                            }}
                          >
                            {downloadingMonth === m.key && (
                              <span className={`spinner${month === m.key ? '' : ' spinner--dark'}`} />
                            )}
                            {downloadingMonth === m.key ? 'Downloading…' : 'Download PDF'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          </>
        ) : null}
      </div>
    </Sidebar>
  );
}
