import { useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useRef } from 'react';

import { NOTIFICATIONS_KEYS } from '@/lib/api/notifications';
import { useAuthStore } from '@/lib/auth/store';
import { registerForPushNotificationsAsync, savePushTokenToServer } from './push';

/**
 * Map a push payload to an in-app route. The backend attaches `conversationId`
 * for messaging pushes (see notification-fanout.service). Everything else falls
 * back to the notifications inbox, which lists every notification type.
 */
function resolveDeepLink(data: Record<string, unknown> | undefined): Href {
  if (data && typeof data.conversationId === 'string') {
    return { pathname: '/(app)/messages/[id]', params: { id: data.conversationId } };
  }
  return '/(app)/notifications';
}

/**
 * Wires Expo push notifications for the authenticated session:
 *  1. registers this device's push token with the backend once logged in,
 *  2. refreshes the unread badge when a push arrives in the foreground,
 *  3. deep-links to the relevant screen when the user taps a notification.
 *
 * Mounted from the authenticated `(app)` layout, so it only runs for logged-in
 * users and is torn down on logout.
 */
export function usePushNotifications(): void {
  const accessToken = useAuthStore((s) => s.accessToken);
  const router = useRouter();
  const queryClient = useQueryClient();
  const registeredToken = useRef<string | null>(null);

  // Register this device's token once we have an authenticated session.
  useEffect(() => {
    if (!accessToken) {
      registeredToken.current = null;
      return;
    }

    let cancelled = false;
    void (async () => {
      const token = await registerForPushNotificationsAsync();
      if (cancelled || !token || token === registeredToken.current) {
        return;
      }
      try {
        await savePushTokenToServer(token);
        registeredToken.current = token;
      } catch {
        // Non-fatal: the app works without push; retried on next mount.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  // Foreground receipt → refresh the unread-count badge.
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener(() => {
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEYS.all });
    });
    return () => sub.remove();
  }, [queryClient]);

  // Tap on a notification (background/quit) → deep-link into the app.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as
        | Record<string, unknown>
        | undefined;
      router.push(resolveDeepLink(data));
    });
    return () => sub.remove();
  }, [router]);
}
