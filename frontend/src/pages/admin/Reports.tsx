import { useCallback, useEffect, useState } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import AreaChart from '../../components/charts/AreaChart';
import Donut from '../../components/charts/Donut';
import { ToastStack } from '../../components/common/Toast';
import { useToasts } from '../../hooks/useToasts';
import { downloadAttendanceCsv, getAnalyticsSummary } from '../../api/analytics';
import type { AnalyticsSummary } from '../../types';

function Skeletons() {
  return (
    <div className="bento">
      <div className="skeleton-card bento__hero"><div className="skeleton-line skeleton-line--title" /><div className="skeleton-line skeleton-line--wide" /></div>
      <div className="skeleton-card bento__mid"><div className="skeleton-line skeleton-line--title" /><div className="skeleton-line" /></div>
      <div className="skeleton-card bento__mid"><div className="skeleton-line skeleton-line--title" /><div className="skeleton-line" /></div>
      <div className="skeleton-card bento__wide"><div className="skeleton-line skeleton-line--title" /><div className="skeleton-line skeleton-line--wide" /></div>
    </div>
  );
}

function money(n: number) {
  return `₹${Number(n).toLocaleString('en-IN')}`;
}

function monthLabel(month: string) {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString([], { month: 'long', year: 'numeric' });
}

export default function Reports() {
  const { toasts, push } = useToasts();
  const now = new Date();
  const [month, setMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
  );
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(async (forMonth: string) => {
    setLoading(true);
    try {
      setData(await getAnalyticsSummary(forMonth));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(month);
  }, [month, load]);

  async function handleCsv() {
    setDownloading(true);
    try {
      await downloadAttendanceCsv(month);
      push(`Attendance CSV for ${monthLabel(month)} downloaded`);
    } catch (err) {
      push(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setDownloading(false);
    }
  }

  const trend = data?.attendanceTrend ?? [];
  const chartPoints = trend.map((d) => d.present + d.halfDay * 0.5);
  const chartLabels = trend.map((d) => d.date.slice(8)); // day of month
  const leaveTotal = (data?.leaveUsage ?? []).reduce((sum, l) => sum + l.days, 0);
  const leaveMax = Math.max(...(data?.leaveUsage ?? [{ days: 1 }]).map((l) => l.days), 1);

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
          <Card heading="Reports & analytics">
            <p className="form-error">{error}</p>
            <Button variant="outline" onClick={() => void load(month)}>Retry</Button>
          </Card>
        ) : data && (
          <>
            <div className="dash-head">
              <div>
                <p className="dash-sub">{monthLabel(month)}</p>
                <h1>Reports & <span className="text-gradient">analytics</span></h1>
                <p className="ticker" style={{ marginTop: 12 }}>
                  <span className="ticker__dot" aria-hidden />
                  {data.headcount.active} active employees · {data.pendingLeaves} pending leave requests
                </p>
              </div>
              <div className="hero-actions">
                <input
                  type="month"
                  className="input"
                  style={{ width: 'auto', height: 'var(--button-height)' }}
                  value={month}
                  max={`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`}
                  onChange={(e) => setMonth(e.target.value)}
                  aria-label="Report month"
                />
                <Button variant="outline" onClick={() => void handleCsv()} disabled={downloading}>
                  {downloading ? 'Preparing…' : 'Attendance CSV'}
                </Button>
              </div>
            </div>

            <div className="bento">
              <Card className="bento__mid stat-card card--tint-mint">
                <span className="stat-xl">{data.headcount.total}</span>
                <span className="stat-label">Headcount · {data.headcount.active} active</span>
              </Card>
              <Card className="bento__mid stat-card card--tint-sky">
                <span className="stat-xl">{data.payroll.withSalary}</span>
                <span className="stat-label">Employees on payroll</span>
              </Card>
              <Card className="bento__mid stat-card card--dark">
                <span className="stat-xl">{money(data.payroll.net)}</span>
                <span className="stat-label">Net payroll · {monthLabel(month)}</span>
              </Card>
              <Card className="bento__mid card--tint-lavender donut-card">
                <Donut
                  value={data.headcount.total === 0 ? 0 : Math.round((data.headcount.active / data.headcount.total) * 100)}
                  label="Active"
                  sublabel={`${data.headcount.byRole.EMPLOYEE ?? 0} emp · ${data.headcount.byRole.HR ?? 0} hr`}
                />
              </Card>

              <Card className="bento__hero card--grad" heading="Attendance trend">
                {trend.length === 0 ? (
                  <p className="dash-sub">No attendance recorded this month yet.</p>
                ) : (
                  <>
                    <div className="art" style={{ marginBottom: 16 }} aria-hidden />
                    <AreaChart id="reports-trend" points={chartPoints} labels={chartLabels} height={220} />
                    <p className="dash-sub">Daily present count (half day = 0.5) · {monthLabel(month)}</p>
                  </>
                )}
              </Card>

              <Card className="bento__mid card--tint-peach" heading="Leave usage">
                {leaveTotal === 0 ? (
                  <p className="dash-sub">No approved leave this month.</p>
                ) : (
                  data.leaveUsage.map((l) => (
                    <div className="balance-row" key={l.type}>
                      <div className="balance-top">
                        <span>{l.type.charAt(0) + l.type.slice(1).toLowerCase()} leave</span>
                        <span>{l.days} {l.days === 1 ? 'day' : 'days'}</span>
                      </div>
                      <div className="balance-track">
                        <div
                          className={`balance-fill balance-fill--${l.type === 'PAID' ? 'mint' : l.type === 'SICK' ? 'peach' : 'lavender'}`}
                          style={{ width: `${(l.days / leaveMax) * 100}%`, animationDelay: '0.2s' }}
                        />
                      </div>
                    </div>
                  ))
                )}
                <div className="summary-row" style={{ marginTop: 12 }}>
                  <span className="summary-row__label">Pending requests</span>
                  <span className="summary-row__value">{data.pendingLeaves}</span>
                </div>
              </Card>

              <Card className="bento__wide" heading="Payroll summary">
                <div className="summary-row">
                  <span className="summary-row__label">Gross payroll ({data.payroll.withSalary} employees)</span>
                  <span className="summary-row__value">{money(data.payroll.gross)}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-row__label">Total deductions</span>
                  <span className="summary-row__value">− {money(data.payroll.deductions)}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-row__label">Net payroll</span>
                  <span className="summary-row__value">{money(data.payroll.net)}</span>
                </div>
                <p className="dash-sub" style={{ marginTop: 12 }}>
                  Generated from current salary structures <Badge tone="neutral">live data</Badge>
                </p>
              </Card>
            </div>
          </>
        )}
      </div>
    </Sidebar>
  );
}
