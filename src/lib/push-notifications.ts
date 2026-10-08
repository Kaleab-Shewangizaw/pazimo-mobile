import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { AppState, Platform } from 'react-native';

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

/**
 * The conversation currently on screen, if any — set by the conversation
 * screen while it's focused. A message push from that same person is already
 * visible in the thread (the socket or the fallback poll put it there), so
 * its banner would only be noise.
 */
let activeConversationId: string | null = null;

export function setActiveConversation(counterpartyId: string | null) {
  activeConversationId = counterpartyId;
}

export function getActiveConversation(): string | null {
  return activeConversationId;
}

function isForActiveConversation(data: Record<string, unknown> | undefined): boolean {
  return (
    AppState.currentState === 'active' &&
    activeConversationId !== null &&
    data?.counterpartyId === activeConversationId
  );
}

// Foreground behavior: still show the banner and add it to the notification
// list, the same as a backgrounded app would — without this, iOS/Android
// both suppress a notification's UI entirely while the app is in the
// foreground, which would make this feature look broken to anyone testing
// it with the app open. The one exception is the chat you're looking at.
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const show = !isForActiveConversation(notification.request.content.data);
    return {
      shouldShowBanner: show,
      shouldShowList: show,
      shouldPlaySound: show,
      shouldSetBadge: false,
    };
  },
});

const ANDROID_CHANNEL_ID = 'default';

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Default',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
  });
}

/**
 * `app.json`'s `extra.eas.projectId` (written by `eas init`), falling back to
 * the one EAS Build embeds in the manifest itself.
 */
function getProjectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

/**
 * The Expo push token this device last handed to the backend for the signed-in
 * account — kept so sign-out can unregister it *before* the session token is
 * dropped (the DELETE needs that session to be authorized at all).
 */
let registeredToken: string | null = null;

export function getRegisteredPushToken(): string | null {
  return registeredToken;
}

export function setRegisteredPushToken(token: string | null) {
  registeredToken = token;
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

  const projectId = getProjectId();
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

export type PushPermission = 'granted' | 'denied' | 'undetermined';

/**
 * The current permission and, when granted, this device's token — *without*
 * prompting. For the device heartbeat, which runs for guests too: the app only
 * asks for permission after sign-in (see `usePushNotifications`), and a guest
 * who already granted it keeps their token reachable by admin campaigns.
 */
export async function getPushStateSilently(): Promise<{
  permission: PushPermission;
  token: string | null;
}> {
  if (!Device.isDevice) return { permission: 'undetermined', token: null };
  try {
    const { status } = await Notifications.getPermissionsAsync();
    const permission: PushPermission =
      status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined';
    const projectId = getProjectId();
    if (permission !== 'granted' || !projectId) return { permission, token: null };
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return { permission, token: data };
  } catch {
    return { permission: 'undetermined', token: null };
  }
}

/**
 * Fires when the user taps a notification — while the app is open or
 * backgrounded, *and* when the tap is what launched the app from cold. The
 * live listener alone misses that last case: the response arrives before any
 * JS listener exists, so it's read back via `getLastNotificationResponseAsync`
 * and then cleared, so the same tap isn't replayed on the next mount.
 * Returns an unsubscribe function.
 */
export function addNotificationTapListener(
  onTap: (data: Record<string, unknown>) => void,
): () => void {
  const handled = new Set<string>();
  const handle = (response: Notifications.NotificationResponse) => {
    if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const id = response.notification.request.identifier;
    if (handled.has(id)) return;
    handled.add(id);
    onTap(response.notification.request.content.data ?? {});
    Notifications.clearLastNotificationResponseAsync().catch(() => {});
  };

  const subscription = Notifications.addNotificationResponseReceivedListener(handle);
  let cancelled = false;
  Notifications.getLastNotificationResponseAsync()
    .then((response) => {
      if (!cancelled && response) handle(response);
    })
    .catch(() => {});

  return () => {
    cancelled = true;
    subscription.remove();
  };
}

/** Fires when a push arrives while the app is in the foreground. Returns an unsubscribe function. */
export function addNotificationReceivedListener(
  onReceive: (data: Record<string, unknown>) => void,
): () => void {
  const subscription = Notifications.addNotificationReceivedListener((notification) => {
    onReceive(notification.request.content.data ?? {});
  });
  return () => subscription.remove();
}

/**
 * Fires when the OS rotates this device's native push token — the Expo token
 * derived from it may change too, so the caller re-registers. Returns an
 * unsubscribe function.
 */
export function addPushTokenChangeListener(onChange: () => void): () => void {
  const subscription = Notifications.addPushTokenListener(() => onChange());
  return () => subscription.remove();
}

/** Clears any delivered notifications about one conversation — called when it's opened, since they've now been seen. */
export async function dismissConversationNotifications(counterpartyId: string): Promise<void> {
  try {
    const presented = await Notifications.getPresentedNotificationsAsync();
    await Promise.all(
      presented
        .filter((n) => n.request.content.data?.counterpartyId === counterpartyId)
        .map((n) => Notifications.dismissNotificationAsync(n.request.identifier)),
    );
  } catch {
    // Cosmetic — a stale notification left in the tray is harmless.
  }
}
