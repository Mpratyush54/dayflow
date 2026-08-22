import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute from './components/ProtectedRoute';

const SignIn = lazy(() => import('./pages/auth/SignIn'));
const VerifyEmail = lazy(() => import('./pages/auth/VerifyEmail'));
const ChangePassword = lazy(() => import('./pages/auth/ChangePassword'));
const EmployeeDashboard = lazy(() => import('./pages/employee/Dashboard'));
const Profile = lazy(() => import('./pages/employee/Profile'));
const Attendance = lazy(() => import('./pages/employee/Attendance'));
const Leaves = lazy(() => import('./pages/employee/Leaves'));
const Payslip = lazy(() => import('./pages/employee/Payslip'));
const Landing = lazy(() => import('./pages/Landing'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const Employees = lazy(() => import('./pages/admin/Employees'));
const AdminAttendance = lazy(() => import('./pages/admin/Attendance'));
const LeaveApprovals = lazy(() => import('./pages/admin/LeaveApprovals'));
const Payroll = lazy(() => import('./pages/admin/Payroll'));
const Reports = lazy(() => import('./pages/admin/Reports'));

function PageFallback() {
  return (
    <div className="container page" style={{ paddingTop: 'var(--space-xl)' }}>
      <div className="skeleton-card" style={{ maxWidth: 480 }}>
        <div className="skeleton-line skeleton-line--title" />
        <div className="skeleton-line skeleton-line--wide" />
        <div className="skeleton-line" />
      </div>
    </div>
  );
}

// There is no public sign-up: HR/Admin create accounts via POST /api/employees
// (employeeId + one-time password are system-generated).
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/verify-email" element={<VerifyEmail />} />

            {/* Any signed-in user */}
            <Route element={<ProtectedRoute />}>
              <Route path="/change-password" element={<ChangePassword />} />
              <Route path="/dashboard" element={<EmployeeDashboard />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/attendance" element={<Attendance />} />
              <Route path="/leaves" element={<Leaves />} />
              <Route path="/payslip" element={<Payslip />} />
            </Route>

            {/* HR / ADMIN only */}
            <Route element={<ProtectedRoute roles={['HR', 'ADMIN']} />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/employees" element={<Employees />} />
              <Route path="/admin/attendance" element={<AdminAttendance />} />
              <Route path="/admin/approvals" element={<LeaveApprovals />} />
              <Route path="/admin/payroll" element={<Payroll />} />
              <Route path="/admin/reports" element={<Reports />} />
            </Route>

            <Route path="*" element={<Navigate to="/signin" replace />} />
          </Routes>
        </Suspense>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
