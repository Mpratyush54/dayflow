import { api } from './client';
import type { LeaveRequest, LeaveStatus, LeaveType } from '../types';

export interface ApplyLeaveInput {
  type: LeaveType;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  remarks?: string;
}

export type ReviewDecision = 'APPROVED' | 'REJECTED';

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  pages: number;
  limit: number;
}

export function getMyLeaves(): Promise<LeaveRequest[]>;
export function getMyLeaves(page: number, limit?: number): Promise<Paginated<LeaveRequest>>;
export function getMyLeaves(page?: number, limit?: number): Promise<LeaveRequest[] | Paginated<LeaveRequest>> {
  const qs = new URLSearchParams();
  if (page) qs.set('page', String(page));
  if (limit) qs.set('limit', String(limit));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return api.get<LeaveRequest[] | Paginated<LeaveRequest>>(`/leaves${suffix}`);
}

export function applyLeave(input: ApplyLeaveInput) {
  return api.post<LeaveRequest>('/leaves', input);
}

export function getAllLeaves(status?: LeaveStatus): Promise<LeaveRequest[]>;
export function getAllLeaves(status: LeaveStatus | undefined, page: number, limit?: number): Promise<Paginated<LeaveRequest>>;
export function getAllLeaves(status?: LeaveStatus, page?: number, limit?: number): Promise<LeaveRequest[] | Paginated<LeaveRequest>> {
  const qs = new URLSearchParams();
  if (status) qs.set('status', status);
  if (page) qs.set('page', String(page));
  if (limit) qs.set('limit', String(limit));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return api.get<LeaveRequest[] | Paginated<LeaveRequest>>(`/leaves/all${suffix}`);
}

export function reviewLeave(id: string, status: ReviewDecision, comment?: string) {
  return api.patch<LeaveRequest>(`/leaves/${id}/review`, { status, comment });
}
