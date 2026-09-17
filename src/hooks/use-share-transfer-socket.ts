import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { connectSocket, disconnectSocket, subscribeTicketEvents } from '@/lib/socket';
import { queryKeys } from '@/queries/keys';
import { useAuthStore } from '@/stores/use-auth-store';

/**
 * Keeps every share system's state live without pull-to-refresh: connects
 * the socket for as long as there's a session, and on any transfer/receipt
 * event (ticket or drink today, cinema once that backend exists) just
 * invalidates the caches that could have changed — the REST responses stay
 * the source of truth, this only tells React Query when to go re-read them.
 */
function useShareTransferSocket() {
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
    return subscribeTicketEvents((event) => {
      // Checked first — none of the 'message:*' events start with
      // 'beverage:'/'cinema:' either, so they'd otherwise fall all the way
      // through to the trailing ticket-invalidation branch below.
      if (event.type === 'message:new' || event.type === 'message:updated' || event.type === 'message:deleted') {
        queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
        return;
      }
      if (event.type.startsWith('beverage:')) {
        queryClient.invalidateQueries({ queryKey: queryKeys.beverageShares.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.refill.all });
        return;
      }
      if (event.type.startsWith('cinema:')) {
        queryClient.invalidateQueries({ queryKey: queryKeys.cinemaShares.all });
        return;
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.shares.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.transferable() });
    });
  }, [queryClient]);
}

/** Mount once, anywhere inside `QueryClientProvider` — see `src/app/_layout.tsx`. Renders nothing. */
export function ShareTransferSocketBridge() {
  useShareTransferSocket();
  return null;
}
