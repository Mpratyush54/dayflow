import { api, download, saveBlob } from './client';
import type { AnalyticsSummary, AttendanceReport } from '../types';

export function getAnalyticsSummary(month: string): Promise<AnalyticsSummary> {
  return api.get<AnalyticsSummary>(`/analytics/summary?month=${encodeURIComponent(month)}`);
}

export function getAttendanceReport(month: string): Promise<AttendanceReport> {
  return api.get<AttendanceReport>(`/attendance/report?month=${encodeURIComponent(month)}`);
}

export async function downloadAttendanceCsv(month: string) {
  const { blob, filename } = await download(
    `/attendance/report?month=${encodeURIComponent(month)}&format=csv`,
  );
  saveBlob(blob, filename);
}
