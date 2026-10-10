import { getData, postData } from '@/api/client';
import type { NotificationsPage } from '@/types/api';

/**
 * The bell's inbox: every ticket/drink/cinema share and admin campaign this
 * account was notified about, whether or not a push actually reached the
 * device. Chat messages aren't in it — the Chats list is their inbox.
 */
export function fetchNotifications(params: { before?: string; limit?: number } = {}): Promise<NotificationsPage> {
  return getData<NotificationsPage>('/app/notifications', { params });
}

/** Marks rows read: by id, a campaign's row by campaign id, or — with neither — everything. */
export function markNotificationsRead(
  target: { ids?: string[]; campaignId?: string } = {},
): Promise<{ unreadCount: number }> {
  return postData<{ unreadCount: number }>('/app/notifications/read', target);
}
