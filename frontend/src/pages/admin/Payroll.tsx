import { Fragment, useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
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
import { useDelayedReady } from '../../hooks/useDelayedReady';
import { getAllPayroll, updatePayroll } from '../../api/payroll';
import type { PayrollStructureInput } from '../../api/payroll';
import { listEmployees } from '../../api/employees';
import type { Payroll, User } from '../../types';

const AVATAR_TONES = ['mint', 'peach', 'lavender', 'sky'];

interface Pair {
  label: string;
  amount: string;
}

interface EditState {
  userId: string;
  basic: string;
  allowances: Pair[];
  deductions: Pair[];
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

function toPairs(map?: Record<string, number>): Pair[] {
  return Object.entries(map ?? {}).map(([label, amount]) => ({ label, amount: String(amount) }));
}

function fromPairs(pairs: Pair[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const { label, amount } of pairs) {
    if (label.trim() && !Number.isNaN(Number(amount))) out[label.trim()] = Number(amount);
  }
  return out;
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
  const [records, setRecords] = useState<Payroll[] | null>(null);
  const [pagination, setPagination] = useState<{ total: number; pages: number } | null>(null);
  const [employees, setEmployees] = useState<User[]>([]);
  const [loadError, setLoadError] = useState('');
  const [edit, setEdit] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);

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

  function setPair(list: 'allowances' | 'deductions', index: number, field: keyof Pair) {
    return (e: ChangeEvent<HTMLInputElement>) =>
      setEdit((prev) =>
        prev
          ? {
              ...prev,
              [list]: prev[list].map((p, i) => (i === index ? { ...p, [field]: e.target.value } : p)),
            }
          : prev,
      );
  }

  function addPair(list: 'allowances' | 'deductions') {
    setEdit((prev) => (prev ? { ...prev, [list]: [...prev[list], { label: '', amount: '' }] } : prev));
  }

  function removePair(list: 'allowances' | 'deductions', index: number) {
    setEdit((prev) =>
      prev ? { ...prev, [list]: prev[list].filter((_, i) => i !== index) } : prev,
    );
  }

  function startEdit(record: Payroll) {
    setEdit({
      userId: employeeOf(record).id,
      basic: String(record.basicSalary),
      allowances: toPairs(record.allowances),
      deductions: toPairs(record.deductions),
    });
  }

  async function save() {
    if (!edit) return;
    const input: PayrollStructureInput = {
      basicSalary: Number(edit.basic) || 0,
      allowances: fromPairs(edit.allowances),
      deductions: fromPairs(edit.deductions),
    };
    setSaving(true);
    try {
      const updated = await updatePayroll(edit.userId, input);
      const who = employeeOf(updated);
      push(`Salary structure saved for ${who.name || who.email || who.id}`);
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
        { to: '/admin', label: 'Overview', icon: '◧' },
        { to: '/admin/employees', label: 'Employees', icon: '👥' },
        { to: '/admin/attendance', label: 'Attendance', icon: '🗓' },
        { to: '/admin/approvals', label: 'Approvals', icon: '✓' },
        { to: '/admin/payroll', label: 'Payroll', icon: '💵' },
      ]}
      commands={[
        { label: 'Overview', hint: 'page', to: '/admin' },
        { label: 'Employees', hint: 'page', to: '/admin/employees' },
        { label: 'Attendance', hint: 'page', to: '/admin/attendance' },
        { label: 'Leave approvals', hint: 'page', to: '/admin/approvals' },
        { label: 'Payroll', hint: 'page', to: '/admin/payroll' },
      ]}
    >
      <div className="container page">
        <div className="orb page__orb" aria-hidden />
        <ToastStack toasts={toasts} />

        {!ready ? (
          <div className="bento">
            <div className="skeleton-card bento__wide"><div className="skeleton-line skeleton-line--title" /><div className="skeleton-line skeleton-line--wide" /></div>
          </div>
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
              <Card className="bento__tall card--tint-lavender">
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
                                  <div className="row-detail__inner" style={{ flexWrap: 'wrap', gap: 16 }}>
                                    <div style={{ minWidth: 180 }}>
                                      <Input
                                        label="Basic salary"
                                        type="number"
                                        min={0}
                                        value={edit.basic}
                                        onChange={(e) => setEdit({ ...edit, basic: e.target.value })}
                                      />
                                    </div>
                                    {(['allowances', 'deductions'] as const).map((list) => (
                                      <div key={list} style={{ minWidth: 260 }}>
                                        <span className="field__label" style={{ display: 'block', marginBottom: 8 }}>
                                          {list[0].toUpperCase() + list.slice(1)}
                                        </span>
                                        {edit[list].map((pair, i) => (
                                          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                                            <input
                                              className="input"
                                              placeholder="Label"
                                              value={pair.label}
                                              onChange={setPair(list, i, 'label')}
                                            />
                                            <input
                                              className="input"
                                              type="number"
                                              min={0}
                                              placeholder="₹"
                                              value={pair.amount}
                                              onChange={setPair(list, i, 'amount')}
                                            />
                                            <Button variant="text" type="button" onClick={() => removePair(list, i)}>✕</Button>
                                          </div>
                                        ))}
                                        <Button variant="text" type="button" onClick={() => addPair(list)}>
                                          + Add {list.slice(0, -1)}
                                        </Button>
                                      </div>
                                    ))}
                                    <span className="leave-actions" style={{ marginLeft: 'auto', alignSelf: 'flex-end' }}>
                                      <Button variant="outline" disabled={saving} onClick={() => setEdit(null)}>Cancel</Button>
                                      <Button disabled={saving} onClick={() => void save()}>
                                        {saving ? 'Saving…' : 'Save structure'}
                                      </Button>
                                    </span>
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
