import type { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

import { recordCampaignOpen } from '@/api/app';
import { getActiveConversation } from '@/lib/push-notifications';
import { useAuthStore } from '@/stores/use-auth-store';

type Router = ReturnType<typeof useRouter>;

/**
 * Where a notification leads — one answer for both a tapped push and a tapped
 * row in the Notifications inbox, since an inbox row carries the very payload
 * its push went out with (see `AppNotification.data`).
 */
export function openNotificationTarget(router: Router, data: Record<string, unknown>) {
  // Admin campaigns and test pushes from the dashboard (Admin → App).
  if (data.type === 'campaign' || data.type === 'test') {
    if (typeof data.campaignId === 'string') {
      recordCampaignOpen(data.campaignId).catch(() => {});
    }
    if (typeof data.eventId === 'string' && data.eventId) {
      router.push(`/event/${data.eventId}`);
    } else if (typeof data.url === 'string' && /^https:\/\//i.test(data.url)) {
      WebBrowser.openBrowserAsync(data.url).catch(() => {});
    }
    return;
  }

  // A medal unlocked — straight to the shelf it's now on.
  if (data.type === 'achievement') {
    if (!useAuthStore.getState().token) return;
    router.push('/rewards');
    return;
  }

  // Pazimo Wallet alerts (deposit, payment, refund, freeze, new phone).
  if (data.type === 'wallet') {
    if (!useAuthStore.getState().token) return;
    router.push('/wallet');
    return;
  }

  // Every other push carries `counterpartyId` (see pushService's callers) —
  // a message, a ticket/drink/cinema share, or a response to one, all
  // resolve to "open this conversation." Already looking at it? Then there's
  // nowhere to go — pushing would stack a duplicate screen.
  const counterpartyId = data.counterpartyId;
  if (typeof counterpartyId !== 'string' || !counterpartyId) return;
  if (getActiveConversation() === counterpartyId) return;
  // A signed-out device shouldn't still be getting these, but a push already
  // in the tray from before sign-out can still be tapped.
  if (!useAuthStore.getState().token) return;
  router.push({ pathname: '/conversation/[userId]', params: { userId: counterpartyId } });
}
