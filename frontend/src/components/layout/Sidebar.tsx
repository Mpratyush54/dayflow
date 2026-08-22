import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

export interface NavItem {
  to: string;
  label: string;
  icon: string;
  badge?: string;
}

interface SidebarProps {
  items: NavItem[];
  user: { name: string; role: string; initials: string };
  children: ReactNode;
}

export default function Sidebar({ items, user, children }: SidebarProps) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <a className="sidebar__brand" href="#">
          <span className="sidebar__logo" aria-hidden /> DayFlow
        </a>
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
