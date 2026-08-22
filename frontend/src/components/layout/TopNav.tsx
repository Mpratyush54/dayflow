import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/theme-context';
import { useAuth } from '../../hooks/useAuth';
import CommandPalette from '../common/CommandPalette';
import NotificationCenter from '../common/NotificationCenter';
import type { Command } from '../common/CommandPalette';
import type { NavItem } from './Sidebar';

interface TopNavProps {
  items: NavItem[];
  user: { name: string; role: string; initials: string };
  commands?: Command[];
  children: ReactNode;
}

function initialsOf(name: string) {
  return name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}

export default function TopNav({ items, user, commands = [], children }: TopNavProps) {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const { user: authUser, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const display = authUser
    ? {
        name: authUser.name?.trim() || authUser.email,
        role: `${authUser.role} · ${authUser.employeeId}`,
        initials: initialsOf(authUser.name?.trim() || authUser.email),
      }
    : user;

  useEffect(() => {
    if (!menuOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [menuOpen]);

  // close mobile on resize to desktop
  useEffect(() => {
    function onResize() {
      if (window.innerWidth > 900) setMobileOpen(false);
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const home = authUser?.role === 'ADMIN' || authUser?.role === 'HR' ? '/admin' : '/dashboard';

  return (
    <div className="shell shell--top">
      <CommandPalette commands={commands} />
      <header className="top-nav">
        <div className="top-nav__inner">
          <Link to={home} className="top-nav__brand" onClick={() => setMobileOpen(false)}>
            <img
              src={theme === 'dark' ? '/logo-black.jpeg' : '/logo-light.jpeg'}
              alt="DayFlow"
              className="top-nav__logo-img"
            />
          </Link>

          <nav className="top-nav__links" aria-label="Primary">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `top-nav__link ${isActive ? 'is-active' : ''}`}
              >
                <span className="top-nav__icon" aria-hidden>
                  {item.icon}
                </span>
                {item.label}
                {item.badge && <span className="top-nav__badge">{item.badge}</span>}
              </NavLink>
            ))}
          </nav>

          <div className="top-nav__actions">
            <button
              type="button"
              className="top-nav__search"
              aria-label="Search"
              onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
            >
              <span aria-hidden>⌕</span>
              <span className="top-nav__search-text">Search</span>
              <kbd>Ctrl K</kbd>
            </button>

            <NotificationCenter />

            <button
              type="button"
              className="top-nav__theme"
              onClick={toggle}
              aria-label="Toggle dark mode"
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              <span aria-hidden>{theme === 'dark' ? '☀' : '☾'}</span>
            </button>

            <div className="top-nav__user" ref={menuRef}>
              <button
                type="button"
                className="top-nav__avatar-trigger"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                onClick={() => setMenuOpen((v) => !v)}
              >
                <span className="avatar avatar--mint">{display.initials}</span>
                <span className="top-nav__user-caret" aria-hidden>
                  {menuOpen ? '▴' : '▾'}
                </span>
              </button>
              {menuOpen && (
                <div className="top-nav__menu" role="menu">
                  <div className="top-nav__menu-head">
                    <span className="top-nav__menu-name">{display.name}</span>
                    <span className="top-nav__menu-role">{display.role}</span>
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    className="top-nav__menu-item"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate('/profile');
                    }}
                  >
                    My profile
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="top-nav__menu-item top-nav__menu-item--danger"
                    onClick={() => {
                      setMenuOpen(false);
                      void signOut();
                    }}
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            className="top-nav__hamburger"
            aria-label="Open navigation"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            <span aria-hidden>{mobileOpen ? '✕' : '☰'}</span>
          </button>
        </div>

        {mobileOpen && (
          <div className="top-nav__drawer" role="dialog" aria-label="Navigation">
            <nav className="top-nav__drawer-nav">
              {items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) => `top-nav__drawer-link ${isActive ? 'is-active' : ''}`}
                >
                  <span aria-hidden>{item.icon}</span> {item.label}
                  {item.badge && <span className="top-nav__badge">{item.badge}</span>}
                </NavLink>
              ))}
            </nav>
            <button
              type="button"
              className="top-nav__search top-nav__search--mobile"
              onClick={() => {
                setMobileOpen(false);
                window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
              }}
            >
              <span aria-hidden>⌕</span> Search <kbd>Ctrl K</kbd>
            </button>
          </div>
        )}
      </header>
      {mobileOpen && (
        <button
          type="button"
          className="top-nav__overlay"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <div className="shell__main">{children}</div>
    </div>
  );
}
