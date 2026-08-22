import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/theme-context';
import { useAuth } from '../../hooks/useAuth';
import CommandPalette from '../common/CommandPalette';
import NotificationCenter from '../common/NotificationCenter';
import type { Command } from '../common/CommandPalette';

export interface NavItem {
  to: string;
  label: string;
  icon: string;
  badge?: string;
  /** Exact match — set on overview/dashboard links so they don't stay
   *  highlighted while a nested route (e.g. /admin/employees) is open */
  end?: boolean;
}

interface SidebarProps {
  items: NavItem[];
  /** Display fallback when no signed-in user is available (demo data). */
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

export default function Sidebar({ items, user, commands = [], children }: SidebarProps) {
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

  return (
    <div className="shell">
      <CommandPalette commands={commands} />
      <button
        type="button"
        className="sidebar__mobile-toggle"
        aria-label="Open navigation"
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen((v) => !v)}
      >
        <span aria-hidden>{mobileOpen ? '✕' : '☰'}</span>
      </button>
      {mobileOpen && (
        <button
          type="button"
          className="sidebar__overlay"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside className={`sidebar ${mobileOpen ? 'is-open' : ''}`}>
        <div className="sidebar__header">
          <Link
            to={authUser?.role === 'ADMIN' || authUser?.role === 'HR' ? '/admin' : '/dashboard'}
            className="sidebar__brand"
            onClick={() => setMobileOpen(false)}
          >
            <img
              src={theme === 'dark' ? '/logo-black.jpeg' : '/logo-light.jpeg'}
              alt="DayFlow"
              className="sidebar__logo-img"
            />
          </Link>
          <NotificationCenter />
        </div>
        <button className="sidebar__cmdk" onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}>
          <span aria-hidden>⌕</span> Quick jump
          <kbd>Ctrl K</kbd>
        </button>
        <nav className="sidebar__nav">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => `sidebar__link ${isActive ? 'is-active' : ''}`}
            >
              <span className="sidebar__icon" aria-hidden>{item.icon}</span>
              {item.label}
              {item.badge && <span className="sidebar__badge">{item.badge}</span>}
            </NavLink>
          ))}
        </nav>
        <button className="sidebar__theme" onClick={toggle} aria-label="Toggle dark mode">
          <span aria-hidden>{theme === 'dark' ? '☀' : '☾'}</span>
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>
        <div className="sidebar__user" ref={menuRef}>
          <button
            type="button"
            className="sidebar__user-trigger"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className="avatar avatar--mint">{display.initials}</span>
            <span className="sidebar__user-text">
              <span className="sidebar__username">{display.name}</span>
              <span className="sidebar__userrole">{display.role}</span>
            </span>
            <span className="sidebar__user-caret" aria-hidden>{menuOpen ? '▴' : '▾'}</span>
          </button>
          {menuOpen && (
            <div className="sidebar__menu" role="menu">
              <button
                type="button"
                role="menuitem"
                className="sidebar__menu-item"
                onClick={() => {
                  setMenuOpen(false);
                  setMobileOpen(false);
                  navigate('/profile');
                }}
              >
                My profile
              </button>
              <button
                type="button"
                role="menuitem"
                className="sidebar__menu-item sidebar__menu-item--danger"
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
      </aside>
      <div className="shell__main">{children}</div>
    </div>
  );
}
