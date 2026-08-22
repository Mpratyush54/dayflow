export const STANDARD_WORKDAY_HOURS = 8;

export function liveHoursFromCheckIn(checkIn: string, now: Date): number {
  return Math.max((now.getTime() - new Date(checkIn).getTime()) / 3600000, 0);
}

/** Total logged hours for display, or null when not available. */
export function totalLoggedHours(
  workedHours: number,
  checkIn: string | null,
  checkOut: string | null,
  useLive: boolean,
  liveHours: number,
): number | null {
  if (checkOut) return workedHours;
  if (checkIn && useLive) return liveHours;
  return null;
}

export function workHours(total: number): number {
  return Math.min(total, STANDARD_WORKDAY_HOURS);
}

export function extraHours(total: number): number {
  return Math.max(0, total - STANDARD_WORKDAY_HOURS);
}

export function fmtHours(total: number | null): string {
  if (total === null) return '—';
  return `${total.toFixed(1)}h`;
}
