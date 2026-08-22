import { api, download, saveBlob } from './client';
import type { Payroll } from '../types';

export interface PayrollStructureInput {
  basicSalary?: number;
  currency?: string;
  allowances?: Record<string, number>;
  deductions?: Record<string, number>;
  monthlyWage?: number;
  components?: Array<{ key: string; mode: string; value: string | number }>;
}

export function getMyPayroll() {
  return api.get<Payroll>('/payroll');
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  pages: number;
  limit: number;
}

export function getAllPayroll(): Promise<Payroll[]>;
export function getAllPayroll(page: number, limit?: number): Promise<Paginated<Payroll>>;
export function getAllPayroll(page?: number, limit?: number): Promise<Payroll[] | Paginated<Payroll>> {
  const qs = new URLSearchParams();
  if (page) qs.set('page', String(page));
  if (limit) qs.set('limit', String(limit));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return api.get<Payroll[] | Paginated<Payroll>>(`/payroll/all${suffix}`);
}

export function updatePayroll(userId: string, input: PayrollStructureInput) {
  return api.patch<Payroll>(`/payroll/${userId}`, input);
}

export async function downloadPayslip(month: string, userId?: string) {
  const qs = new URLSearchParams({ month });
  if (userId) qs.set('userId', userId);
  const { blob, filename } = await download(`/payroll/slip?${qs.toString()}`);
  saveBlob(blob, filename);
}
