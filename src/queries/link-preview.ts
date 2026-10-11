import { useQuery } from '@tanstack/react-query';

import { fetchLinkPreview } from '@/lib/link-preview';
import { queryKeys } from '@/queries/keys';

/**
 * A page's preview barely changes, so one fetch per URL per session is
 * plenty — scrolling back through a thread never re-scrapes it. A failed
 * fetch isn't retried either: most failures (no tags, blocked, offline) are
 * the answer, not a blip, and the message reads fine without a card.
 */
export function useLinkPreview(url: string | undefined) {
  return useQuery({
    queryKey: queryKeys.linkPreview(url ?? ''),
    queryFn: () => fetchLinkPreview(url!),
    enabled: Boolean(url),
    staleTime: Infinity,
    gcTime: 60 * 60 * 1000,
    retry: false,
  });
}
