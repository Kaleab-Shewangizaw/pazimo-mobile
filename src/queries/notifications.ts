import { useInfiniteQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useCallback } from 'react';

import { fetchNotifications, markNotificationsRead } from '@/api/notifications';
import { queryKeys } from '@/queries/keys';
import { useAuthStore } from '@/stores/use-auth-store';
import type { NotificationsPage } from '@/types/api';

const PAGE_SIZE = 30;

type NotificationsCache = InfiniteData<NotificationsPage, string | undefined>;

/**
 * One cache entry backs both the Notifications screen and the bell's dot on
 * Home — each reads its own slice of it through `select`, so the dot never
 * costs a request of its own.
 */
function useNotificationsQuery<T>(select: (data: NotificationsCache) => T) {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);

  return useInfiniteQuery({
    queryKey: queryKeys.notifications.list(),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => fetchNotifications({ before: pageParam, limit: PAGE_SIZE }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: hydrated && Boolean(token),
    select,
  });
}

const selectList = (data: NotificationsCache) => ({
  notifications: data.pages.flatMap((page) => page.notifications),
  unreadCount: data.pages[0]?.unreadCount ?? 0,
});

const selectUnreadCount = (data: NotificationsCache) => data.pages[0]?.unreadCount ?? 0;

/** The Notifications screen's list, newest first. */
export function useNotifications() {
  const query = useNotificationsQuery(selectList);
  return {
    ...query,
    notifications: query.data?.notifications ?? [],
    unreadCount: query.data?.unreadCount ?? 0,
  };
}

/** The bell's dot — 0 for a guest, who has no inbox. */
export function useUnreadNotificationCount(): number {
  return useNotificationsQuery(selectUnreadCount).data ?? 0;
}

/**
 * Marks rows read — optimistically, so the row and the bell's dot clear on
 * tap rather than a round-trip later — then settles on the server's count.
 * Fire-and-forget like `useMarkConversationRead`: a missed read receipt just
 * catches up on the next refetch. Omit both ids and campaignId to mark all.
 */
export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();

  const submit = useCallback(
    async (target: { ids?: string[]; campaignId?: string } = {}) => {
      const key = queryKeys.notifications.list();
      const now = new Date().toISOString();
      const matches = (n: NotificationsPage['notifications'][number]) =>
        target.ids?.length
          ? target.ids.includes(n._id)
          : target.campaignId
            ? n.kind === 'campaign' && n.data.campaignId === target.campaignId
            : true;

      queryClient.setQueryData<NotificationsCache>(key, (data) => {
        if (!data) return data;
        let cleared = 0;
        const pages = data.pages.map((page) => ({
          ...page,
          notifications: page.notifications.map((n) => {
            if (n.readAt || !matches(n)) return n;
            cleared += 1;
            return { ...n, readAt: now };
          }),
        }));
        // Rows on pages not loaded yet can't be counted here — the server's
        // count below settles it.
        const all = !target.ids?.length && !target.campaignId;
        return {
          ...data,
          pages: pages.map((page) => ({
            ...page,
            unreadCount: all ? 0 : Math.max(0, page.unreadCount - cleared),
          })),
        };
      });

      try {
        const { unreadCount } = await markNotificationsRead(target);
        queryClient.setQueryData<NotificationsCache>(key, (data) =>
          data && { ...data, pages: data.pages.map((page) => ({ ...page, unreadCount })) },
        );
      } catch {
        queryClient.invalidateQueries({ queryKey: key });
      }
    },
    [queryClient],
  );

  return { submit };
}
