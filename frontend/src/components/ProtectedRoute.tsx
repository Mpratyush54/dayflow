import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { Role } from '../types';

interface ProtectedRouteProps {
  /** When set, only these roles may enter; others land on their dashboard. */
  roles?: Role[];
}

export default function ProtectedRoute({ roles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) return null; // session restore in progress — flash nothing
  if (!user) return <Navigate to="/signin" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}
