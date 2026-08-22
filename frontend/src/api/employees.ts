import { api } from './client';
import type { EmployeeProfile, Role, User } from '../types';

export function getEmployee(id: string) {
  return api.get<EmployeeProfile>(`/employees/${id}`);
}

export interface CreatedEmployee {
  message: string;
  employeeId: string;
  generatedPassword: string;
  user: User;
  verificationUrl?: string;
}

// HR/ADMIN only — the backend generates the employeeId and one-time password
export function createEmployee(input: { firstName: string; lastName: string; email: string; role?: Role }) {
  return api.post<CreatedEmployee>('/employees', input);
}

export function listEmployees() {
  return api.get<User[]>('/employees');
}
