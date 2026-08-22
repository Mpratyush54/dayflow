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
