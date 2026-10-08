import { useQueryClient } from '@tanstack/react-query';
import { useRootNavigationState, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef } from 'react';

import { recordCampaignOpen } from '@/api/app';
import { registerPushToken } from '@/api/auth';
import { reportAppHeartbeat } from '@/hooks/use-app-heartbeat';
import {
  addNotificationReceivedListener,
  addNotificationTapListener,
  addPushTokenChangeListener,
  getActiveConversation,
  registerForPushNotificationsAsync,
  setRegisteredPushToken,
} from '@/lib/push-notifications';
import { queryKeys } from '@/queries/keys';
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
      }
    });
  }, [queryClient]);

  useEffect(() => {
    if (!navigationReady) return;
    return addNotificationTapListener((data) => {
      // Admin campaigns and test pushes from the dashboard (Admin → App).
      if (data.type === 'campaign' || data.type === 'test') {
        if (typeof data.campaignId === 'string') {
          recordCampaignOpen(data.campaignId).catch(() => {});
        }
        if (typeof data.eventId === 'string' && data.eventId) {
          router.push(`/event/${data.eventId}`);
        } else if (typeof data.url === 'string' && /^https:\/\//i.test(data.url)) {
          WebBrowser.openBrowserAsync(data.url).catch(() => {});
        }
        return;
      }

      // Every other push carries `counterpartyId` (see pushService's
      // callers) — a message, a ticket/drink/cinema share, or a response to
      // one, all resolve to "open this conversation." Already looking at it?
      // Then there's nowhere to go — pushing would stack a duplicate screen.
      const counterpartyId = data.counterpartyId;
      if (typeof counterpartyId !== 'string' || !counterpartyId) return;
      if (getActiveConversation() === counterpartyId) return;
      // A signed-out device shouldn't still be getting these, but a push
      // already in the tray from before sign-out can still be tapped.
      if (!useAuthStore.getState().token) return;
      router.push({ pathname: '/conversation/[userId]', params: { userId: counterpartyId } });
    });
  }, [navigationReady, router]);
}

/** Mount once, anywhere inside the router — see `src/app/_layout.tsx`. Renders nothing. */
export function PushNotificationsBridge() {
  usePushNotifications();
  return null;
}
