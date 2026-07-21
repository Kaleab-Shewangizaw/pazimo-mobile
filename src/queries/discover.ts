import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { fetchPublicEvents } from '@/api/events';
import { queryKeys } from '@/queries/keys';
import type { PazimoEvent } from '@/types/api';

/**
 * No event endpoint accepts a search term, category, city, price or sort filter,
 * so discovery runs entirely client-side over one bounded fetch.
 *
 * This is a stopgap. It is correct for a catalogue of a few hundred events and
 * wrong beyond that — the real fix is a `q`/`category` parameter on
 * `GET /api/events`, after which this hook collapses into a server query.
 */
const CATALOGUE_LIMIT = 200;

export type SortOption = 'newest' | 'soonest';

export type DiscoverFilters = {
  query: string;
  categoryId: string | null;
  sort: SortOption;
};

function useCatalogue() {
  return useQuery({
    queryKey: [...queryKeys.events.all, 'catalogue'],
    queryFn: () => fetchPublicEvents({ limit: CATALOGUE_LIMIT, sort: '-createdAt' }),
    select: (data) => data.events,
    staleTime: 5 * 60 * 1000,
  });
}

function categoryIdOf(event: PazimoEvent): string | null {
  const { category } = event;
  if (!category) return null;
  return typeof category === 'string' ? category : category._id;
}

/** Mirrors the web's search surface: title, description, city and address. */
function matchesQuery(event: PazimoEvent, needle: string): boolean {
  if (!needle) return true;
  const haystack = [
    event.title,
    event.description,
    event.location?.city,
    event.location?.address,
    typeof event.category === 'object' ? event.category?.name : null,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(needle);
}

export function useDiscover(filters: DiscoverFilters) {
  const catalogue = useCatalogue();

  const results = useMemo(() => {
    const events = catalogue.data;
    if (!events) return [];

    const needle = filters.query.trim().toLowerCase();
    const filtered = events.filter(
      (event) =>
        matchesQuery(event, needle) &&
        (!filters.categoryId || categoryIdOf(event) === filters.categoryId),
    );

    if (filters.sort === 'soonest') {
      return [...filtered].sort(
        (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
      );
    }
    return filtered;
  }, [catalogue.data, filters.categoryId, filters.query, filters.sort]);

  return { ...catalogue, results };
}
