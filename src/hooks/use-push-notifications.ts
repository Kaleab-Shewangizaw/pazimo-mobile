import { useQueryClient } from '@tanstack/react-query';
import { useRootNavigationState, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

import { registerPushToken } from '@/api/auth';
import { reportAppHeartbeat } from '@/hooks/use-app-heartbeat';
import {
  addNotificationReceivedListener,
  addNotificationTapListener,
  addPushTokenChangeListener,
  registerForPushNotificationsAsync,
  setRegisteredPushToken,
} from '@/lib/push-notifications';
import { openNotificationTarget } from '@/lib/notification-routing';
import { queryKeys } from '@/queries/keys';
import { useMarkNotificationsRead } from '@/queries/notifications';
import { useAuthStore } from '@/stores/use-auth-store';

/**
 * Registers this device's Expo push token with the backend once signed in,
 * and deep-links a tapped notification: a conversation for the pushes users'
 * activity triggers (the counterpart to `use-share-transfer-socket.ts`'s
 * in-app updates), an event or link for admin campaigns.
 *
 * Unregistering on sign-out lives in the auth store's `signOut`, not here —
 * it has to run while the session token still exists to be authorized.
 */
function usePushNotifications() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { submit: markRead } = useMarkNotificationsRead();
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);
  // A tap that cold-starts the app is delivered before the navigator has
  // mounted, and `router.push` then has nowhere to go — so taps are only
  // listened for once there's a root navigation state to push onto.
  const navigationReady = Boolean(useRootNavigationState()?.key);

  // Bumped by the token-rotation listener to re-run registration.
  const registrationRun = useRef(0);

  useEffect(() => {
    if (!hydrated || !token) return;

    let cancelled = false;
    const register = async () => {
      const run = ++registrationRun.current;
      const pushToken = await registerForPushNotificationsAsync();
      if (cancelled || run !== registrationRun.current || !pushToken) return;
      // Re-registering the same token is harmless server-side (pushService's
      // `$addToSet`), so this runs on every sign-in and launch — that's also
      // what re-attaches a token a previous account's sign-out removed.
      try {
        await registerPushToken(pushToken);
        setRegisteredPushToken(pushToken);
      } catch (error) {
        console.error('Failed to register push token:', (error as Error).message);
      }
      // The heartbeat on sign-in may have run before permission was granted;
      // send one now so admin campaigns can reach this device too.
      reportAppHeartbeat();
    };

    register();
    const unsubscribe = addPushTokenChangeListener(() => {
      // The old Expo token stops working once the native one rotates.
      setRegisteredPushToken(null);
      register();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [hydrated, token]);

  // A push that lands while the app is open is a second signal (alongside the
  // socket) that something changed — if the socket was down, this is what
  // makes the new message or share appear without a manual refresh.
  useEffect(() => {
    return addNotificationReceivedListener((data) => {
      if (data.type !== 'message') {
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      }
      switch (data.type) {
        case 'message':
          queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
          break;
        case 'ticket-share':
          queryClient.invalidateQueries({ queryKey: queryKeys.shares.all });
          queryClient.invalidateQueries({ queryKey: queryKeys.tickets.all });
          queryClient.invalidateQueries({ queryKey: queryKeys.conversations.list() });
          break;
        case 'beverage-share':
          queryClient.invalidateQueries({ queryKey: queryKeys.beverageShares.all });
          queryClient.invalidateQueries({ queryKey: queryKeys.refill.all });
          queryClient.invalidateQueries({ queryKey: queryKeys.conversations.list() });
          break;
        case 'cinema-share':
          queryClient.invalidateQueries({ queryKey: queryKeys.cinemaShares.all });
          queryClient.invalidateQueries({ queryKey: queryKeys.conversations.list() });
          break;
        case 'achievement':
          queryClient.invalidateQueries({ queryKey: queryKeys.rewards.all });
          break;
      }
    });
  }, [queryClient]);

  useEffect(() => {
    if (!navigationReady) return;
    return addNotificationTapListener((data) => {
      // The inbox row this push was saved as is now seen too.
      if (typeof data.notificationId === 'string') {
        markRead({ ids: [data.notificationId] });
      } else if (data.type === 'campaign' && typeof data.campaignId === 'string') {
        markRead({ campaignId: data.campaignId });
      }
      openNotificationTarget(router, data);
    });
  }, [navigationReady, router, markRead]);
}

/** Mount once, anywhere inside the router — see `src/app/_layout.tsx`. Renders nothing. */
export function PushNotificationsBridge() {
  usePushNotifications();
  return null;
}
