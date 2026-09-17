import { useRespondToBeverageShare } from '@/queries/beverage-shares';
import { useRespondToCinemaShare } from '@/queries/cinema-shares';
import { useRespondToShare } from '@/queries/ticket-shares';
import type { ShareKind } from '@/lib/share-item-view-model';

/**
 * `ShareRow`/`ShareDetailSheet` only ever see a `ShareItemViewModel`, never
 * which backend it came from — this is the one place that routes an
 * accept/decline/cancel back to the right typed mutation hook by `kind`.
 *
 * All three underlying hooks are called unconditionally (hooks can't be
 * called conditionally), which is cheap: none of them does any network work
 * until its own `.accept()`/`.decline()`/`.cancel()` is actually invoked.
 */
export function useRespondToShareItem(kind: ShareKind) {
  const ticket = useRespondToShare();
  const beverage = useRespondToBeverageShare();
  const cinema = useRespondToCinemaShare();

  if (kind === 'BEVERAGE') return beverage;
  if (kind === 'CINEMA_TICKET' || kind === 'CINEMA_CONCESSION') return cinema;
  return ticket;
}
