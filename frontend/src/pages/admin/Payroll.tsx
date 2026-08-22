import { Fragment, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Donut from '../../components/charts/Donut';
import Pagination from '../../components/common/Pagination';
import { ToastStack } from '../../components/common/Toast';
import { useToasts } from '../../hooks/useToasts';
import { useNotifications } from '../../hooks/useNotifications';
import { useDelayedReady } from '../../hooks/useDelayedReady';
import { getAllPayroll, updatePayroll, downloadPayslip } from '../../api/payroll';
import type { PayrollStructureInput } from '../../api/payroll';
import { listEmployees } from '../../api/employees';
import type { Payroll, User } from '../../types';
import {
  PF_KEY,
  PROF_TAX_KEY,
  buildStructurePreview,
  recordToComponents,
  type ComponentMode,
  type SalaryComponent,
} from '../../utils/salaryCalc';

function formatMonthName(monthKey: string) {
  const [y, m] = monthKey.split('-').map(Number);
  if (!y || !m) return monthKey;
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function getRecentMonths(count = 6) {
  const result: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    result.push({ key, label: i === 0 ? `${label} (Current)` : label });
  }
  return result;
}

const AVATAR_TONES = ['mint', 'peach', 'lavender', 'sky'];

interface EditState {
  userId: string;
  monthlyWage: string;
  components: SalaryComponent[];
}

function modeLabel(mode: ComponentMode) {
  if (mode === 'percent_of_wage') return '% of Wage';
  if (mode === 'percent_of_basic') return '% of Basic';
  return 'Fixed ₹';
}

function toneOf(seed: string) {
  const sum = [...seed].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return AVATAR_TONES[sum % AVATAR_TONES.length];
}

function money(amount: number, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function employeeOf(record: Payroll): User {
  return typeof record.userId === 'string'
    ? { id: record.userId, employeeId: '—', email: '', role: 'EMPLOYEE' }
    : record.userId;
}

export default function PayrollAdmin() {
  const ready = useDelayedReady();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(Number(searchParams.get('page') || 1), 1);
  const { toasts, push } = useToasts();
  const { pushNotification } = useNotifications();
  const [records, setRecords] = useState<Payroll[] | null>(null);
  const [pagination, setPagination] = useState<{ total: number; pages: number } | null>(null);
  const [employees, setEmployees] = useState<User[]>([]);
  const [loadError, setLoadError] = useState('');
  const [edit, setEdit] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  // per-employee month-selection for payslip download
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [slipMonth, setSlipMonth] = useState<Record<string, string>>({});
  const [downloadingFor, setDownloadingFor] = useState<string | null>(null);
  const recentMonths = getRecentMonths(6);

  async function handleDownloadSlip(userId: string) {
    const m = slipMonth[userId] ?? currentMonth;
    setDownloadingFor(userId);
    try {
      await downloadPayslip(m, userId);
      push(`Payslip for ${formatMonthName(m)} downloaded`);
    } catch (err) {
      push(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setDownloadingFor(null);
    }
  }

  async function load(p = page) {
    try {
      const [payrollRes, staff] = await Promise.all([getAllPayroll(p, 10), listEmployees()]);
      if (Array.isArray(payrollRes)) {
        setRecords(payrollRes);
        setPagination(null);
      } else {
        setRecords(payrollRes.data);
        setPagination({ total: payrollRes.total, pages: payrollRes.pages });
      }
      if (Array.isArray(staff)) setEmployees(staff);
      else setEmployees((staff as { data: User[] }).data);
      setLoadError('');
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load');
    }
  }

  useEffect(() => { void load(page); }, [page]);

  const processedPercent = employees.length
    ? Math.round(((records?.length ?? 0) / employees.length) * 100)
    : 0;

  const preview = useMemo(() => {
    if (!edit) return null;
    return buildStructurePreview(Number(edit.monthlyWage) || 0, edit.components);
  }, [edit]);

  function setComponent(index: number, patch: Partial<SalaryComponent>) {
    setEdit((prev) =>
      prev
        ? { ...prev, components: prev.components.map((c, i) => (i === index ? { ...c, ...patch } : c)) }
        : prev,
    );
  }

  function startEdit(record: Payroll) {
    const wage = record.basicSalary + Object.values(record.allowances ?? {}).reduce((s, v) => s + v, 0);
    setEdit({
      userId: employeeOf(record).id,
      monthlyWage: String(wage || record.basicSalary || 50000),
      components: recordToComponents(record.basicSalary, record.allowances),
    });
  }

  async function save() {
    if (!edit || !preview) return;
    if (!preview.withinWage) {
      push('Component total exceeds monthly wage — adjust percentages or wage');
      return;
    }
    const input: PayrollStructureInput = {
      monthlyWage: Number(edit.monthlyWage) || 0,
      components: edit.components
        .filter((c) => !c.auto)
        .map((c) => ({ key: c.key, mode: c.mode, value: c.value })),
    };
    setSaving(true);
    try {
      const updated = await updatePayroll(edit.userId, input);
      const who = employeeOf(updated);
      push(`Salary structure saved for ${who.name || who.email || who.id}`);
      pushNotification(
        {
          kind: 'payroll-ready',
          title: 'Payroll updated',
          message: `Salary structure saved for ${who.name || who.email || who.id}`,
          href: '/admin/payroll',
        },
        { dedupeKey: `payroll-saved-${edit.userId}-${Date.now()}` },
      );
      setEdit(null);
      await load();
    } catch (err) {
      push(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sidebar
      user={{ name: 'Meera T.', role: 'HR · Admin', initials: 'MT' }}
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

        {!ready ? (
          <>
            <div className="dash-head">
              <div>
                <div className="skeleton-line" style={{ width: '100px', height: '13px' }} />
                <div className="skeleton-line skeleton-line--title" style={{ marginTop: 10, width: '170px', height: '36px' }} />
              </div>
            </div>
            <div className="bento">
              {/* Donut card placeholder */}
              <div className="skeleton-card bento__mid" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                <div className="skeleton-avatar" style={{ width: 120, height: 120 }} />
                <div className="skeleton-line" style={{ width: '60%' }} />
                <div className="skeleton-line" style={{ width: '40%' }} />
              </div>
              {/* Table skeleton */}
              <div className="skeleton-card bento__wide">
                <div className="skeleton-line skeleton-line--title" style={{ width: '35%', marginBottom: 20 }} />
                {[95, 80, 88, 72, 85].map((_, i) => (
                  <div key={i} style={{ display: 'flex', gap: 16, marginBottom: 14, alignItems: 'center', opacity: 1 - i * 0.14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '22%' }}>
                      <div className="skeleton-avatar" style={{ width: 32, height: 32 }} />
                      <div className="skeleton-line" style={{ flex: 1 }} />
                    </div>
                    <div className="skeleton-line" style={{ width: '14%' }} />
                    <div className="skeleton-line" style={{ width: '13%' }} />
                    <div className="skeleton-line" style={{ width: '13%' }} />
                    <div className="skeleton-line" style={{ width: '15%', borderRadius: '999px' }} />
                    <div className="skeleton-line" style={{ width: '10%' }} />
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : loadError ? (
          <p className="dash-sub">{loadError}</p>
        ) : (
          <>
            <div className="dash-head">
              <div>
                <p className="dash-sub">Every edit keeps a revision trail</p>
                <h1>Pay<span className="text-gradient">roll</span></h1>
              </div>
            </div>

            <div className="bento">
              <Card className="bento__tall card--tint-lavender donut-card">
                <Donut
                  value={processedPercent}
                  label="Payroll processed"
                  sublabel={`${records?.length ?? 0} of ${employees.length} employees`}
                />
                <p className="dash-sub" style={{ marginTop: 12 }}>
                  Employees with a salary structure on file
                </p>
              </Card>

              <Card className="bento__wide table-card" heading={`Salary structures (${pagination ? pagination.total : records?.length ?? 0})`}>
                {records && records.length > 0 ? (
                  <>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Employee</th><th>Basic</th><th>Allowances</th>
                          <th>Deductions</th><th>Net</th><th>Effective</th>
                        </tr>
                      </thead>
                      <tbody>
                        {records.map((r) => {
                        const who = employeeOf(r);
                        const name = who.name || who.email || who.id;
                        const initials = name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
                        const isOpen = edit?.userId === who.id;
                        const revisionCount = r.revisions?.length ?? 0;
                        return (
                          <Fragment key={r.id}>
                            <tr
                              className="expandable-row"
                              onClick={() => (isOpen ? setEdit(null) : startEdit(r))}
                            >
                              <td>
                                <span className="cell-name">
                                  <span className={`avatar avatar--${toneOf(name)}`}>{initials}</span>
                                  <span>
                                    {name}
                                    <span className="dash-sub" style={{ display: 'block' }}>
                                      {who.employeeId}
                                      {revisionCount > 0 && ` · ${revisionCount} revision${revisionCount > 1 ? 's' : ''}`}
                                    </span>
                                  </span>
                                </span>
                              </td>
                              <td className="table-mono">{money(r.basicSalary, r.currency)}</td>
                              <td className="table-mono">+ {money(r.totalAllowances, r.currency)}</td>
                              <td className="table-mono">− {money(r.totalDeductions, r.currency)}</td>
                              <td><Badge tone="success">{money(r.netPay, r.currency)}</Badge></td>
                              <td className="dash-sub">
                                {r.effectiveFrom
                                  ? new Date(r.effectiveFrom).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
                                  : '—'}
                              </td>
                            </tr>
                            {isOpen && edit && (
                              <tr className="row-detail">
                                <td colSpan={6}>
                                  <div className="row-detail__inner payroll-editor">
                                    <div className="payroll-editor__wage">
                                      <Input
                                        label="Monthly wage (₹)"
                                        type="number"
                                        min={0}
                                        value={edit.monthlyWage}
                                        onChange={(e) => setEdit({ ...edit, monthlyWage: e.target.value })}
                                      />
                                    </div>
                                    <div className="payroll-editor__components">
                                      <span className="field__label">Salary components</span>
                                      {edit.components.map((comp, i) => {
                                        const amount = preview
                                          ? comp.key === 'basic'
                                            ? preview.basicSalary
                                            : comp.auto
                                              ? preview.allowances.fixed_allowance ?? 0
                                              : preview.allowanceLines.find((l) => l.key === comp.key)?.amount ?? 0
                                          : 0;
                                        return (
                                          <div key={comp.key} className="payroll-editor__row">
                                            <span className="payroll-editor__label">{comp.label}</span>
                                            {comp.auto ? (
                                              <span className="payroll-editor__auto dash-sub">Auto · {money(amount)}</span>
                                            ) : (
                                              <>
                                                <select
                                                  className="input payroll-editor__mode"
                                                  value={comp.mode}
                                                  onChange={(e) => setComponent(i, { mode: e.target.value as ComponentMode })}
                                                >
                                                  <option value="percent_of_wage">% of Wage</option>
                                                  <option value="percent_of_basic">% of Basic</option>
                                                  <option value="fixed">Fixed ₹</option>
                                                </select>
                                                <input
                                                  className="input payroll-editor__value"
                                                  type="number"
                                                  min={0}
                                                  value={comp.value}
                                                  onChange={(e) => setComponent(i, { value: e.target.value })}
                                                  aria-label={`${comp.label} ${modeLabel(comp.mode)}`}
                                                />
                                                <span className="payroll-editor__amount">{money(amount)}</span>
                                              </>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                    {preview && (
                                      <div className="payroll-editor__summary">
                                        <p className="dash-sub">
                                          Gross {money(preview.gross)} · Deductions {money(preview.totalDeductions)}{' '}
                                          (PF {money(preview.deductions[PF_KEY])}, Prof Tax {money(preview.deductions[PROF_TAX_KEY])})
                                        </p>
                                        <p className="dash-sub">
                                          Net <strong>{money(preview.net)}</strong>
                                          {!preview.withinWage && (
                                            <Badge tone="error" style={{ marginLeft: 8 }}>Exceeds wage</Badge>
                                          )}
                                        </p>
                                      </div>
                                    )}
                                    <span className="leave-actions payroll-editor__actions">
                                      <Button variant="outline" disabled={saving} onClick={() => setEdit(null)}>Cancel</Button>
                                      <Button disabled={saving || !preview?.withinWage} onClick={() => void save()}>
                                        {saving ? 'Saving…' : 'Save structure'}
                                      </Button>
                                    </span>
                                  </div>
                                  <div style={{ borderTop: '1px solid var(--color-hairline)', paddingTop: 'var(--space-base)', marginTop: 'var(--space-base)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                                    <span className="dash-sub" style={{ flexShrink: 0 }}>Download payslip</span>
                                    <select
                                      className="input"
                                      style={{ width: 'auto', height: 'var(--button-height)', minWidth: 160 }}
                                      value={slipMonth[who.id] ?? currentMonth}
                                      onChange={(e) => setSlipMonth((prev) => ({ ...prev, [who.id]: e.target.value }))}
                                      aria-label="Select payslip month"
                                    >
                                      {recentMonths.map((m) => (
                                        <option key={m.key} value={m.key}>{m.label}</option>
                                      ))}
                                    </select>
                                    <input
                                      type="month"
                                      className="input"
                                      style={{ width: 'auto', height: 'var(--button-height)' }}
                                      value={slipMonth[who.id] ?? currentMonth}
                                      max={currentMonth}
                                      onChange={(e) => setSlipMonth((prev) => ({ ...prev, [who.id]: e.target.value }))}
                                      aria-label="Custom month"
                                      title="Or pick a custom month"
                                    />
                                    <Button
                                      variant="outline"
                                      disabled={downloadingFor === who.id}
                                      onClick={() => void handleDownloadSlip(who.id)}
                                    >
                                      {downloadingFor === who.id ? 'Downloading…' : `Download PDF`}
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                    {pagination && <Pagination page={page} pages={pagination.pages} total={pagination.total} onPageChange={(p) => setSearchParams(p === 1 ? {} : { page: String(p) })} />}
                  </>
                ) : (
                  <p className="dash-sub">No salary structures yet — the first edit creates one.</p>
                )}
                <p className="dash-sub" style={{ marginTop: 12 }}>Click a row to edit its structure</p>
              </Card>
            </div>
          </>
        )}
      </div>
    </Sidebar>
  );
}
