import type { ReactNode } from 'react';

interface AppLayoutProps {
  brand?: string;
  links?: ReactNode;
  children: ReactNode;
}

export default function AppLayout({ brand = 'DayFlow', links, children }: AppLayoutProps) {
  return (
    <>
      <header className="top-nav">
        <a className="top-nav__brand" href="#">{brand}</a>
        <nav className="top-nav__links">{links}</nav>
      </header>
      <main className="container page">{children}</main>
    </>
  );
}
