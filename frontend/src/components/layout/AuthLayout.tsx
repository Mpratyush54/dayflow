import type { ReactNode } from 'react';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export default function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <main className="auth">
      <div className="orb auth__orb" aria-hidden />
      <div className="auth__panel">
        <h1 className="auth__title">{title}</h1>
        {subtitle && <p className="auth__subtitle">{subtitle}</p>}
        {children}
      </div>
    </main>
  );
}
