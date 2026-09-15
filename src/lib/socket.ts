import { io, type Socket } from 'socket.io-client';

import { Env } from '@/lib/env';
import type { DeletedMessageAck, Message, ShareStatus } from '@/types/api';

/**
 * One socket for the whole app, matching how `api/client.ts` keeps one axios
 * instance. The backend authenticates over the socket itself rather than a
 * handshake header: connect, emit `authenticate` with the same bearer token
 * used for HTTP, then wait for the `authenticated` ack before trusting the
 * connection — the server joins the socket to `user_<userId>` on its side.
 *
 * socket.io already retries connection with backoff on its own, so the only
 * thing this module adds on top is re-sending `authenticate` after every
 * reconnect (a fresh transport is not a re-authenticated one).
 */

export type TicketTransferEvent = {
  shareId: string;
  status: ShareStatus;
  fromUser?: { _id: string; firstName: string; lastName?: string; username?: string };
};

export type TicketReceivedEvent = {
  shareId: string;
  items?: unknown;
};

/** `beverage:*`/`cinema:*` carry the same shape as their ticket counterparts. */
type ShareTransferEvent =
  | { type: 'ticket:transfer'; payload: TicketTransferEvent }
  | { type: 'ticket:received'; payload: TicketReceivedEvent }
  | { type: 'beverage:transfer'; payload: TicketTransferEvent }
  | { type: 'beverage:received'; payload: TicketReceivedEvent }
  | { type: 'cinema:transfer'; payload: TicketTransferEvent }
  | { type: 'cinema:received'; payload: TicketReceivedEvent }
  /** Pushed to the recipient's room the instant a message is sent — the exact same shape `POST /conversations/:id/messages` returns. */
  | { type: 'message:new'; payload: Message }
  /** Pushed to the counterparty's room on an edit — same `Message` shape. */
  | { type: 'message:updated'; payload: Message }
  /** Pushed to the counterparty's room on a delete — just the id; the message itself is gone, nothing else to send. */
  | { type: 'message:deleted'; payload: DeletedMessageAck };

type Listener = (event: ShareTransferEvent) => void;

let socket: Socket | null = null;
let currentToken: string | null = null;
const listeners = new Set<Listener>();

function authenticate() {
  if (socket && currentToken) {
    socket.emit('authenticate', currentToken);
  }
}

function ensureSocket(): Socket {
  if (socket) return socket;

  socket = io(Env.apiUrl, {
    autoConnect: false,
    // The default (websocket then poll) can get stuck probing on some mobile
    // networks; forcing websocket first keeps the first connect fast.
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', authenticate);
  socket.on('reconnect', authenticate);
  socket.on('authenticated', (ack: { ok: boolean; message?: string }) => {
    // A rejected token (expired/invalid) won't fix itself by retrying with the
    // same value — drop the connection rather than let socket.io keep
    // reconnecting and re-sending it. The next real sign-in calls
    // `connectSocket` again with a fresh token.
    if (!ack?.ok) socket?.disconnect();
  });
  socket.on('ticket:transfer', (payload: TicketTransferEvent) => {
    listeners.forEach((listen) => listen({ type: 'ticket:transfer', payload }));
  });
  socket.on('ticket:received', (payload: TicketReceivedEvent) => {
    listeners.forEach((listen) => listen({ type: 'ticket:received', payload }));
  });
  socket.on('beverage:transfer', (payload: TicketTransferEvent) => {
    listeners.forEach((listen) => listen({ type: 'beverage:transfer', payload }));
  });
  socket.on('beverage:received', (payload: TicketReceivedEvent) => {
    listeners.forEach((listen) => listen({ type: 'beverage:received', payload }));
  });
  socket.on('cinema:transfer', (payload: TicketTransferEvent) => {
    listeners.forEach((listen) => listen({ type: 'cinema:transfer', payload }));
  });
  socket.on('cinema:received', (payload: TicketReceivedEvent) => {
    listeners.forEach((listen) => listen({ type: 'cinema:received', payload }));
  });
  socket.on('message:new', (payload: Message) => {
    listeners.forEach((listen) => listen({ type: 'message:new', payload }));
  });
  socket.on('message:updated', (payload: Message) => {
    listeners.forEach((listen) => listen({ type: 'message:updated', payload }));
  });
  socket.on('message:deleted', (payload: DeletedMessageAck) => {
    listeners.forEach((listen) => listen({ type: 'message:deleted', payload }));
  });

  return socket;
}

/** Connects (or re-authenticates an existing connection) for the given session token. */
export function connectSocket(token: string) {
  currentToken = token;
  const s = ensureSocket();
  if (s.connected) {
    authenticate();
  } else if (!s.active) {
    s.connect();
  }
}

/** Tears the connection down — call on sign-out so a stale session stops receiving another account's events. */
export function disconnectSocket() {
  currentToken = null;
  socket?.disconnect();
}

/** Subscribes to ticket transfer/receipt events. Returns an unsubscribe function. */
export function subscribeTicketEvents(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
