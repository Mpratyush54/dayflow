import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useTheme } from '../../context/theme-context';
import { useAuth } from '../../context/AuthContext';
import CommandPalette from '../common/CommandPalette';
import type { Command } from '../common/CommandPalette';

export interface NavItem {
  to: string;
  label: string;
  icon: string;
  badge?: string;
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
  const { theme, toggle } = useTheme();
  const { user: authUser, signOut } = useAuth();

  const display = authUser
    ? {
        name: authUser.name?.trim() || authUser.email,
        role: `${authUser.role} · ${authUser.employeeId}`,
        initials: initialsOf(authUser.name?.trim() || authUser.email),
      }
    : user;

  return (
    <div className="shell">
      <CommandPalette commands={commands} />
      <aside className="sidebar">
        <a className="sidebar__brand" href="#">
          <span className="sidebar__logo" aria-hidden /> DayFlow
        </a>
        <button className="sidebar__cmdk" onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}>
          <span aria-hidden>⌕</span> Quick jump
          <kbd>Ctrl K</kbd>
        </button>
        <nav className="sidebar__nav">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
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
        <div className="sidebar__user">
          <span className="avatar avatar--mint">{display.initials}</span>
          <span>
            <span className="sidebar__username">{display.name}</span>
            <span className="sidebar__userrole">{display.role}</span>
          </span>
          <button type="button" className="sidebar__signout" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </aside>
      <div className="shell__main">{children}</div>
    </div>
  );
}
