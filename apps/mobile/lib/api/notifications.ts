import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from './client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  data?: Record<string, unknown>;
}

export interface NotificationsResponse {
  items: AppNotification[];
  total: number;
}

export interface UnreadCountResponse {
  count: number;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const NOTIFICATIONS_KEYS = {
  all: ['notifications'] as const,
  list: (unreadOnly?: boolean) =>
    ['notifications', 'list', { unreadOnly }] as const,
  unreadCount: () => ['notifications', 'unread-count'] as const,
} as const;

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Fetch notifications for the current user.
 * @param unreadOnly - When true, only returns unread notifications.
 */
export function useNotifications(unreadOnly = false) {
  return useQuery({
    queryKey: NOTIFICATIONS_KEYS.list(unreadOnly),
    queryFn: () =>
      fetchApi<NotificationsResponse>(
        `/api/notifications?unreadOnly=${unreadOnly}`,
      ),
  });
}

/**
 * Poll the unread notification count every 30 seconds.
 * Useful for badge indicators in the navigation bar.
 */
export function useUnreadCount() {
  return useQuery({
    queryKey: NOTIFICATIONS_KEYS.unreadCount(),
    queryFn: () => fetchApi<UnreadCountResponse>('/api/notifications/unread-count'),
    refetchInterval: 30_000,
  });
}

/**
 * Mark a single notification as read.
 */
export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) =>
      fetchApi<void>(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEYS.all });
    },
  });
}

/**
 * Mark all notifications as read in one request.
 */
export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      fetchApi<void>('/api/notifications/read-all', { method: 'POST' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEYS.all });
    },
  });
}
