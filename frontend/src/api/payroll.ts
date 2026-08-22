import { api } from './client';
import type { Payroll } from '../types';

export interface PayrollStructureInput {
  basicSalary: number;
  currency?: string;
  allowances: Record<string, number>;
  deductions: Record<string, number>;
}

export function getMyPayroll() {
  return api.get<Payroll>('/payroll');
}

export function getAllPayroll() {
  return api.get<Payroll[]>('/payroll/all');
}

export function updatePayroll(userId: string, input: PayrollStructureInput) {
  return api.patch<Payroll>(`/payroll/${userId}`, input);
}
