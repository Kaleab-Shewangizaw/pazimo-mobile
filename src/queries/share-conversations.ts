import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo } from 'react';

import { groupSharesByCounterparty, pendingIncomingCounterpartyIds } from '@/lib/conversations';
import {
  beverageShareToViewModel,
  cinemaShareToViewModel,
  ticketShareToViewModel,
} from '@/lib/share-item-view-model';
import { useBeverageShares } from '@/queries/beverage-shares';
import { useCinemaShares } from '@/queries/cinema-shares';
import { useConversationsList } from '@/queries/messages';
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

/**
 * Whether the home screen's Chats button should show its red dot — true
 * exactly when the Chats list itself shows something: a thread with unread
 * messages, or one with a share of theirs still waiting on me. It reads the
 * very same queries `shares.tsx` renders from (not separate
 * `received`/`pending`-filtered ones), so the dot can't disagree with the
 * list: a refresh there clears it here, and a share from a thread that isn't
 * in the list (cleared, blocked) can't light it. Re-read whenever home
 * regains focus — those share lists have no fallback poll, so without a live
 * socket they'd otherwise only ever update on a remount.
 */
export function useChatsNeedAttention(): boolean {
  const myId = useAuthStore((s) => s.user?._id);
  const { conversations } = useConversationsList();
  const { shares: ticketShares, refetch: refetchTickets } = useTicketShares({});
  const { shares: beverageShares, refetch: refetchBeverages } = useBeverageShares({});
  const { shares: cinemaShares, refetch: refetchCinema } = useCinemaShares({});

  useFocusEffect(
    useCallback(() => {
      if (!myId) return;
      refetchTickets();
      refetchBeverages();
      refetchCinema();
    }, [myId, refetchTickets, refetchBeverages, refetchCinema]),
  );

  return useMemo(() => {
    const pendingIncoming = pendingIncomingCounterpartyIds(
      [
        ...ticketShares.map(ticketShareToViewModel),
        ...beverageShares.map(beverageShareToViewModel),
        ...cinemaShares.map(cinemaShareToViewModel),
      ],
      myId,
    );
    return conversations.some(
      (c) => c.unreadCount > 0 || pendingIncoming.has(c.counterparty._id),
    );
  }, [conversations, ticketShares, beverageShares, cinemaShares, myId]);
}
