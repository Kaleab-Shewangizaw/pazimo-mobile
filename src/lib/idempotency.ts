/**
 * A client-generated key for `POST /ticket-shares`, scoped to one compose
 * session (see `share-ticket-sheet.tsx`'s `reset()`). Retrying the same
 * attempt — a double-tap, or a retry after a dropped connection — reuses it,
 * which is what lets the backend's own idempotency collapse those into the
 * one share instead of creating a duplicate. A new open of the sheet gets a
 * fresh key, so it never gets attached to an unrelated transfer.
 */
let counter = 0;

export function generateIdempotencyKey(): string {
  counter += 1;
  return `${Date.now().toString(36)}-${counter.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
