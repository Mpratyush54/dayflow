import { useState } from 'react';
import AuthLayout from '../../components/layout/AuthLayout';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

export default function SignIn({ onSwitch }: { onSwitch: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); // TODO: call POST /api/auth/signin
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your DayFlow account">
      <form onSubmit={handleSubmit}>
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="form-error">{error}</p>}
        <Button type="submit" className="btn--block">Sign in</Button>
      </form>
      <p className="auth__alt">
        Don&apos;t have an account?{' '}
        <Button variant="text" type="button" onClick={onSwitch}>
          Sign up
        </Button>
      </p>
    </AuthLayout>
  );
}
