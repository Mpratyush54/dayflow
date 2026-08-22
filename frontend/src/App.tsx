import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import SignIn from './pages/auth/SignIn';
import SignUp from './pages/auth/SignUp';
import EmployeeDashboard from './pages/employee/Dashboard';
import Profile from './pages/employee/Profile';
import Attendance from './pages/employee/Attendance';
import Leaves from './pages/employee/Leaves';
import AdminDashboard from './pages/admin/Dashboard';
import Employees from './pages/admin/Employees';
import AdminAttendance from './pages/admin/Attendance';
import LeaveApprovals from './pages/admin/LeaveApprovals';
import Payroll from './pages/admin/Payroll';

// Sign-in/sign-up are owned by the auth workstream. Until that lands, a dev
// link under the auth pages opens the employee profile using a dev token
// (see src/utils/devUser.ts).
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/signin" replace />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/dashboard" element={<EmployeeDashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/leaves" element={<Leaves />} />
        <Route path="/payslip" element={<Profile />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/employees" element={<Employees />} />
        <Route path="/admin/attendance" element={<AdminAttendance />} />
        <Route path="/admin/approvals" element={<LeaveApprovals />} />
        <Route path="/admin/payroll" element={<Payroll />} />
        <Route path="*" element={<Navigate to="/signin" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
