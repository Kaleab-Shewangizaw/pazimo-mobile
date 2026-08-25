import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { ApiError } from '@/api/client';
import { fetchCinemaConcessions } from '@/api/cinema';
import { fetchShowtimeSeats, quoteCinemaCheckout } from '@/api/cinema-checkout';
import { queryKeys } from '@/queries/keys';
import type { CinemaCheckoutBasket, CinemaCheckoutQuote } from '@/types/api';

/** Seat availability is live, not a programme — short-lived, and refetched on focus by the screen. */
const SEATS_STALE_TIME = 10 * 1000;

/** Matches `CINEMA_STALE_TIME` in `queries/cinema.ts`: a cinema's snack lineup changes at human scale. */
const CONCESSIONS_STALE_TIME = 5 * 60 * 1000;

export function useShowtimeSeats(showtimeId: string | undefined) {
  const query = useQuery({
    queryKey: queryKeys.cinemaCheckout.seats(showtimeId ?? ''),
    queryFn: () => fetchShowtimeSeats(showtimeId!),
    enabled: Boolean(showtimeId),
    staleTime: SEATS_STALE_TIME,
  });

  return { ...query, seatMap: query.data };
}

export function useCinemaConcessions(cinemaId: string | undefined) {
  const query = useQuery({
    queryKey: queryKeys.cinemaCheckout.concessions(cinemaId ?? ''),
    queryFn: () => fetchCinemaConcessions(cinemaId!),
    enabled: Boolean(cinemaId),
    staleTime: CONCESSIONS_STALE_TIME,
  });

  return { ...query, concessions: query.data ?? [] };
}

const QUOTE_DEBOUNCE_MS = 350;

/**
 * A live price for whatever basket the caller currently holds.
 *
 * Not a `useQuery`: the basket changes on every tap (a seat, a snack
 * quantity), and the result is never worth caching across screens — it is
 * only ever "what would THIS basket cost right now". Debounced so typing
 * through a snack's quantity stepper doesn't fire a request per tap.
 */
export function useCinemaQuote(basket: CinemaCheckoutBasket | null) {
  const [quote, setQuote] = useState<CinemaCheckoutQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  // Seats/concessions arrays are new references on every basket edit, so the
  // effect keys off their serialized shape rather than the object identity.
  const basketKey = basket ? JSON.stringify(basket) : null;

  useEffect(() => {
    if (!basket || !basketKey) return;

    const id = ++requestId.current;
    // `loading` flips inside the timer callback, not synchronously here — the
    // debounce window itself isn't "loading" yet, only the request that
    // follows it, and this keeps every setState in this effect tied to actual
    // async work rather than firing the moment the effect runs.
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const result = await quoteCinemaCheckout(basket);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the serialized basket, not its identity.
  }, [basketKey]);

  // Gated here rather than reset inside the effect: a `null` basket (the
  // caller has nothing to price yet) should read as "no quote" immediately,
  // not wait on an effect to run and clear out the previous one.
  return basket ? { quote, loading, error } : { quote: null, loading: false, error: null };
}
