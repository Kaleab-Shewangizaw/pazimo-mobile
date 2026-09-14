import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { connectSocket, disconnectSocket, subscribeTicketEvents } from '@/lib/socket';
import { queryKeys } from '@/queries/keys';
import { useAuthStore } from '@/stores/use-auth-store';

/**
 * Keeps ticket-transfer state live without pull-to-refresh: connects the
 * socket for as long as there's a session, and on any `ticket:transfer` /
 * `ticket:received` event just invalidates the caches that could have
 * changed — the REST responses stay the source of truth, this only tells
 * React Query when to go re-read them.
 */
function useTicketTransferSocket() {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated) return;
    if (!token) {
      disconnectSocket();
      return;
    }
    connectSocket(token);
    return () => disconnectSocket();
  }, [hydrated, token]);

  useEffect(() => {
    return subscribeTicketEvents(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shares.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.transferable() });
    });
  }, [queryClient]);
}

/** Mount once, anywhere inside `QueryClientProvider` — see `src/app/_layout.tsx`. Renders nothing. */
export function TicketTransferSocketBridge() {
  useTicketTransferSocket();
  return null;
}
