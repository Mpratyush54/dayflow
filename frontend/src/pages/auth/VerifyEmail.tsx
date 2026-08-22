import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AuthLayout from '../../components/layout/AuthLayout';
import { api } from '../../api/client';

type State = 'working' | 'ok' | 'error';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  // Missing token is known at first render — no synchronous setState in the effect
  const [state, setState] = useState<State>(token ? 'working' : 'error');
  const [message, setMessage] = useState(
    token ? '' : 'Verification token is missing from the link.',
  );

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    api
      .get<{ message: string }>(`/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then((data) => {
        if (cancelled) return;
        setState('ok');
        setMessage(data.message);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState('error');
        setMessage(err instanceof Error ? err.message : 'Verification failed');
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <AuthLayout
      title={state === 'ok' ? 'Email verified' : state === 'error' ? 'Something went wrong' : 'Verifying your email'}
      subtitle={state === 'working' ? 'One moment while we confirm your address…' : undefined}
    >
      <div className="animate-in">
        {state === 'ok' && <p className="form-success">{message}</p>}
        {state === 'error' && <p className="form-error">{message}</p>}
        {state !== 'working' && (
          <p className="auth__alt">
            <Link to="/signin">Go to sign in →</Link>
          </p>
        )}
      </div>
    </AuthLayout>
  );
}
