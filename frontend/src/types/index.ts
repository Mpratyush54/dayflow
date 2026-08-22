export type Role = 'EMPLOYEE' | 'HR' | 'ADMIN';

export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN';
export type EmploymentStatus = 'ACTIVE' | 'ON_LEAVE' | 'RESIGNED';

export interface SalaryStructure {
  basicSalary: number;
  currency: string;
  allowances?: Record<string, number>;
  deductions?: Record<string, number>;
}

export interface EmployeeDocument {
  id: string;
  name: string;
  url: string;
  uploadedAt: string;
}

export interface User {
  id: string;
  employeeId: string;
  email: string;
  role: Role;
  name?: string;
  phone?: string;
  address?: string;
  profilePicture?: string;
  isVerified?: boolean;
}

export interface EmployeeProfile extends User {
  dateOfBirth?: string;
  designation?: string;
  department?: string;
  employmentType?: EmploymentType;
  dateOfJoining?: string;
  workLocation?: string;
  status?: EmploymentStatus;
  salary?: SalaryStructure;
  documents?: EmployeeDocument[];
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

/** One day in the attendance window; gaps come back with status null */
export interface AttendanceDay {
  id?: string;
  date: string;
  weekday: string;
  checkIn: string | null;
  checkOut: string | null;
  status: 'PRESENT' | 'HALF_DAY' | null;
  workedHours: number;
}

export interface AttendanceSummary {
  workdays: number;
  present: number;
  halfDay: number;
  absent: number;
  hours: number;
  rate: number | null;
}

export interface AttendanceWindow {
  range: { from: string; to: string; days: number };
  days: AttendanceDay[];
  summary: AttendanceSummary;
}

export interface TeamAttendanceRow {
  user: User & { status?: string };
  checkIn: string | null;
  checkOut: string | null;
  status: 'PRESENT' | 'HALF_DAY' | 'ABSENT';
  workedHours: number;
}

export interface TeamAttendance {
  date: string;
  isWeekend: boolean;
  rows: TeamAttendanceRow[];
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
