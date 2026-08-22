export type Role = 'EMPLOYEE' | 'HR' | 'ADMIN';

export interface User {
  id: string;
  employeeId: string;
  email: string;
  role: Role;
  name?: string;
  phone?: string;
  address?: string;
  profilePicture?: string;
}

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE';

export interface AttendanceRecord {
  id: string;
  userId: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: AttendanceStatus;
}

export type LeaveType = 'PAID' | 'SICK' | 'UNPAID';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface LeaveRequest {
  id: string;
  userId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  remarks?: string;
  status: LeaveStatus;
  reviewerComment?: string;
}

export interface Payroll {
  userId: string;
  basicSalary: number;
  allowances?: Record<string, number>;
  deductions?: Record<string, number>;
}
