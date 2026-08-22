import { api, getAccessToken, refreshAccessToken, ApiError } from './client';
import type { LeaveRequest, LeaveStatus, LeaveType } from '../types';

export interface ApplyLeaveInput {
  type: LeaveType;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  remarks?: string;
  attachment?: File | null;
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

export async function applyLeave(input: ApplyLeaveInput): Promise<LeaveRequest> {
  if (input.attachment) {
    const form = new FormData();
    form.append('type', input.type);
    form.append('startDate', input.startDate);
    form.append('endDate', input.endDate);
    if (input.remarks) form.append('remarks', input.remarks);
    form.append('attachment', input.attachment);
    const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';
    const token = getAccessToken();
    let res = await fetch(`${BASE_URL}/leaves`, {
      method: 'POST',
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (res.status === 401 && token) {
      const renewed = await refreshAccessToken();
      if (renewed) {
        res = await fetch(`${BASE_URL}/leaves`, {
          method: 'POST',
          credentials: 'include',
          headers: { Authorization: `Bearer ${renewed}` },
          body: form,
        });
      }
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new ApiError(res.status, body.message ?? `Request failed: ${res.status}`, body.code);
    }
    return res.json();
  }
  const { attachment: _a, ...json } = input;
  return api.post<LeaveRequest>('/leaves', json);
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
