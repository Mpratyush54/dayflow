import type { ReactNode } from 'react';
import TopNav from './TopNav';
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

/** Sidebar now delegates to TopNav (240px → top nav migration #83). Retained for backward compat. */
export default function Sidebar(props: SidebarProps) {
  return <TopNav {...props} />;
}
