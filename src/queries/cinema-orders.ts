import { useQuery } from '@tanstack/react-query';

import { fetchCinemaOrder, fetchMyCinemaOrders } from '@/api/cinema-checkout';
import { queryKeys } from '@/queries/keys';
import { useAuthStore } from '@/stores/use-auth-store';

/** Cinema orders settle once and never change afterward — a stale QR is still a valid QR. */
const ORDER_STALE_TIME = 5 * 60 * 1000;

/** Every movie ticket (and the snacks bought alongside it) this account has paid for — the Tickets tab's Movies list. */
export function useMyCinemaOrders() {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);

  const query = useQuery({
    queryKey: queryKeys.cinemaCheckout.myOrders(),
    queryFn: fetchMyCinemaOrders,
    enabled: hydrated && Boolean(token),
    staleTime: ORDER_STALE_TIME,
  });

  return { ...query, orders: query.data ?? [] };
}

/** One order by transaction id — what a Movies-list row opens into. */
export function useCinemaOrder(transactionId: string | undefined) {
  const query = useQuery({
    queryKey: queryKeys.cinemaCheckout.order(transactionId ?? ''),
    queryFn: () => fetchCinemaOrder(transactionId!),
    enabled: Boolean(transactionId),
    staleTime: ORDER_STALE_TIME,
  });

  return { ...query, order: query.data };
}
