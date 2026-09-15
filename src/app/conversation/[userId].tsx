import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AvatarInitials } from '@/components/shares/avatar-initials';
import { ChatMenuSheet } from '@/components/shares/chat-menu-sheet';
import { ContactCardSheet } from '@/components/shares/contact-card-sheet';
import { MessageComposer } from '@/components/shares/message-composer';
import { MessageOptionsSheet } from '@/components/shares/message-options-sheet';
import { ShareDetailSheet } from '@/components/shares/share-detail-sheet';
import { ShareItemSheet } from '@/components/shares/share-item-sheet';
import { ShareRow } from '@/components/shares/share-row';
import { SharedItemsSheet } from '@/components/shares/shared-items-sheet';
import { AmbientBackground } from '@/components/ui/ambient-background';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Glass } from '@/components/ui/glass';
import { GLASS_SHADOW, GLASS_TINT, GlassIconButton } from '@/components/ui/glass-button';
import { Touchable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useGoBack } from '@/hooks/use-go-back';
import { useTheme } from '@/hooks/use-theme';
import { messageToViewModel, type ShareItemViewModel } from '@/lib/share-item-view-model';
import {
  useClearConversation,
  useConversationMessages,
  useConversationsList,
  useDeleteMessage,
  useEditMessage,
  useSetBlocked,
} from '@/queries/messages';
import { useAllShareConversations } from '@/queries/share-conversations';
import type { ShareUser } from '@/types/api';

const HEADER_HEIGHT = 44;

/**
 * One person's full history — every message and item transfer between us, in
 * one merged chronological timeline. Item transfers still come from
 * `useAllShareConversations()` exactly as before; plain messages are fetched
 * separately via `useConversationMessages` and interleaved by `createdAt` —
 * two data sources, one rendered list, since `ShareRow` already renders any
 * `ShareItemViewModel` kind (including `MESSAGE`) identically.
 */
export default function ConversationScreen() {
  const { userId, firstName, lastName, username } = useLocalSearchParams<{
    userId: string;
    firstName?: string;
    lastName?: string;
    username?: string;
  }>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const goBack = useGoBack('/shares');
  const scrollRef = useRef<ScrollView>(null);

  const { conversations, isLoading: sharesLoading } = useAllShareConversations();
  const existing = conversations.find((c) => c.counterpartyId === userId);
  const { messages, isLoading: messagesLoading } = useConversationMessages(userId);

  // The message-inclusive list is the authoritative source for who this
  // person is — `useAllShareConversations` only knows about ticket/drink/
  // cinema history, so a thread that's ever had nothing BUT plain messages
  // (or is brand new, opened from search) would otherwise fall through to
  // the route-params fallback below and misrender as "Pazimo user" even
  // though the backend knows exactly who this is.
  const { conversations: conversationList } = useConversationsList();
  const listMatch = conversationList.find((c) => c.counterparty._id === userId);

  // A brand-new conversation (opened from search, no history yet at all) has
  // no entry in either list — the route params carry enough of the person to
  // render the header and start chatting anyway. Memoised so its identity
  // only changes when the underlying data actually does — `ShareItemSheet`
  // resyncs its in-progress compose off this object's id, and an unmemoised
  // fallback recreated every render would otherwise reset it mid-flow.
  const counterparty: ShareUser = useMemo(
    () =>
      listMatch?.counterparty ??
      existing?.counterparty ?? {
        _id: userId ?? '',
        firstName: firstName || 'Pazimo user',
        lastName: lastName || undefined,
        username: username || undefined,
      },
    [listMatch?.counterparty, existing?.counterparty, userId, firstName, lastName, username],
  );

  const items = useMemo<ShareItemViewModel[]>(() => {
    const shares = existing?.shares ?? [];
    const messageItems = messages.map(messageToViewModel);
    return [...shares, ...messageItems].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }, [existing?.shares, messages]);

  const name = [counterparty.firstName, counterparty.lastName].filter(Boolean).join(' ').trim() ||
    (counterparty.username ? `@${counterparty.username}` : 'Pazimo user');

  const [shareSheetVisible, setShareSheetVisible] = useState(false);
  const [detailShare, setDetailShare] = useState<ShareItemViewModel | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [contactCardVisible, setContactCardVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [sharedItemsVisible, setSharedItemsVisible] = useState(false);
  const [optionsMessage, setOptionsMessage] = useState<ShareItemViewModel | null>(null);
  const [editingMessage, setEditingMessage] = useState<{ id: string; text: string } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ShareItemViewModel | null>(null);
  const [pendingBlock, setPendingBlock] = useState(false);
  const [pendingDeleteChat, setPendingDeleteChat] = useState(false);

  const { submit: submitEdit, submitting: editSubmitting } = useEditMessage();
  const { submit: submitDelete } = useDeleteMessage();
  const { set: setBlocked } = useSetBlocked();
  const { submit: submitClearConversation } = useClearConversation();

  // A real null guard, not a `!` assertion — the compiler's auto-memoization
  // reads dependency properties at render time (see its generated `$[n] !==
  // editingMessage.id` check), and a `!`-asserted `.id` on `editingMessage`
  // compiles away to an unconditional read that crashes on the very first
  // render, before any message is ever being edited.
  const saveEdit = useCallback(
    (text: string) => {
      if (!editingMessage) return Promise.resolve(null);
      return submitEdit(counterparty._id, editingMessage.id, text);
    },
    [submitEdit, counterparty._id, editingMessage],
  );

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setPendingDelete(null);
    await submitDelete(counterparty._id, target.id);
  }, [pendingDelete, submitDelete, counterparty._id]);

  const confirmBlock = useCallback(async () => {
    setPendingBlock(false);
    const ok = await setBlocked(counterparty._id, true);
    if (ok) goBack();
  }, [setBlocked, counterparty._id, goBack]);

  const confirmDeleteChat = useCallback(async () => {
    setPendingDeleteChat(false);
    const ok = await submitClearConversation(counterparty._id);
    if (ok) goBack();
  }, [submitClearConversation, counterparty._id, goBack]);

  // Only the sender can act on their own message, and only while it hasn't
  // already been deleted — `ShareRow`/`MessageBubble` enforce the same gate,
  // this is just where the sheet those long-presses open gets opened.
  const openMessageOptions = useCallback((share: ShareItemViewModel) => {
    setOptionsMessage(share);
  }, []);

  const openDetail = useCallback((share: ShareItemViewModel) => {
    // A plain message has no detail sheet — ShareRow never calls onPress for
    // one (it isn't wrapped in a Touchable at all), but guard here too in
    // case that ever changes.
    if (share.kind === 'MESSAGE') return;
    setDetailShare(share);
    setDetailVisible(true);
  }, []);

  const isLoading = (sharesLoading && !existing) || (messagesLoading && messages.length === 0);

  return (
    <View style={styles.screen}>
      <AmbientBackground />

      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <GlassIconButton
          icon="arrow-back"
          accessibilityLabel="Back to Chats"
          size={HEADER_HEIGHT}
          onPress={goBack}
        />
        <Touchable
          accessibilityRole="button"
          accessibilityLabel={`View ${name}'s contact details`}
          onPress={() => setContactCardVisible(true)}
          pressedScale={0.97}
          style={styles.headerIdentityShadow}>
          <Glass variant="clear" intensity={28} tint={GLASS_TINT} radius={Radius.pill} style={styles.headerIdentity}>
            <AvatarInitials name={name} size={36} />
            <View style={styles.headerTitles}>
              <Text variant="callout" numberOfLines={1}>
                {name}
              </Text>
              {counterparty.username ? (
                <Text variant="caption" color="textSecondary" numberOfLines={1}>
                  @{counterparty.username}
                </Text>
              ) : null}
            </View>
          </Glass>
        </Touchable>
        <GlassIconButton
          icon="menu"
          accessibilityLabel="Chat options"
          size={HEADER_HEIGHT}
          onPress={() => setMenuVisible(true)}
        />
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.centered}>
          <View style={[styles.emptyIcon, { backgroundColor: theme.brandTint }]}>
            <Ionicons name="chatbubble-outline" size={26} color={theme.brand} />
          </View>
          <Text variant="title" style={styles.centeredText}>
            Say hello
          </Text>
          <Text variant="body" color="textSecondary" style={styles.centeredText}>
            Send {name} a message, a ticket, or a drink to start this conversation.
          </Text>
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          showsVerticalScrollIndicator={false}>
          {items.map((item) => (
            <ShareRow
              key={`${item.kind}-${item.id}`}
              share={item}
              onPress={openDetail}
              onLongPressMessage={openMessageOptions}
            />
          ))}
        </ScrollView>
      )}

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
        <MessageComposer
          counterpartyId={counterparty._id}
          onAttach={() => setShareSheetVisible(true)}
          editing={editingMessage}
          onSaveEdit={saveEdit}
          onCancelEdit={() => setEditingMessage(null)}
          editSubmitting={editSubmitting}
        />
      </View>

      <ShareItemSheet
        visible={shareSheetVisible}
        onClose={() => setShareSheetVisible(false)}
        initialRecipient={counterparty}
      />
      <ShareDetailSheet share={detailShare} visible={detailVisible} onClose={() => setDetailVisible(false)} />
      <ContactCardSheet
        counterpartyId={counterparty._id}
        visible={contactCardVisible}
        onClose={() => setContactCardVisible(false)}
      />
      <SharedItemsSheet
        visible={sharedItemsVisible}
        onClose={() => setSharedItemsVisible(false)}
        items={existing?.shares ?? []}
        name={name}
        onSelectItem={openDetail}
      />
      <ChatMenuSheet
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onViewContact={() => setContactCardVisible(true)}
        onViewSharedItems={() => setSharedItemsVisible(true)}
        onBlock={() => setPendingBlock(true)}
        onDeleteChat={() => setPendingDeleteChat(true)}
        otherName={name}
      />
      <MessageOptionsSheet
        visible={Boolean(optionsMessage)}
        onClose={() => setOptionsMessage(null)}
        onEdit={() => {
          if (optionsMessage) setEditingMessage({ id: optionsMessage.id, text: optionsMessage.message ?? '' });
        }}
        onDelete={() => setPendingDelete(optionsMessage)}
      />
      <ConfirmDialog
        visible={Boolean(pendingDelete)}
        title="Delete this message?"
        message="This can't be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
      <ConfirmDialog
        visible={pendingBlock}
        title={`Block ${name}?`}
        message="They won't be able to message you, and any contact between you is removed."
        confirmLabel="Block"
        destructive
        onConfirm={confirmBlock}
        onCancel={() => setPendingBlock(false)}
      />
      <ConfirmDialog
        visible={pendingDeleteChat}
        title="Delete this chat?"
        message={`This only clears your own view of your messages with ${name} — they'll still see the conversation, and any tickets or drinks you've shared stay put.`}
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDeleteChat}
        onCancel={() => setPendingDeleteChat(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  headerIdentityShadow: { flex: 1, borderRadius: Radius.pill, ...GLASS_SHADOW },
  headerIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  headerTitles: { flex: 1, gap: 1 },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl },
  centeredText: { textAlign: 'center' },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },

  body: { flex: 1 },
  bodyContent: { paddingVertical: Spacing.lg, gap: Spacing.sm },

  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
});
