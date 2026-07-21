import { api, getData } from '@/api/client';
import type { OffsetMeta, PagedEnvelope, PazimoEvent } from '@/types/api';

/**
 * `GET /api/events` is the only page/limit paginated endpoint in the API, which
 * makes it the one usable source for an infinite feed. It ignores every filter
 * except `page` and `limit` — there is no category, city, price, search or sort
 * support on any event route, so all filtering happens client-side for now.
 */
export async function fetchEventsPage(params: { page: number; limit: number }) {
  const res = await api.get<{
    data: PazimoEvent[];
    pagination: PagedEnvelope;
  }>('/events', { params });
  return { events: res.data.data, pagination: res.data.pagination };
}

/**
 * The public, unauthenticated feed. Supports `isFeatured` / `isTrending` and
 * offset paging — but *only* applies a limit when one is passed. Omitting
 * `limit` returns the entire collection, so always pass one.
 */
export async function fetchPublicEvents(params: {
  limit: number;
  skip?: number;
  isFeatured?: boolean;
  isTrending?: boolean;
  sort?: string;
}) {
  const res = await api.get<{ data: PazimoEvent[]; meta: OffsetMeta }>(
    '/events/public-events',
    {
      params: {
        limit: params.limit,
        skip: params.skip,
        sort: params.sort,
        // The server activates these only on the literal string "true".
        isFeatured: params.isFeatured ? 'true' : undefined,
        isTrending: params.isTrending ? 'true' : undefined,
      },
    },
  );
  return { events: res.data.data, meta: res.data.meta };
}

/**
 * Banner events. `bannerStatus` is settable by admins but not queryable on any
 * endpoint, so the filter has to happen here. Kept to a bounded fetch rather
 * than pulling the whole collection.
 */
export async function fetchBannerEvents(limit = 40): Promise<PazimoEvent[]> {
  const { events } = await fetchPublicEvents({ limit, sort: '-createdAt' });
  return events.filter((e) => e.bannerStatus);
}

const OBJECT_ID = /^[a-f\d]{24}$/i;
const SHORT_ID = /^[a-z\d]{4}$/i;

/**
 * Resolves either a 24-char ObjectId or a 4-char shortId.
 *
 * Note this deliberately avoids `GET /api/events/:id`, which sits behind the
 * router's auth barrier and is scoped to the owning organizer — a customer
 * always gets a 404 from it. `/details/:id` is the public read.
 */
export async function fetchEvent(idOrShortId: string): Promise<PazimoEvent> {
  if (SHORT_ID.test(idOrShortId) && !OBJECT_ID.test(idOrShortId)) {
    return getData<PazimoEvent>(`/events/short/${idOrShortId}`);
  }
  return getData<PazimoEvent>(`/events/details/${idOrShortId}`);
}

/* ---------------------------- wishlist ---------------------------- */

/** Requires a bearer token; there is no guest wishlist on the server. */
export function fetchWishlist(): Promise<PazimoEvent[]> {
  return getData<PazimoEvent[]>('/events/wishlist');
}

/** Returns the updated list of event ids. Omitting `action` toggles. */
export async function updateWishlist(
  eventId: string,
  action: 'add' | 'remove',
): Promise<string[]> {
  const res = await api.post<{ success: boolean; message: string; data: string[] }>(
    '/events/wishlist',
    { eventId, action },
  );
  return res.data.data;
}
