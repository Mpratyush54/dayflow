import { HttpError } from './httpError.js';

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Parse YYYY-MM-DD from API input (never use local timezone). */
export function parseDateKey(value, field) {
  if (typeof value !== 'string' || !DATE_KEY_RE.test(value.trim())) {
    throw new HttpError(400, `${field} must be a valid date (YYYY-MM-DD)`, 'VALIDATION_ERROR');
  }
  return value.trim();
}

/** UTC midnight for a calendar date key. */
export function utcFromDateKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Calendar date key from a stored UTC-midnight Date. */
export function dateKeyFromDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

export function todayKeyUtc() {
  const now = new Date();
  return dateKeyFromDate(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())));
}

export function daysInclusiveKeys(startKey, endKey) {
  const start = utcFromDateKey(startKey);
  const end = utcFromDateKey(endKey);
  return Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
}

/** Inclusive range overlap on YYYY-MM-DD keys. */
export function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart <= bEnd && aEnd >= bStart;
}
