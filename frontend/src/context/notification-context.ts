import { createContext } from 'react';

export type NotificationKind =
  | 'leave-approved'
  | 'leave-rejected'
  | 'payroll-ready'
  | 'check-in-reminder'
  | 'pending-approval';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  message: string;
  href: string;
  read: boolean;
  createdAt: string;
}

export interface PushNotificationInput {
  kind: NotificationKind;
  title: string;
  message: string;
  href: string;
}

export interface PushOptions {
  /** When set, skip if a notification with this id already exists */
  dedupeKey?: string;
}

export interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  pushNotification: (input: PushNotificationInput, options?: PushOptions) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
}

export const NotificationContext = createContext<NotificationContextValue | null>(null);
