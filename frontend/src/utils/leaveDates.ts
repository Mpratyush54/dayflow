/** Normalize API ISO datetime or YYYY-MM-DD to a UTC date key. */
export function toDateKey(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return aStart <= bEnd && aEnd >= bStart;
}

export function daysInclusiveKeys(startKey: string, endKey: string) {
  const start = new Date(`${startKey}T00:00:00.000Z`);
  const end = new Date(`${endKey}T00:00:00.000Z`);
  return Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
}
