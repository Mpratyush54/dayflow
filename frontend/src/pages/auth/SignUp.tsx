import { useState } from 'react';
import AuthLayout from '../../components/layout/AuthLayout';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

export default function SignUp({ onSwitch }: { onSwitch: () => void }) {
  const [form, setForm] = useState({ employeeId: '', email: '', password: '', role: 'EMPLOYEE' });
  const [error, setError] = useState('');

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm({ ...form, [field]: e.target.value });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); // TODO: call POST /api/auth/signup
  }

  return (
    <AuthLayout title="Create your account" subtitle="Join your organization on DayFlow">
      <form onSubmit={handleSubmit}>
        <Input label="Employee ID" value={form.employeeId} onChange={update('employeeId')} required />
        <Input label="Email" type="email" value={form.email} onChange={update('email')} required />
        <Input label="Password" type="password" value={form.password} onChange={update('password')} minLength={8} required />
        <div className="field">
          <label className="field__label" htmlFor="role">Role</label>
          <select id="role" className="input" value={form.role} onChange={update('role')}>
            <option value="EMPLOYEE">Employee</option>
            <option value="HR">HR / Admin</option>
          </select>
        </div>
        {error && <p className="form-error">{error}</p>}
        <Button type="submit" className="btn--block">Sign up</Button>
      </form>
      <p className="auth__alt">
        Already have an account?{' '}
        <Button variant="text" type="button" onClick={onSwitch}>
          Sign in
        </Button>
      </p>
    </AuthLayout>
  );
}
