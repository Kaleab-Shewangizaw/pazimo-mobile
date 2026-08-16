import { StorageKeys, storage } from '@/lib/storage';

/**
 * A local ledger of every ticket bought on this device.
 *
 * `GET /api/tickets/my-tickets` needs a bearer token, and checkout is
 * guest-first — the account the backend auto-creates during payment usually
 * signs the buyer in, but not always (creation can fail on a duplicate, and a
 * session can expire). Without this, a buyer in that state would open Tickets
 * and see nothing, which is the one outcome a ticket app cannot have.
 *
 * Ids are kept newest-first and are safe to expose: `GET /tickets/public/details/:id`
 * is deliberately public, since that link is what a guest is emailed too.
 */

/** Enough for any realistic device history; older entries fall off the end. */
const MAX_ENTRIES = 100;

async function read(): Promise<string[]> {
  const raw = await storage.get(StorageKeys.deviceTickets);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function loadDeviceTicketIds(): Promise<string[]> {
  return read();
}

/** Idempotent — re-recording a ticket just moves it back to the front. */
export async function rememberDeviceTickets(ids: string[]): Promise<string[]> {
  const existing = await read();
  const next = [...new Set([...ids, ...existing])].slice(0, MAX_ENTRIES);
  await storage.set(StorageKeys.deviceTickets, JSON.stringify(next));
  return next;
}
