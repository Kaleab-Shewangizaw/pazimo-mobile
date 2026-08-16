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

export type DateRange = 'any' | 'today' | 'week' | 'month';

export type DiscoverFilters = {
  query: string;
  categoryId: string | null;
  sort: SortOption;
  dateRange: DateRange;
};

/** Everything the filter sheet owns — the search field keeps `query` to itself. */
export type PanelFilters = Omit<DiscoverFilters, 'query'>;

export const DEFAULT_FILTERS: PanelFilters = {
  categoryId: null,
  sort: 'newest',
  dateRange: 'any',
};

/** How many of the sheet's controls are off their default, for the badge. */
export function activeFilterCount(filters: PanelFilters): number {
  return (
    (filters.categoryId ? 1 : 0) +
    (filters.dateRange !== DEFAULT_FILTERS.dateRange ? 1 : 0) +
    (filters.sort !== DEFAULT_FILTERS.sort ? 1 : 0)
  );
}

function useCatalogue() {
  return useQuery({
    queryKey: [...queryKeys.events.all, 'catalogue'],
    queryFn: () => fetchPublicEvents({ limit: CATALOGUE_LIMIT, sort: '-createdAt' }),
    select: (data) => data.events,
    staleTime: 5 * 60 * 1000,
  });
}

export function categoryIdOf(event: PazimoEvent): string | null {
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

/**
 * Windows run forward from the start of today, so "this week" means the next
 * seven days rather than a calendar week — which is what someone browsing for
 * something to do actually means by it. A past event falls outside every window
 * except "any time".
 */
function withinRange(event: PazimoEvent, range: DateRange): boolean {
  if (range === 'any') return true;

  const start = new Date(event.startDate);
  if (Number.isNaN(start.getTime())) return false;

  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const to = new Date(from);
  if (range === 'today') to.setDate(to.getDate() + 1);
  else if (range === 'week') to.setDate(to.getDate() + 7);
  else to.setMonth(to.getMonth() + 1);

  return start.getTime() >= from.getTime() && start.getTime() < to.getTime();
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
        (!filters.categoryId || categoryIdOf(event) === filters.categoryId) &&
        withinRange(event, filters.dateRange),
    );

    if (filters.sort === 'soonest') {
      return [...filtered].sort(
        (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
      );
    }
    return filtered;
  }, [catalogue.data, filters.categoryId, filters.dateRange, filters.query, filters.sort]);

  return { ...catalogue, results };
}
