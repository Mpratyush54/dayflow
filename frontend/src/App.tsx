import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import SignIn from './pages/auth/SignIn';
import VerifyEmail from './pages/auth/VerifyEmail';
import ChangePassword from './pages/auth/ChangePassword';
import EmployeeDashboard from './pages/employee/Dashboard';
import Profile from './pages/employee/Profile';
import Attendance from './pages/employee/Attendance';
import Leaves from './pages/employee/Leaves';
import Payslip from './pages/employee/Payslip';
import AdminDashboard from './pages/admin/Dashboard';
import Employees from './pages/admin/Employees';
import AdminAttendance from './pages/admin/Attendance';
import LeaveApprovals from './pages/admin/LeaveApprovals';
import Payroll from './pages/admin/Payroll';

// There is no public sign-up: HR/Admin create accounts via POST /api/employees
// (employeeId + one-time password are system-generated).
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/signin" replace />} />
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
          </Route>

          <Route path="*" element={<Navigate to="/signin" replace />} />
        </Routes>
      </AuthProvider>
e560b9 (feat: payroll module — read-only salary view + admin structure editor with revision trail)
    </BrowserRouter>
  );
}
