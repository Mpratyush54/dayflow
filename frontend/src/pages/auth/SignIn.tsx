import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/layout/AuthLayout';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { useAuth } from '../../hooks/useAuth';

const DEMO_PASSWORD = 'Dayflow!2026';

const DEMO_ACCOUNTS = [
  { role: 'Demo employee', email: 'demo@dayflow.dev', hint: 'Clean slate — apply leave, check in, explore' },
  { role: 'HR', email: 'meera@dayflow.dev', hint: 'Approvals, payroll, team views' },
  { role: 'Admin', email: 'admin@dayflow.dev', hint: 'Full admin access' },
] as const;

export default function SignIn() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { user, mustChangePassword } = await signIn(email, password);
      navigate(
        mustChangePassword
          ? '/change-password'
          : user.role === 'EMPLOYEE'
            ? '/dashboard'
            : '/admin',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in — try again');
    } finally {
      setSubmitting(false);
    }
  }

  function fillDemo(accountEmail: string) {
    setEmail(accountEmail);
    setPassword(DEMO_PASSWORD);
    setError('');
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your DayFlow account">
      <form onSubmit={handleSubmit}>
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="form-error">{error}</p>}
        <Button type="submit" className="btn--block" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <div className="auth__demo animate-in">
        <p className="auth__demo-title">Demo accounts</p>
        <p className="auth__demo-sub">Password for all: <code>{DEMO_PASSWORD}</code> · run <code>npm run seed</code> in <code>backend/</code> to load sample data</p>
        <ul className="auth__demo-list">
          {DEMO_ACCOUNTS.map((account) => (
            <li key={account.email}>
              <button
                type="button"
                className="auth__demo-btn"
                onClick={() => fillDemo(account.email)}
              >
                <span className="auth__demo-role">{account.role}</span>
                <span className="auth__demo-email">{account.email}</span>
                <span className="auth__demo-hint">{account.hint}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <p className="auth__alt">
        Don&apos;t have an account? Accounts are created by HR — ask your HR officer.
      </p>
    </AuthLayout>
  );
}
