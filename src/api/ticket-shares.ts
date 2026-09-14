import { getData, postData } from '@/api/client';
import type { ShareContact, ShareStatus, ShareUser, TicketShare } from '@/types/api';

/** Backend requires at least 2 characters — shorter queries are never sent. */
export async function searchShareRecipients(q: string): Promise<ShareUser[]> {
  return getData<ShareUser[]>('/ticket-shares/search', { params: { q } });
}

/** People this account has shared with or received from, most recent first. */
export async function fetchShareContacts(): Promise<ShareContact[]> {
  return getData<ShareContact[]>('/ticket-shares/contacts');
}

export type ShareItemInput = { ticketId: string; quantity: number };

export async function createTicketShare(payload: {
  toUserId: string;
  items: ShareItemInput[];
  message?: string;
  /** Same key + same sender replays the original share instead of creating a second one. */
  idempotencyKey?: string;
}): Promise<TicketShare> {
  return postData<TicketShare>('/ticket-shares', payload);
}

export type ShareDirection = 'sent' | 'received';

export async function fetchTicketShares(
  params: { direction?: ShareDirection; status?: ShareStatus } = {},
): Promise<TicketShare[]> {
  return getData<TicketShare[]>('/ticket-shares', { params });
}

/** Recipient only. Ownership of every ticket in the share moves now. */
export async function acceptTicketShare(shareId: string): Promise<TicketShare> {
  return postData<TicketShare>(`/ticket-shares/${shareId}/accept`);
}

/** Recipient only. */
export async function declineTicketShare(shareId: string): Promise<TicketShare> {
  return postData<TicketShare>(`/ticket-shares/${shareId}/decline`);
}

/** Sender only, while still pending. */
export async function cancelTicketShare(shareId: string): Promise<TicketShare> {
  return postData<TicketShare>(`/ticket-shares/${shareId}/cancel`);
}
