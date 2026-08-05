import { useMemo } from 'react';

import { useCategories } from '@/queries/categories';
import { useEventFeed } from '@/queries/events';
import type { PazimoEvent } from '@/types/api';

/**
 * "Activities" is a client-side grouping, not a backend concept — neither
 * Category nor Event carries an activity flag, so membership is decided by
 * matching category *names*. A category added server-side is picked up here
 * automatically as long as its name matches; widen these patterns to pull in
 * anything else that should count.
 */
const ACTIVITY_PATTERNS: RegExp[] = [
  /sport|game|match|football|soccer|basketball|tennis|run|marathon/i,
  /movie|cinema|film|screening/i,
  /fitness|yoga|gym|hike|hiking|outdoor|adventure/i,
];

export function isActivityCategory(name: string): boolean {
  return ACTIVITY_PATTERNS.some((pattern) => pattern.test(name));
}

function isActivityEvent(event: PazimoEvent, activityIds: Set<string>): boolean {
  const { category } = event;
  if (!category) return false;
  // Public reads populate the category, so the name is matched directly. On
  // `GET /api/events` it is a bare id, which has to be resolved through the
  // category list instead.
  return typeof category === 'object'
    ? isActivityCategory(category.name)
    : activityIds.has(category);
}

/**
 * Rides the same feed and category caches as the rest of the home screen —
 * react-query dedupes by key, so this adds no extra requests.
 *
 * Like the category filter on the main rail, this only sees the pages fetched
 * so far. That is the same stopgap `useDiscover` documents: the real fix is a
 * `category` parameter on `GET /api/events`.
 */
export function useActivityEvents() {
  const categories = useCategories();
  const feed = useEventFeed();

  const activityIds = useMemo(() => {
    const ids = (categories.data ?? []).filter((c) => isActivityCategory(c.name)).map((c) => c._id);
    return new Set(ids);
  }, [categories.data]);

  const events = useMemo(
    () => (feed.data ?? []).filter((event) => isActivityEvent(event, activityIds)),
    [feed.data, activityIds],
  );

  return {
    events,
    isLoading: feed.isLoading || categories.isLoading,
    isError: feed.isError,
  };
}
