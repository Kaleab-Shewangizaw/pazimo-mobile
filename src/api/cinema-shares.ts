import { getData, postData } from '@/api/client';
import type {
  CinemaShare,
  CinemaShareItemType,
  ShareStatus,
  TransferableCinemaConcession,
  TransferableCinemaTicket,
} from '@/types/api';

/**
 * The cinema twin of `api/beverage-shares.ts` — same shape throughout.
 * Recipient search/contacts hit the same shared `/ticket-shares/*` endpoints
 * as every other share kind (a plain user lookup, nothing cinema-specific),
 * so there is no `/cinema-shares/search` or `/cinema-shares/contacts` here.
 */

export type CinemaShareItemInput = { itemId: string; quantity: number };

export async function createCinemaShare(payload: {
  toUserId: string;
  itemType: CinemaShareItemType;
  items: CinemaShareItemInput[];
  message?: string;
  idempotencyKey?: string;
}): Promise<CinemaShare> {
  return postData<CinemaShare>('/cinema-shares', payload);
}

export type ShareDirection = 'sent' | 'received';

export async function fetchCinemaShares(
  params: { direction?: ShareDirection; status?: ShareStatus } = {},
): Promise<CinemaShare[]> {
  return getData<CinemaShare[]>('/cinema-shares', { params });
}

/** Recipient only. Ownership of the ticket/snack moves now. */
export async function acceptCinemaShare(shareId: string): Promise<CinemaShare> {
  return postData<CinemaShare>(`/cinema-shares/${shareId}/accept`);
}

/** Recipient only. */
export async function declineCinemaShare(shareId: string): Promise<CinemaShare> {
  return postData<CinemaShare>(`/cinema-shares/${shareId}/decline`);
}

/** Sender only, while still pending. */
export async function cancelCinemaShare(shareId: string): Promise<CinemaShare> {
  return postData<CinemaShare>(`/cinema-shares/${shareId}/cancel`);
}

/** Every cinema ticket this account currently holds that is free to send — the cinema-ticket-attach picker's data source. */
export async function fetchTransferableCinemaTickets(): Promise<TransferableCinemaTicket[]> {
  return getData<TransferableCinemaTicket[]>('/cinemas/my-tickets/transferable');
}

/** Every cinema snack this account currently holds that is free to send — the cinema-snack-attach picker's data source. */
export async function fetchTransferableCinemaConcessions(): Promise<TransferableCinemaConcession[]> {
  return getData<TransferableCinemaConcession[]>('/cinemas/my-concessions/transferable');
}
