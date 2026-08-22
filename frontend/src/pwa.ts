export const OFFLINE_QUEUE_KEY = 'dayflow:attendance:queue';

export type QueuedAction = { type: 'checkin' | 'checkout'; ts: number };

export function getQueue(): QueuedAction[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function setQueue(q: QueuedAction[]) {
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(q));
}

export function enqueue(action: QueuedAction) {
  const q = getQueue();
  q.push(action);
  setQueue(q);
}

export async function flushQueue(
  doCheckIn: () => Promise<unknown>,
  doCheckOut: () => Promise<unknown>,
): Promise<number> {
  const q = getQueue();
  if (q.length === 0) return 0;
  let flushed = 0;
  const remaining: QueuedAction[] = [];
  for (const item of q) {
    try {
      if (item.type === 'checkin') await doCheckIn();
      else await doCheckOut();
      flushed++;
    } catch {
      remaining.push(item);
    }
  }
  setQueue(remaining);
  return flushed;
}

export function registerSW() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  }
}
