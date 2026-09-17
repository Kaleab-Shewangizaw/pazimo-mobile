import { useMemo } from 'react';

import { groupSharesByCounterparty } from '@/lib/conversations';
import {
  beverageShareToViewModel,
  cinemaShareToViewModel,
  ticketShareToViewModel,
} from '@/lib/share-item-view-model';
import { useBeverageShares } from '@/queries/beverage-shares';
import { useCinemaShares } from '@/queries/cinema-shares';
import { useTicketShares } from '@/queries/ticket-shares';
import { useAuthStore } from '@/stores/use-auth-store';

/**
 * Every share this account has sent or received — event tickets, drinks, and
 * cinema tickets/snacks — collapsed into one chat timeline per counterparty.
 * The one hook `shares.tsx` and the conversation screen read from; each
 * underlying list keeps its own typed query/cache, so a socket-triggered
 * invalidation of just one domain still re-derives this correctly without
 * refetching the other two.
 */
export function useAllShareConversations() {
  const myId = useAuthStore((s) => s.user?._id);
  const {
    shares: ticketShares,
    isLoading: ticketsLoading,
    isError: ticketsError,
    error: ticketsErr,
    refetch: refetchTickets,
  } = useTicketShares({});
  const {
    shares: beverageShares,
    isLoading: beveragesLoading,
    isError: beveragesError,
    refetch: refetchBeverages,
  } = useBeverageShares({});
  const {
    shares: cinemaShares,
    isLoading: cinemaLoading,
    isError: cinemaError,
    refetch: refetchCinema,
  } = useCinemaShares({});

  const items = useMemo(
    () => [
      ...ticketShares.map(ticketShareToViewModel),
      ...beverageShares.map(beverageShareToViewModel),
      ...cinemaShares.map(cinemaShareToViewModel),
    ],
    [ticketShares, beverageShares, cinemaShares],
  );

  const conversations = useMemo(() => groupSharesByCounterparty(items, myId), [items, myId]);

  const refetch = () => Promise.all([refetchTickets(), refetchBeverages(), refetchCinema()]);

  return {
    conversations,
    isLoading: ticketsLoading || beveragesLoading || cinemaLoading,
    isError: ticketsError || beveragesError || cinemaError,
    error: ticketsErr,
    refetch,
  };
}
