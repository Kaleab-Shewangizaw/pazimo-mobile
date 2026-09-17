import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Real push notifications — the kind that show up on the lock screen even
 * with the app closed, distinct from the in-app socket updates
 * `use-share-transfer-socket.ts` already handles. Needs a development build
 * (SDK 53+ dropped remote push support from Expo Go) and an EAS project id
 * in `app.json`'s `extra.eas.projectId` (set by running `eas init` once) —
 * every function here degrades to a silent no-op rather than throwing when
 * either isn't available yet, so a team member on Expo Go, a simulator, or a
 * checkout that hasn't run `eas init` never crashes on this.
 */

// Foreground behavior: still show the banner and add it to the notification
// list, the same as a backgrounded app would — without this, iOS/Android
// both suppress a notification's UI entirely while the app is in the
// foreground, which would make this feature look broken to anyone testing
// it with the app open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const ANDROID_CHANNEL_ID = 'default';

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Default',
    importance: Notifications.AndroidImportance.MAX,
  });
}

/**
 * Requests permission and returns this device's Expo push token, or `null`
 * for any reason it can't: a simulator/emulator (no push capability at
 * all), permission denied, or no EAS project id configured yet. Every case
 * just logs and returns `null` — a missing push token must never block the
 * rest of the app.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('Push notifications need a physical device — simulators/emulators cannot register.');
    return null;
  }

  await ensureAndroidChannel();

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  if (status !== 'granted') return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) {
    console.warn(
      'No EAS project id configured (app.json extra.eas.projectId) — run `eas init` before push tokens can be issued.',
    );
    return null;
  }

  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return data;
  } catch (error) {
    console.warn('Failed to get an Expo push token:', error);
    return null;
  }
}

/** Fires when the user taps a notification (foreground, background, or from a cold start's initial response). Returns an unsubscribe function. */
export function addNotificationTapListener(
  onTap: (data: Record<string, unknown>) => void,
): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    onTap(response.notification.request.content.data ?? {});
  });
  return () => subscription.remove();
}
