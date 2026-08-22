import { api } from './client';
import type { AttendanceDay, AttendanceWindow, TeamAttendance } from '../types';

export function getMyAttendance(days = 7, date?: string): Promise<AttendanceWindow> {
  const qs = new URLSearchParams({ days: String(days) });
  if (date) qs.set('date', date);
  return api.get<AttendanceWindow>(`/attendance?${qs.toString()}`);
}

export function checkIn(): Promise<AttendanceDay> {
  return api.post<AttendanceDay>('/attendance/checkin');
}

export function checkOut(): Promise<AttendanceDay> {
  return api.post<AttendanceDay>('/attendance/checkout');
}

export function getTeamAttendance(date: string): Promise<TeamAttendance> {
  return api.get<TeamAttendance>(`/attendance/team?date=${encodeURIComponent(date)}`);
}
