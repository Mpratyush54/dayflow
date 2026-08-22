import { useEffect, useState } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import CountdownRing from '../../components/common/CountdownRing';
import { useDelayedReady } from '../../hooks/useDelayedReady';
import { ToastStack } from '../../components/common/Toast';
import { useToasts } from '../../hooks/useToasts';
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

export default function Payslip() {
  const ready = useDelayedReady();
  const { toasts, push } = useToasts();
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

              {/* Net pay summary — plain card works in both modes */}
              <Card className="bento__mid">
                {/* Ring + net pay on one row */}
                <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 'var(--space-base)' }}>
                  <CountdownRing days={daysToPayday()} total={daysInMonth()} label="to payday" />
                  <div>
                    <span className="stat-xl">{money(payroll.netPay, payroll.currency)}</span>
                    <p className="dash-sub" style={{ marginTop: 4 }}>Net pay · this month</p>
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
              <Card className="bento__mid" heading="Breakdown">
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
                  <span className="summary-row__value">{money(payroll.netPay, payroll.currency)}</span>
                </div>
                <p className="dash-sub" style={{ marginTop: 12 }}>
                  Computed server-side · corrections go through HR
                </p>
              </Card>

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
