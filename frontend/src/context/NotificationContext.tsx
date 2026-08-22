import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  NotificationContext,
  type AppNotification,
  type PushNotificationInput,
  type PushOptions,
} from './notification-context';

const MAX_NOTIFICATIONS = 50;
const STORAGE_PREFIX = 'dayflow:notifications';

function storageKey(userId: string | undefined) {
  return `${STORAGE_PREFIX}:${userId ?? 'guest'}`;
}

function loadStored(userId: string | undefined): AppNotification[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AppNotification[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(userId: string | undefined, items: AppNotification[]) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(items));
  } catch {
    /* quota exceeded — ignore */
  }
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [notifications, setNotifications] = useState<AppNotification[]>(() => loadStored(userId));
  const prevUserId = useRef(userId);

  useEffect(() => {
    if (prevUserId.current !== userId) {
      prevUserId.current = userId;
      setNotifications(loadStored(userId));
    }
  }, [userId]);

  useEffect(() => {
    persist(userId, notifications);
  }, [notifications, userId]);

  const pushNotification = useCallback(
    (input: PushNotificationInput, options?: PushOptions) => {
      const id = options?.dedupeKey ?? makeId();
      setNotifications((prev) => {
        if (options?.dedupeKey && prev.some((n) => n.id === options.dedupeKey)) {
          return prev;
        }
        const next: AppNotification = {
          id,
          ...input,
          read: false,
          createdAt: new Date().toISOString(),
        };
        return [next, ...prev.filter((n) => n.id !== id)].slice(0, MAX_NOTIFICATIONS);
      });
    },
    [],
  );

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      pushNotification,
      markAsRead,
      markAllAsRead,
      removeNotification,
    }),
    [notifications, unreadCount, pushNotification, markAsRead, markAllAsRead, removeNotification],
  );

  return (
    <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
  );
}
