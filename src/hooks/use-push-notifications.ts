import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

import { registerPushToken, unregisterPushToken } from '@/api/auth';
import { addNotificationTapListener, registerForPushNotificationsAsync } from '@/lib/push-notifications';
import { useAuthStore } from '@/stores/use-auth-store';

/**
 * Registers this device's Expo push token with the backend once signed in,
 * and deep-links a tapped notification to the conversation it's about — the
 * push counterpart to `use-share-transfer-socket.ts`'s in-app updates.
 */
function usePushNotifications() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);
  // Not `useState` — re-registering the same token on every re-render (or
  // every cold start) is harmless server-side (see pushService's
  // `$addToSet`), but there is no reason to fire the request more than once
  // per token per session either.
  const registeredToken = useRef<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;

    if (!token) {
      // Signed out — this device shouldn't keep getting the outgoing
      // account's pushes. Same reactive-to-token-loss shape
      // `use-share-transfer-socket.ts` uses for `disconnectSocket()`.
      const staleToken = registeredToken.current;
      if (staleToken) {
        registeredToken.current = null;
        unregisterPushToken(staleToken).catch(() => {});
      }
      return;
    }

    let cancelled = false;
    registerForPushNotificationsAsync().then((pushToken) => {
      if (cancelled || !pushToken || pushToken === registeredToken.current) return;
      registeredToken.current = pushToken;
      registerPushToken(pushToken).catch((error) => {
        console.error('Failed to register push token:', error.message);
      });
    });

    return () => {
      cancelled = true;
    };
  }, [hydrated, token]);

  useEffect(() => {
    return addNotificationTapListener((data) => {
      // Every push this app sends carries `counterpartyId` (see
      // pushService's callers) — a message, a ticket/drink/cinema share, or
      // a response to one, all resolve to "open this conversation."
      if (typeof data.counterpartyId === 'string' && data.counterpartyId) {
        router.push({ pathname: '/conversation/[userId]', params: { userId: data.counterpartyId } });
      }
    });
  }, [router]);
}

/** Mount once, anywhere inside the router — see `src/app/_layout.tsx`. Renders nothing. */
export function PushNotificationsBridge() {
  usePushNotifications();
  return null;
}
