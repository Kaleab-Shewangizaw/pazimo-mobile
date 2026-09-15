import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { ApiError } from '@/api/client';
import {
  addContact,
  blockUser,
  clearConversation,
  deleteMessage,
  editMessage,
  fetchBlockedUsers,
  fetchContactCard,
  fetchContacts,
  fetchConversations,
  fetchMessages,
  removeContact,
  sendMessage,
  unblockUser,
} from '@/api/messages';
import { queryKeys } from '@/queries/keys';
import { useAuthStore } from '@/stores/use-auth-store';

/** The Chats tab's data source — backend-authoritative, unlike the derived per-share-domain grouping the thread screen still uses for item-transfer bubbles. */
export function useConversationsList() {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);

  const query = useQuery({
    queryKey: queryKeys.conversations.list(),
    queryFn: fetchConversations,
    enabled: hydrated && Boolean(token),
  });

  return { ...query, conversations: query.data ?? [] };
}

const MESSAGES_PAGE_SIZE = 30;

/**
 * One thread's message history, oldest-first for rendering — pages come back
 * newest-first per `fetchMessages`'s cursor contract, so `select` reverses
 * the flattened result once.
 */
export function useConversationMessages(counterpartyId: string | undefined) {
  const token = useAuthStore((s) => s.token);

  const query = useInfiniteQuery({
    queryKey: queryKeys.conversations.messages(counterpartyId ?? ''),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      fetchMessages(counterpartyId!, { before: pageParam, limit: MESSAGES_PAGE_SIZE }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: Boolean(token) && Boolean(counterpartyId),
    select: (data) => data.pages.flatMap((page) => page.messages).reverse(),
  });

  return { ...query, messages: query.data ?? [] };
}

/** Manual mutation shape — matches `useCreateShare`'s, this codebase has no `useMutation` anywhere. */
export function useSendMessage() {
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (counterpartyId: string, text: string) => {
      setSubmitting(true);
      setError(null);
      try {
        const message = await sendMessage(counterpartyId, text);
        queryClient.invalidateQueries({ queryKey: queryKeys.conversations.messages(counterpartyId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.conversations.list() });
        return message;
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Could not send that message. Try again.');
        return null;
      } finally {
        setSubmitting(false);
      }
    },
    [queryClient],
  );

  return { submit, submitting, error };
}

/** Manual mutation shape — matches `useSendMessage`'s. Sender-only; the server rejects anyone else. */
export function useEditMessage() {
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (counterpartyId: string, messageId: string, text: string) => {
      setSubmitting(true);
      setError(null);
      try {
        const message = await editMessage(counterpartyId, messageId, text);
        queryClient.invalidateQueries({ queryKey: queryKeys.conversations.messages(counterpartyId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.conversations.list() });
        return message;
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Could not save that edit. Try again.');
        return null;
      } finally {
        setSubmitting(false);
      }
    },
    [queryClient],
  );

  return { submit, submitting, error };
}

/** Manual mutation shape — matches `useSendMessage`'s. Sender-only, soft delete. */
export function useDeleteMessage() {
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (counterpartyId: string, messageId: string) => {
      setSubmitting(true);
      setError(null);
      try {
        const message = await deleteMessage(counterpartyId, messageId);
        queryClient.invalidateQueries({ queryKey: queryKeys.conversations.messages(counterpartyId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.conversations.list() });
        return message;
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Could not delete that message. Try again.');
        return null;
      } finally {
        setSubmitting(false);
      }
    },
    [queryClient],
  );

  return { submit, submitting, error };
}

/** Manual mutation shape — matches `useSendMessage`'s. "Delete chat": clears this account's own view only, either side may call it. */
export function useClearConversation() {
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (counterpartyId: string) => {
      setSubmitting(true);
      setError(null);
      try {
        await clearConversation(counterpartyId);
        // The cleared history shouldn't flash back in from a stale cache —
        // drop it outright rather than just invalidating, then let the chat
        // list and (if the thread's still open) the empty-state refetch.
        queryClient.removeQueries({ queryKey: queryKeys.conversations.messages(counterpartyId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.conversations.list() });
        return true;
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Could not delete this chat. Try again.');
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [queryClient],
  );

  return { submit, submitting, error };
}

/** A person's contact card — username always, phone only once you've both added each other. */
export function useContactCard(counterpartyId: string | undefined) {
  const token = useAuthStore((s) => s.token);

  const query = useQuery({
    queryKey: queryKeys.conversations.contactCard(counterpartyId ?? ''),
    queryFn: () => fetchContactCard(counterpartyId!),
    enabled: Boolean(token) && Boolean(counterpartyId),
  });

  return { ...query, card: query.data };
}

/** Manual mutation shape — matches `useSendMessage`'s, one hook for both directions since add/remove differ only in which REST verb they call. */
export function useSetContact() {
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = useCallback(
    async (counterpartyId: string, wantContact: boolean) => {
      setSubmitting(true);
      setError(null);
      try {
        const card = await (wantContact ? addContact(counterpartyId) : removeContact(counterpartyId));
        queryClient.invalidateQueries({ queryKey: queryKeys.conversations.contactCard(counterpartyId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.conversations.contactsList() });
        return card;
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'That did not go through. Try again.');
        return null;
      } finally {
        setSubmitting(false);
      }
    },
    [queryClient],
  );

  return { set, submitting, error };
}

/** Everyone this account has added — the account menu's Contacts screen. */
export function useContacts() {
  const token = useAuthStore((s) => s.token);

  const query = useQuery({
    queryKey: queryKeys.conversations.contactsList(),
    queryFn: fetchContacts,
    enabled: Boolean(token),
  });

  return { ...query, contacts: query.data ?? [] };
}

/** The account menu's Blocked accounts screen. */
export function useBlockedUsers() {
  const token = useAuthStore((s) => s.token);

  const query = useQuery({
    queryKey: queryKeys.conversations.blocked(),
    queryFn: fetchBlockedUsers,
    enabled: Boolean(token),
  });

  return { ...query, blocked: query.data ?? [] };
}

/** Manual mutation shape — matches `useSetContact`'s. One hook for both directions. */
export function useSetBlocked() {
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = useCallback(
    async (counterpartyId: string, wantBlocked: boolean) => {
      setSubmitting(true);
      setError(null);
      try {
        await (wantBlocked ? blockUser(counterpartyId) : unblockUser(counterpartyId));
        // Blocking also drops any contact edge server-side, so both lists can change.
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.conversations.blocked() }),
          queryClient.invalidateQueries({ queryKey: queryKeys.conversations.contactsList() }),
        ]);
        return true;
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'That did not go through. Try again.');
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [queryClient],
  );

  return { set, submitting, error };
}
