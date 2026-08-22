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

export default function Payslip() {
  const ready = useDelayedReady();
  const { toasts, push } = useToasts();
  const [payroll, setPayroll] = useState<Payroll | null>(null);
  const [loadError, setLoadError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const now = new Date();
  const [month, setMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
  );

  async function handleDownload() {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      push('Pick a valid month (YYYY-MM)');
      return;
    }
    setDownloading(true);
    try {
      await downloadPayslip(month);
      push(`Payslip for ${month} downloaded`);
    } catch (err) {
      push(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setDownloading(false);
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
          <div className="bento">
            <div className="skeleton-card bento__mid"><div className="skeleton-line skeleton-line--title" /><div className="skeleton-line skeleton-line--wide" /></div>
            <div className="skeleton-card bento__mid"><div className="skeleton-line skeleton-line--title" /><div className="skeleton-line" /></div>
          </div>
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
            <div className="dash-head">
              <div>
                <p className="dash-sub">Effective {formatDate(payroll.effectiveFrom)} · read-only</p>
                <h1>Pay<span className="text-gradient">slip</span></h1>
              </div>
              <div className="hero-actions">
                <Badge tone="success">{payroll.currency}</Badge>
                <input
                  type="month"
                  className="input"
                  style={{ width: 'auto', height: 'var(--button-height)' }}
                  value={month}
                  max={`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`}
                  onChange={(e) => setMonth(e.target.value)}
                  aria-label="Payslip month"
                />
                <Button onClick={() => void handleDownload()} disabled={downloading}>
                  {downloading ? 'Preparing…' : 'Download PDF'}
                </Button>
              </div>
            </div>

            <div className="bento">
              <Card className="bento__mid card--dark">
                <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                  <CountdownRing days={daysToPayday()} total={daysInMonth()} label="to payday" />
                  <div>
                    <span className="stat-xl">{money(payroll.netPay, payroll.currency)}</span>
                    <p className="dash-sub" style={{ color: 'var(--color-on-dark-soft)', marginTop: 6 }}>
                      Net pay · this structure
                    </p>
                  </div>
                </div>
                <div className="summary-row" style={{ marginTop: 16 }}>
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
              </Card>

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
                <div className="summary-row">
                  <span className="summary-row__label">Net pay</span>
                  <span className="summary-row__value">{money(payroll.netPay, payroll.currency)}</span>
                </div>
                <p className="dash-sub" style={{ marginTop: 12 }}>
                  Computed server-side · corrections go through HR
                </p>
              </Card>
            </div>
          </>
        ) : null}
      </div>
    </Sidebar>
  );
}
