import { getData, postData } from '@/api/client';
import { Env } from '@/lib/env';
import type {
  CinemaCheckoutBasket,
  CinemaCheckoutQuote,
  CinemaCheckoutStartRequest,
  CinemaCheckoutStartResponse,
  CinemaOrder,
  CinemaScreenConfig,
  CinemaSeatMap,
} from '@/types/api';

/**
 * Buying a seat: the seat map, the quote, and the checkout that locks seats and
 * starts a payment. Mounted at `/api/cinemas/public/*`, mirroring `cinema.ts`.
 *
 * The flow, and why it is split this way:
 *
 *   fetchShowtimeSeats     what the room looks like and what is free
 *   quoteCinemaCheckout    what a basket would cost — reserves nothing
 *   startCinemaCheckout    locks the seats and starts a payment
 *   cancelCinemaCheckout   give up before paying and hand the seats straight back
 *   fetchCinemaOrder       what a (possibly still-settling) order produced
 *
 * The quote step exists so browsing snacks or changing seats never takes a
 * lock — only `startCinemaCheckout` does. The server also never trusts a
 * client-sent total: every request here sends WHAT is wanted, never what it
 * costs.
 */

export function fetchShowtimeSeats(showtimeId: string): Promise<CinemaSeatMap> {
  return getData<CinemaSeatMap>(`/cinemas/public/showtimes/${showtimeId}/seats`);
}

/** The one looping clip that plays behind every cinema's seat map — see `useScreenVideo`. */
export function fetchScreenVideo(): Promise<CinemaScreenConfig> {
  return getData<CinemaScreenConfig>('/cinemas/public/screen-video');
}

export function quoteCinemaCheckout(basket: CinemaCheckoutBasket): Promise<CinemaCheckoutQuote> {
  return postData<CinemaCheckoutQuote>('/cinemas/public/checkout/quote', basket);
}

export function startCinemaCheckout(
  body: CinemaCheckoutStartRequest,
): Promise<CinemaCheckoutStartResponse> {
  return postData<CinemaCheckoutStartResponse>('/cinemas/public/checkout', body);
}

/**
 * Releases a still-pending order's seat holds. Best-effort by design — a paid
 * order refuses to cancel server-side, and an abandoned one expires on its own
 * via the hold TTL anyway.
 */
export function cancelCinemaCheckout(
  transactionId: string,
): Promise<{ transactionId: string; released: number; status: string }> {
  return postData(`/cinemas/public/checkout/${transactionId}/cancel`);
}

/** Everything one order produced — the tickets and the snacks. Keyed by transaction id. */
export function fetchCinemaOrder(transactionId: string): Promise<CinemaOrder> {
  return getData<CinemaOrder>(`/cinemas/public/orders/${transactionId}`);
}

/** Every cinema order this account has paid for — the Tickets tab's Movies list. */
export function fetchMyCinemaOrders(): Promise<CinemaOrder[]> {
  return getData<CinemaOrder[]>('/cinemas/my-orders');
}

/** Rendered server-side on demand — nothing to fetch, just an image URL. */
export function cinemaTicketQrUrl(ticketId: string): string {
  return `${Env.apiUrl}/api/cinemas/public/tickets/${ticketId}/qr.png`;
}
