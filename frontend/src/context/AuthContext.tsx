import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  authApi,
  refreshAccessToken,
  setAccessToken,
} from '../api/client';
import type { User } from '../types';
import { AuthContext } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore the session on boot: silent refresh via the httpOnly cookie,
  // then load the profile with the new access token.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await refreshAccessToken();
      if (token) {
        try {
          const { user: me } = await authApi.me();
          if (!cancelled) setUser(me);
        } catch {
          setAccessToken(null);
        }
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const data = await authApi.signIn({ email, password });
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await authApi.signOut();
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, signIn, signOut }),
    [user, loading, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

