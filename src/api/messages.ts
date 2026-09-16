import { deleteData, deleteRaw, getData, patchData, postData, postRaw } from '@/api/client';
import type {
  BlockedUser,
  ContactCard,
  ContactSummary,
  ConversationSummary,
  DeletedMessageAck,
  Message,
  MessagesPage,
} from '@/types/api';

/**
 * Free-text chat — a separate backend domain from the three `*-shares.ts`
 * clients (a message has nothing to attach to, unlike a ticket/drink/cinema
 * transfer), but the same thin-REST-client shape. Endpoints are keyed by
 * counterparty user id, not a conversation id — this app never needs to know
 * a `Conversation._id` exists, the same way it never needs a share's
 * underlying thread id.
 */

/** The Chats tab's data source — every conversation this account is in, newest activity first. */
export function fetchConversations(): Promise<ConversationSummary[]> {
  return getData<ConversationSummary[]>('/conversations');
}

/** Cursor-paginated history with one counterparty. Omit `before` for the newest page. */
export function fetchMessages(
  counterpartyId: string,
  params: { before?: string; limit?: number } = {},
): Promise<MessagesPage> {
  return getData<MessagesPage>(`/conversations/${counterpartyId}/messages`, { params });
}

export function sendMessage(counterpartyId: string, text: string): Promise<Message> {
  return postData<Message>(`/conversations/${counterpartyId}/messages`, { text });
}

/** Sender-only — the server rejects an edit from anyone else. */
export function editMessage(counterpartyId: string, messageId: string, text: string): Promise<Message> {
  return patchData<Message>(`/conversations/${counterpartyId}/messages/${messageId}`, { text });
}

/** Sender-only. Removes the message from history entirely — nothing marks that it ever existed. */
export function deleteMessage(counterpartyId: string, messageId: string): Promise<DeletedMessageAck> {
  return deleteData<DeletedMessageAck>(`/conversations/${counterpartyId}/messages/${messageId}`);
}

/** Marks every unread message from `counterpartyId` as read, clearing this thread's Chats-list badge. */
export function markConversationRead(counterpartyId: string): Promise<void> {
  return postRaw<{ success: boolean }>(`/conversations/${counterpartyId}/read`).then(() => undefined);
}

/**
 * "Delete chat" — clears this account's own view of the whole thread with
 * `counterpartyId`. The other person's copy is untouched, and it isn't
 * sender-restricted like `deleteMessage`: either side can clear their own
 * view of a conversation they're in.
 */
export function clearConversation(counterpartyId: string): Promise<void> {
  return deleteRaw<{ success: boolean }>(`/conversations/${counterpartyId}`).then(() => undefined);
}

/** A person's username always, their phone number only once you've both added each other. */
export function fetchContactCard(counterpartyId: string): Promise<ContactCard> {
  return getData<ContactCard>(`/conversations/${counterpartyId}/contact-card`);
}

export function addContact(counterpartyId: string): Promise<ContactCard> {
  return postData<ContactCard>(`/conversations/${counterpartyId}/contact`);
}

export function removeContact(counterpartyId: string): Promise<ContactCard> {
  return deleteData<ContactCard>(`/conversations/${counterpartyId}/contact`);
}

/** Every person this account has added — the account menu's Contacts list. */
export function fetchContacts(): Promise<ContactSummary[]> {
  return getData<ContactSummary[]>('/conversations/contacts');
}

export function fetchBlockedUsers(): Promise<BlockedUser[]> {
  return getData<BlockedUser[]>('/conversations/blocked');
}

/** Also drops any existing contact relation between the two accounts, server-side. */
export function blockUser(counterpartyId: string): Promise<void> {
  return postRaw<{ success: boolean }>(`/conversations/${counterpartyId}/block`).then(
    () => undefined,
  );
}

export function unblockUser(counterpartyId: string): Promise<void> {
  return deleteRaw<{ success: boolean }>(`/conversations/${counterpartyId}/block`).then(
    () => undefined,
  );
}
