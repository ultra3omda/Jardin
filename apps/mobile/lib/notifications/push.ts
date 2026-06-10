import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { fetchApi } from '@/lib/api/client';

/**
 * Foreground display behaviour. Without an explicit handler, notifications that
 * arrive while the app is open are delivered silently (no banner / sound).
 * expo-notifications 0.30+ replaced the single `shouldShowAlert` flag with the
 * granular `shouldShowBanner` / `shouldShowList` pair.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/** Android requires an explicit channel for heads-up notifications. */
const ANDROID_CHANNEL_ID = 'default';

/** Klasso accent (terracotta) used for the Android notification light. */
const ACCENT_COLOR = '#E2725B';

/**
 * Resolve the EAS projectId required by `getExpoPushTokenAsync` since SDK 49.
 * It lives under `extra.eas.projectId` (app.json) and is surfaced at runtime
 * via expo-constants — with a fallback to `easConfig` for some build types.
 */
function resolveProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId
  );
}

/**
 * Request permission and resolve this device's Expo push token.
 *
 * Returns `null` (never throws) when:
 *  - running on a simulator/emulator (remote push tokens require a real device),
 *  - the user denies the notification permission,
 *  - the EAS projectId is missing (e.g. Expo Go without project config).
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  // Remote push tokens are only issued to physical devices.
  if (!Device.isDevice) {
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'Notifications',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: ACCENT_COLOR,
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  if (status !== 'granted') {
    return null;
  }

  const projectId = resolveProjectId();
  if (!projectId) {
    return null;
  }

  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return data;
  } catch {
    return null;
  }
}

/** Persist the device push token on the backend (`PUT /api/users/me/push-token`). */
export async function savePushTokenToServer(token: string): Promise<void> {
  await fetchApi<void>('/api/users/me/push-token', {
    method: 'PUT',
    body: JSON.stringify({ token }),
  });
}

/**
 * Remove the device push token on the backend (`DELETE /api/users/me/push-token`).
 * Best-effort: logout must succeed even if this network call fails.
 */
export async function deletePushTokenFromServer(): Promise<void> {
  try {
    await fetchApi<void>('/api/users/me/push-token', { method: 'DELETE' });
  } catch {
    // Intentionally ignored — a stale token is self-healed server-side.
  }
}
