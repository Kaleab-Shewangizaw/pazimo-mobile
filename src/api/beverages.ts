import { getData, getRaw, postData } from '@/api/client';
import { Env } from '@/lib/env';
import type {
  RefillBasket,
  RefillCheckoutRequest,
  RefillCheckoutStartResponse,
  RefillEventCatalog,
  RefillEventSummary,
  RefillOrder,
  RefillOrderSummary,
  RefillVenueCatalog,
  RefillVenueSummary,
} from '@/types/api';

/** Events this account holds a valid, paid ticket to and that sell drinks. */
export function fetchRefillEvents(): Promise<RefillEventSummary[]> {
  return getData<RefillEventSummary[]>('/beverages/refill/events');
}

/** The buyable line-up for one event. 403s server-side if the account has no valid ticket to it. */
export function fetchEventBeverageCatalog(eventId: string): Promise<RefillEventCatalog> {
  return getRaw<RefillEventCatalog>(`/beverages/refill/events/${eventId}/catalog`);
}

/** Venues currently selling drinks — no ticket required. */
export function fetchRefillVenues(): Promise<RefillVenueSummary[]> {
  return getData<RefillVenueSummary[]>('/venues/refill');
}

/** The buyable line-up for one venue. */
export function fetchVenueBeverageCatalog(venueId: string): Promise<RefillVenueCatalog> {
  return getRaw<RefillVenueCatalog>(`/venues/${venueId}/refill-catalog`);
}

/**
 * Paying for drinks — mirrors `api/cinema-checkout.ts`'s quote/start/order
 * triad. Two channels, never crossed: an event basket prices against the
 * event's own line-up and a venue basket against the venue's, so the two
 * halves below are kept as separate functions rather than one parameterised
 * over "channel" the way the server itself never merges them either.
 */

export function quoteEventRefillCheckout(
  eventId: string,
  items: RefillCheckoutRequest['items'],
): Promise<RefillBasket> {
  return postData<RefillBasket>(`/beverages/refill/events/${eventId}/checkout/quote`, {
    items: items.map(({ id, quantity }) => ({ eventBeverageId: id, quantity })),
  });
}

export function startEventRefillCheckout(
  eventId: string,
  body: RefillCheckoutRequest,
): Promise<RefillCheckoutStartResponse> {
  const { items, ...rest } = body;
  return postData<RefillCheckoutStartResponse>(`/beverages/refill/events/${eventId}/checkout`, {
    ...rest,
    items: items.map(({ id, quantity }) => ({ eventBeverageId: id, quantity })),
  });
}

/** The (possibly still-settling) order this payment produced. */
export function fetchEventRefillOrder(transactionId: string): Promise<RefillOrder> {
  return getData<RefillOrder>(`/beverages/refill/orders/${transactionId}`);
}

export function quoteVenueRefillCheckout(
  venueId: string,
  items: RefillCheckoutRequest['items'],
): Promise<RefillBasket> {
  return postData<RefillBasket>(`/venues/${venueId}/refill/checkout/quote`, {
    items: items.map(({ id, quantity }) => ({ venueBeverageId: id, quantity })),
  });
}

export function startVenueRefillCheckout(
  venueId: string,
  body: RefillCheckoutRequest,
): Promise<RefillCheckoutStartResponse> {
  const { items, ...rest } = body;
  return postData<RefillCheckoutStartResponse>(`/venues/${venueId}/refill/checkout`, {
    ...rest,
    items: items.map(({ id, quantity }) => ({ venueBeverageId: id, quantity })),
  });
}

export function fetchVenueRefillOrder(transactionId: string): Promise<RefillOrder> {
  return getData<RefillOrder>(`/venues/refill/orders/${transactionId}`);
}

/** Every refill payment this account has made, event and venue merged — the "Your orders" list. */
export function fetchMyRefillOrders(): Promise<RefillOrderSummary[]> {
  return getData<RefillOrderSummary[]>('/beverages/refill/my-orders');
}

/** Rendered server-side on demand — the barcode a customer shows at the counter to collect their drink. */
export function refillSaleBarcodeUrl(referenceNumber: string): string {
  return `${Env.apiUrl}/api/beverages/refill/sales/${referenceNumber}/barcode.png`;
}
