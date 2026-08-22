import { api } from './client';
import type { EmployeeProfile } from '../types';

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
  > & {
    dateOfBirth?: string;
    dateOfJoining?: string;
  }
>;

export function updateEmployee(id: string, patch: EmployeePatch) {
  return api.patch<EmployeeProfile>(`/employees/${id}`, patch);
}
