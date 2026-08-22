import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useTheme } from '../../context/theme-context';
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
  user: { name: string; role: string; initials: string };
  commands?: Command[];
  children: ReactNode;
}

export default function Sidebar({ items, user, commands = [], children }: SidebarProps) {
  const { theme, toggle } = useTheme();

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
          <span className="avatar avatar--mint">{user.initials}</span>
          <span>
            <span className="sidebar__username">{user.name}</span>
            <span className="sidebar__userrole">{user.role}</span>
          </span>
        </div>
      </aside>
      <div className="shell__main">{children}</div>
    </div>
  );
}
