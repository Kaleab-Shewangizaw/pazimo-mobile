import { useEffect } from 'react';
import { AppState } from 'react-native';

import { sendHeartbeat } from '@/api/app';
import { getPushStateSilently } from '@/lib/push-notifications';
import { useAuthStore } from '@/stores/use-auth-store';

/**
 * Coming back to the foreground within this long of the last heartbeat isn't
 * a new visit — switching to another app to copy a code and back, say — so it
 * doesn't report again. The backend counts each heartbeat as a session.
 */
const FOREGROUND_INTERVAL_MS = 30 * 60 * 1000;

let lastSentAt = 0;
let inFlight: Promise<void> | null = null;

/**
 * Sends one heartbeat now. Safe to call from anywhere — overlapping calls
 * share the request in flight. Called by the bridge below, and by
 * `usePushNotifications` once it has a token, so the backend learns about it
 * straight away rather than at the next launch.
 */
export function reportAppHeartbeat(): Promise<void> {
  inFlight ??= (async () => {
    try {
      await sendHeartbeat(await getPushStateSilently());
      lastSentAt = Date.now();
    } catch {
      // Telemetry: a failure here must never surface to the user.
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

function useAppHeartbeat() {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);

  // On launch, and on every sign-in or sign-out, so the backend's link
  // between this install and an account stays current.
  useEffect(() => {
    if (!hydrated) return;
    reportAppHeartbeat();
  }, [hydrated, token]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active' && Date.now() - lastSentAt > FOREGROUND_INTERVAL_MS) {
        reportAppHeartbeat();
      }
    });
    return () => subscription.remove();
  }, []);
}

/** Mount once, inside the providers — see `src/app/_layout.tsx`. Renders nothing. */
export function AppHeartbeatBridge() {
  useAppHeartbeat();
  return null;
}
