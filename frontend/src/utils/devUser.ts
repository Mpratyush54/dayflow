import type { Role } from '../types';

export interface CurrentUser {
  id: string;
  role: Role;
}

const ROLES: Role[] = ['EMPLOYEE', 'HR', 'ADMIN'];

// DEV-ONLY. Derives the current user from the dev token in localStorage
// (base64 JSON { id, role } — `npm run seed` in backend/ prints ready-made
// tokens). The auth module will replace this with a real session.
export function getCurrentUser(): CurrentUser | null {
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token)) as { id?: unknown; role?: unknown };
    if (typeof payload.id === 'string' && ROLES.includes(payload.role as Role)) {
      return { id: payload.id, role: payload.role as Role };
    }
  } catch {
    // malformed token — treat as signed out
  }
  return null;
}
