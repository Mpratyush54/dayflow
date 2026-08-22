import { api, getAccessToken, refreshAccessToken, ApiError } from './client';
import type { EmployeeProfile, Role, User } from '../types';

export interface DirectoryEntry extends User {
  presence: 'present' | 'leave' | 'absent';
}

export function getEmployeeDirectory() {
  return api.get<DirectoryEntry[]>('/employees/directory');
}

export function getEmployee(id: string) {
  return api.get<EmployeeProfile>(`/employees/${id}`);
}

export type EmployeePatch = Partial<
  Pick<
    EmployeeProfile,
    | 'name'
    | 'phone'
    | 'address'
    | 'profilePicture'
    | 'designation'
    | 'department'
    | 'workLocation'
    | 'nationality'
    | 'personalEmail'
    | 'gender'
    | 'maritalStatus'
    | 'bankAccountNo'
    | 'bankName'
    | 'ifsc'
    | 'pan'
    | 'uan'
    | 'empCode'
  > & {
    dateOfBirth?: string;
    dateOfJoining?: string;
    isVerified?: boolean;
    status?: 'ACTIVE' | 'ON_LEAVE' | 'RESIGNED';
  }
>;

// Self-edit of allowed fields (admins may edit more server-side)
export function updateEmployee(id: string, patch: EmployeePatch) {
  return api.patch<EmployeeProfile>(`/employees/${id}`, patch);
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

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  pages: number;
  limit: number;
}

export function listEmployees(): Promise<User[]>;
export function listEmployees(page: number, limit?: number, q?: string): Promise<Paginated<User>>;
export function listEmployees(page?: number, limit?: number, q?: string): Promise<User[] | Paginated<User>> {
  const qs = new URLSearchParams();
  if (page) qs.set('page', String(page));
  if (limit) qs.set('limit', String(limit));
  if (q?.trim()) qs.set('q', q.trim());
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return api.get<User[] | Paginated<User>>(`/employees${suffix}`);
}

export interface EmployeeDocument {
  id: string;
  name: string;
  url: string;
  uploadedAt: string;
}

export async function uploadDocument(id: string, file: File, name?: string) {
  const form = new FormData();
  form.append('file', file);
  if (name) form.append('name', name);
  const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';
  const token = getAccessToken();
  let res = await fetch(`${BASE_URL}/employees/${id}/documents`, {
    method: 'POST',
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (res.status === 401 && token) {
    const renewed = await refreshAccessToken();
    if (renewed) {
      res = await fetch(`${BASE_URL}/employees/${id}/documents`, {
        method: 'POST',
        credentials: 'include',
        headers: { Authorization: `Bearer ${renewed}` },
        body: form,
      });
    }
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.message ?? `Upload failed: ${res.status}`, body.code);
  }
  return res.json() as Promise<EmployeeDocument>;
}

export function deleteDocument(id: string, docId: string) {
  return api.delete<{ message: string }>(`/employees/${id}/documents/${docId}`);
}
