import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { ApiError } from '@/api/client';
import {
  fetchEventBeverageCatalog,
  fetchMyRefillOrders,
  fetchRefillEvents,
  fetchRefillVenues,
  fetchVenueBeverageCatalog,
  quoteEventRefillCheckout,
  quoteVenueRefillCheckout,
} from '@/api/beverages';
import { queryKeys } from '@/queries/keys';
import { useAuthStore } from '@/stores/use-auth-store';
import type { RefillBasket, RefillCheckoutRequest } from '@/types/api';

/** Events this account can buy drinks for — the Refill page's Events tab. */
export function useRefillEvents() {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);

  const query = useQuery({
    queryKey: queryKeys.refill.events(),
    queryFn: fetchRefillEvents,
    enabled: hydrated && Boolean(token),
  });

  return { ...query, events: query.data ?? [] };
}

/** One event's buyable line-up. Server 403s if this account holds no valid ticket to it. */
export function useEventBeverageCatalog(eventId: string | undefined) {
  const token = useAuthStore((s) => s.token);

  const query = useQuery({
    queryKey: queryKeys.refill.eventCatalog(eventId ?? ''),
    queryFn: () => fetchEventBeverageCatalog(eventId!),
    enabled: Boolean(token) && Boolean(eventId),
  });

  return { ...query, items: query.data?.data ?? [], event: query.data?.event };
}

/** Venues currently selling drinks — the Refill page's Venues tab. */
export function useRefillVenues() {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);

  const query = useQuery({
    queryKey: queryKeys.refill.venues(),
    queryFn: fetchRefillVenues,
    enabled: hydrated && Boolean(token),
  });

  return { ...query, venues: query.data ?? [] };
}

/** One venue's buyable line-up — no ticket needed. */
export function useVenueBeverageCatalog(venueId: string | undefined) {
  const token = useAuthStore((s) => s.token);

  const query = useQuery({
    queryKey: queryKeys.refill.venueCatalog(venueId ?? ''),
    queryFn: () => fetchVenueBeverageCatalog(venueId!),
    enabled: Boolean(token) && Boolean(venueId),
  });

  return { ...query, items: query.data?.data ?? [], venue: query.data?.venue };
}

/** Every drink order this account has made, event and venue merged — the Refill page's "Your orders" list. */
export function useMyRefillOrders() {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);

  const query = useQuery({
    queryKey: queryKeys.refill.myOrders(),
    queryFn: fetchMyRefillOrders,
    enabled: hydrated && Boolean(token),
  });

  return { ...query, orders: query.data ?? [] };
}

const QUOTE_DEBOUNCE_MS = 350;

/**
 * A live price for the basket the checkout sheet currently holds — mirrors
 * `useCinemaQuote` exactly, down to the debounce, for the same reason: never
 * worth caching across screens, only ever "what would THIS basket cost now".
 */
function useRefillQuote(
  quoteFn: (items: RefillCheckoutRequest['items']) => Promise<RefillBasket>,
  items: RefillCheckoutRequest['items'] | null,
) {
  const [quote, setQuote] = useState<RefillBasket | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const itemsKey = items ? JSON.stringify(items) : null;

  useEffect(() => {
    if (!items || !itemsKey) return;

    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const result = await quoteFn(items);
        if (id !== requestId.current) return;
        setQuote(result);
        setError(null);
      } catch (err) {
        if (id !== requestId.current) return;
        setError(err instanceof ApiError ? err.message : 'Could not price this order.');
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    }, QUOTE_DEBOUNCE_MS);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the serialized items, not identity.
  }, [itemsKey]);

  return items ? { quote, loading, error } : { quote: null, loading: false, error: null };
}

export function useEventRefillQuote(eventId: string | undefined, items: RefillCheckoutRequest['items'] | null) {
  return useRefillQuote((wanted) => quoteEventRefillCheckout(eventId!, wanted), eventId ? items : null);
}

export function useVenueRefillQuote(venueId: string | undefined, items: RefillCheckoutRequest['items'] | null) {
  return useRefillQuote((wanted) => quoteVenueRefillCheckout(venueId!, wanted), venueId ? items : null);
}
