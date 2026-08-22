import { api } from './client';
import type { AttendanceDay, AttendanceWindow, TeamAttendance } from '../types';

export function getMyAttendance(days = 7): Promise<AttendanceWindow> {
  return api.get<AttendanceWindow>(`/attendance?days=${days}`);
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
