import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/layout/AuthLayout';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

export default function SignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); // TODO: call POST /api/auth/signin, then navigate by role
    navigate('/dashboard');
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
        Don&apos;t have an account? <Link to="/signup">Sign up</Link>
      </p>
      <p className="auth__alt">
        <Link to="/admin">Demo: admin view →</Link>
      </p>
    </AuthLayout>
  );
}
