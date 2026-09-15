import { getData } from '@/api/client';
import type { EventVenue } from '@/types/api';

/**
 * The event-venue directory. Mounted at `/api/event-venues`, mirroring the
 * cinema browsing surface — a single public, anonymous, name/city-search list.
 */

/** Every active venue, name-sorted. Both filters are optional and server-side. */
export async function fetchEventVenues(params?: { city?: string; search?: string }) {
  return getData<EventVenue[]>('/event-venues/public', { params });
}
