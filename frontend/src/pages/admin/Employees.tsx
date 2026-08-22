import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Pagination from '../../components/common/Pagination';
import { createEmployee, listEmployees } from '../../api/employees';
import type { CreatedEmployee } from '../../api/employees';
import type { Role, User } from '../../types';
import { useToasts } from '../../hooks/useToasts';
import { ToastStack } from '../../components/common/Toast';

function initialsOf(name: string) {
  return name.split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase() || '?';
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="copy-row">
      <span className="copy-row__label">{label}</span>
      <code className="copy-row__value">{value}</code>
      <Button
        variant="outline"
        onClick={async () => {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? 'Copied ✓' : 'Copy'}
      </Button>
    </div>
  );
}

export default function EmployeeList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(Number(searchParams.get('page') || 1), 1);
  const { toasts, push } = useToasts();
  const [form, setForm] = useState<{ firstName: string; lastName: string; email: string; role: Role }>({
    firstName: '', lastName: '', email: '', role: 'EMPLOYEE',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [created, setCreated] = useState<CreatedEmployee | null>(null);
  const [employees, setEmployees] = useState<User[] | null>(null);
  const [pagination, setPagination] = useState<{ total: number; pages: number } | null>(null);

  useEffect(() => {
    listEmployees(page, 10)
      .then((res) => {
        if (Array.isArray(res)) {
          setEmployees(res);
          setPagination(null);
        } else {
          setEmployees(res.data);
          setPagination({ total: res.total, pages: res.pages });
        }
      })
      .catch(() => setEmployees([]));
  }, [page]);

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }));
  }

  function openModal() {
    setCreated(null);
    setError('');
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setCreated(null);
    setForm({ firstName: '', lastName: '', email: '', role: 'EMPLOYEE' });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const result = await createEmployee(form);
      setCreated(result);
      push(`Created ${result.employeeId}`);
      setEmployees(prev => (prev ? [result.user, ...prev] : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create employee');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sidebar
      user={{ name: 'HR Officer', role: 'HR', initials: 'HR' }}
      items={[
        { to: '/admin', label: 'Overview', icon: '◧', end: true },
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
        { label: 'Create employee', hint: 'action', to: '/admin/employees' },
        { label: 'Employee view', hint: 'demo', to: '/dashboard' },
      ]}
    >
      <div className="container page">
        <div className="orb page__orb" aria-hidden />
        <ToastStack toasts={toasts} />

        <div className="dash-head">
          <div>
            <p className="dash-sub">People</p>
            <h1>Employees</h1>
          </div>
          <div className="hero-actions">
            <Button variant="outline" onClick={() => navigate('/admin')}>Back to overview</Button>
            <Button onClick={openModal}>＋ Create employee</Button>
          </div>
        </div>

        <Card className="table-card" heading={`All employees${pagination ? ` (${pagination.total})` : employees ? ` (${employees.length})` : ''}`}>
          {employees === null ? (
            <div className="skeleton-card" style={{ border: 'none', background: 'transparent', padding: 0 }}>
              <div className="skeleton-line skeleton-line--wide" />
              <div className="skeleton-line skeleton-line--wide" />
              <div className="skeleton-line" />
            </div>
          ) : employees.length === 0 ? (
            <p className="dash-sub">No employees yet — create the first one with the button above.</p>
          ) : (
            <>
              <table className="table">
                <thead>
                  <tr><th>Employee ID</th><th>Name</th><th>Email</th><th>Role</th><th>Verified</th></tr>
                </thead>
                <tbody>
                  {employees.map(e => (
                    <tr key={e.id}>
                      <td className="table-mono">{e.employeeId}</td>
                      <td>
                        <span className="cell-name">
                          <span className="avatar avatar--lavender">{initialsOf(e.name || e.email)}</span>
                          {e.name || '—'}
                        </span>
                      </td>
                      <td className="table-mono">{e.email}</td>
                      <td>{e.role}</td>
                      <td>
                        <Badge tone={e.isVerified ? 'success' : 'neutral'}>
                          {e.isVerified ? 'yes' : 'pending'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {pagination && (
                <Pagination page={page} pages={pagination.pages} total={pagination.total} onPageChange={(p) => setSearchParams(p === 1 ? {} : { page: String(p) })} />
              )}
            </>
          )}
        </Card>
      </div>

      {modalOpen && (
        <div className="modal__backdrop" onClick={closeModal}>
          <div className="modal" role="dialog" aria-label="Create employee" onClick={e => e.stopPropagation()}>
            {created ? (
              <>
                <h3 className="modal__title">Account created</h3>
                <p className="dash-sub" style={{ marginTop: 0 }}>
                  Share these with the employee — the password will not be shown again.
                </p>
                <div className="modal__dark">
                  <CopyRow label="Employee ID" value={created.employeeId} />
                  <CopyRow label="One-time password" value={created.generatedPassword} />
                  {created.verificationUrl && (
                    <p className="dash-sub" style={{ marginBottom: 0, wordBreak: 'break-all' }}>
                      Dev only — verification link: {created.verificationUrl}
                    </p>
                  )}
                </div>
                <div className="modal__actions">
                  <Button variant="outline" onClick={closeModal}>Done</Button>
                </div>
              </>
            ) : (
              <>
                <h3 className="modal__title">Create employee</h3>
                <p className="dash-sub" style={{ marginTop: 0 }}>
                  The Employee ID and a one-time password are generated automatically.
                </p>
                <form onSubmit={handleSubmit}>
                  <div className="form-grid-2">
                    <Input label="First name" value={form.firstName} onChange={update('firstName')} required />
                    <Input label="Last name" value={form.lastName} onChange={update('lastName')} required />
                  </div>
                  <Input label="Email" type="email" value={form.email} onChange={update('email')} required />
                  <div className="field">
                    <label className="field__label" htmlFor="role">Role</label>
                    <select id="role" className="input" value={form.role} onChange={update('role')}>
                      <option value="EMPLOYEE">Employee</option>
                      <option value="HR">HR</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>
                  {error && <p className="form-error">{error}</p>}
                  <div className="modal__actions">
                    <Button variant="outline" type="button" onClick={closeModal}>Cancel</Button>
                    <Button type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create'}</Button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </Sidebar>
  );
}
