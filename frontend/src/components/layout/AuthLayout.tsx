import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/theme-context';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export default function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  const { theme } = useTheme();

  return (
    <main className="auth">
      <div className="orb auth__orb" aria-hidden />
      <div className="auth__panel">
        <div className="auth__brand-wrap">
          <Link to="/" className="auth__brand">
            <img
              src={theme === 'dark' ? '/logo-black.jpeg' : '/logo-light.jpeg'}
              alt="DayFlow"
              className="auth__logo-img"
            />
          </Link>
        </div>
        <h1 className="auth__title">{title}</h1>
        {subtitle && <p className="auth__subtitle">{subtitle}</p>}
        {children}
      </div>
    </main>
  );
}
