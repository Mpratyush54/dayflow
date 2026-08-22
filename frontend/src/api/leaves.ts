import { api } from './client';
import type { LeaveRequest, LeaveStatus, LeaveType } from '../types';

export interface ApplyLeaveInput {
  type: LeaveType;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  remarks?: string;
}

export type ReviewDecision = 'APPROVED' | 'REJECTED';

export function getMyLeaves() {
  return api.get<LeaveRequest[]>('/leaves');
}

export function applyLeave(input: ApplyLeaveInput) {
  return api.post<LeaveRequest>('/leaves', input);
}

export function getAllLeaves(status?: LeaveStatus) {
  const query = status ? `?status=${status}` : '';
  return api.get<LeaveRequest[]>(`/leaves/all${query}`);
}

export function reviewLeave(id: string, status: ReviewDecision, comment?: string) {
  return api.patch<LeaveRequest>(`/leaves/${id}/review`, { status, comment });
}
