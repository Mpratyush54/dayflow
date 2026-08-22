import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../../components/layout/AuthLayout';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { useAuth } from '../../context/AuthContext';
import type { SignUpResponse } from '../../api/client';

const PASSWORD_RULES: Array<{ label: string; test: (pw: string) => boolean }> = [
  { label: '8+ characters', test: (pw) => pw.length >= 8 },
  { label: 'Uppercase letter', test: (pw) => /[A-Z]/.test(pw) },
  { label: 'Lowercase letter', test: (pw) => /[a-z]/.test(pw) },
  { label: 'Number', test: (pw) => /[0-9]/.test(pw) },
  { label: 'Special character', test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

export default function SignUp() {
  const { signUp } = useAuth();
  const [form, setForm] = useState({ employeeId: '', email: '', password: '', role: 'EMPLOYEE' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<SignUpResponse | null>(null);

  const ruleState = useMemo(
    () => PASSWORD_RULES.map((rule) => ({ ...rule, ok: rule.test(form.password) })),
    [form.password],
  );

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm({ ...form, [field]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await signUp({
        employeeId: form.employeeId,
        email: form.email,
        password: form.password,
        role: form.role === 'HR' ? 'HR' : 'EMPLOYEE',
      });
      setCreated(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign up — try again');
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
    // No SMTP yet: outside production the API returns the verification link.
    const verifyPath = created.verificationUrl
      ? new URL(created.verificationUrl).searchParams.get('token')
      : null;

    return (
      <AuthLayout title="Check your inbox" subtitle={created.message}>
        <div className="auth__panel animate-in">
          <p className="form-success">
            We sent a verification link to <strong>{created.user.email}</strong>. Verify your
            email to activate your account, then sign in.
          </p>
          {verifyPath && (
            <p className="auth__alt">
              Dev mode (no SMTP):{' '}
              <Link className="auth__devlink" to={`/verify-email?token=${verifyPath}`}>
                open the verification link now →
              </Link>
            </p>
          )}
          <p className="auth__alt">
            Already verified? <Link to="/signin">Sign in</Link>
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Create your account" subtitle="Join your organization on DayFlow">
      <form onSubmit={handleSubmit}>
        <Input label="Employee ID" value={form.employeeId} onChange={update('employeeId')} required />
        <Input label="Email" type="email" value={form.email} onChange={update('email')} required />
        <Input label="Password" type="password" value={form.password} onChange={update('password')} minLength={8} required />
        <ul className="pw-rules" aria-label="Password requirements">
          {ruleState.map((rule) => (
            <li key={rule.label} className={rule.ok ? 'pw-rules__item is-ok' : 'pw-rules__item'}>
              {rule.label}
            </li>
          ))}
        </ul>
        <div className="field">
          <label className="field__label" htmlFor="role">Role</label>
          <select id="role" className="input" value={form.role} onChange={update('role')}>
            <option value="EMPLOYEE">Employee</option>
            <option value="HR">HR / Admin</option>
          </select>
        </div>
        {error && <p className="form-error">{error}</p>}
        <Button type="submit" className="btn--block" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Sign up'}
        </Button>
      </form>
      <p className="auth__alt">
        Already have an account? <Link to="/signin">Sign in</Link>
      </p>
    </AuthLayout>
  );
}
