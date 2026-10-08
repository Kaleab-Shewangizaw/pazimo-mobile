import { useSyncExternalStore } from 'react';

import { getSocketStatus, subscribeSocketStatus, type SocketStatus } from '@/lib/socket';

/** The shared socket's live status — see `SocketStatus` in `lib/socket.ts`. */
export function useSocketStatus(): SocketStatus {
  return useSyncExternalStore(subscribeSocketStatus, getSocketStatus, getSocketStatus);
}
