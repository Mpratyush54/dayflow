import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/layout/AuthLayout';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { authApi } from '../../api/client';
import { useAuth } from '../../hooks/useAuth';

export default function ChangePassword() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (next !== confirm) {
      setError('New passwords do not match');
      return;
    }
    setBusy(true);
    try {
      await authApi.changePassword({ currentPassword: current, newPassword: next });
      navigate(user?.role === 'EMPLOYEE' ? '/dashboard' : '/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update password');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title="Set a new password"
      subtitle="Your account uses a system-generated password — choose your own to continue"
    >
      <form onSubmit={handleSubmit}>
        <Input label="Current password" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
        <Input label="New password" type="password" value={next} onChange={(e) => setNext(e.target.value)} minLength={8} required />
        <Input label="Confirm new password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={8} required />
        {error && <p className="form-error">{error}</p>}
        <p className="auth__alt" style={{ textAlign: 'left', marginTop: 0, marginBottom: 16 }}>
          Min 8 characters with upper &amp; lower case, a number and a special character.
        </p>
        <Button type="submit" className="btn--block" disabled={busy}>
          {busy ? 'Updating…' : 'Update password'}
        </Button>
      </form>
      <p className="auth__alt">
        <Button variant="text" type="button" onClick={async () => { await signOut(); navigate('/signin'); }}>
          Sign out instead
        </Button>
      </p>
    </AuthLayout>
  );
}
