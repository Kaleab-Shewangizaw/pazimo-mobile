import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthSheet } from '@/components/account/auth-sheet';
import { ConversationRow } from '@/components/shares/conversation-row';
import { NewChatFab } from '@/components/shares/new-chat-fab';
import { NewChatSheet } from '@/components/shares/new-chat-sheet';
import { AmbientBackground } from '@/components/ui/ambient-background';
import { GlassHeader, HEADER_CONTENT_HEIGHT } from '@/components/ui/glass-header';
import { GlassIconButton } from '@/components/ui/glass-button';
import { Touchable } from '@/components/ui/pressable';
import { PageRefreshControl } from '@/components/ui/refresh-control';
import { EmptyState, ErrorState } from '@/components/ui/state-views';
import { tabBarClearance } from '@/constants/layout';
import { Radius, Spacing } from '@/constants/theme';
import { useGoBack } from '@/hooks/use-go-back';
import { useRefresh } from '@/hooks/use-refresh';
import { useTheme } from '@/hooks/use-theme';
import type { ShareConversation } from '@/lib/conversations';
import { pendingIncomingCounterpartyIds } from '@/lib/conversations';
import { inviteChatPreview, parseInviteLink } from '@/lib/invite-link';
import { beverageShareToViewModel, cinemaShareToViewModel, ticketShareToViewModel } from '@/lib/share-item-view-model';
import { useBeverageShares } from '@/queries/beverage-shares';
import { useCinemaShares } from '@/queries/cinema-shares';
import { useConversationsList } from '@/queries/messages';
import { useTicketShares } from '@/queries/ticket-shares';
import { useAuthStore } from '@/stores/use-auth-store';
import type { ShareUser } from '@/types/api';

/**
 * One row per person — backend-driven now (`GET /conversations`), not
 * derived by grouping flat share records client-side. Item-transfer
 * pending-incoming dots are the one thing the `Conversation` model doesn't
 * track itself, so those still come from the three share hooks, reduced to
 * just a set of counterparty ids.
 */
export default function SharesScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const router = useRouter();
  const goBack = useGoBack();
  const user = useAuthStore((s) => s.user);
  const myId = user?._id;

  const [signInVisible, setSignInVisible] = useState(false);
  const [newChatVisible, setNewChatVisible] = useState(false);

  const { conversations, isLoading, isError, error, refetch } = useConversationsList();
  const { shares: ticketShares, refetch: refetchTickets } = useTicketShares({});
  const { shares: beverageShares, refetch: refetchBeverages } = useBeverageShares({});
  const { shares: cinemaShares, refetch: refetchCinema } = useCinemaShares({});

  const pendingIncoming = useMemo(() => {
    const items = [
      ...ticketShares.map(ticketShareToViewModel),
      ...beverageShares.map(beverageShareToViewModel),
      ...cinemaShares.map(cinemaShareToViewModel),
    ];
    return pendingIncomingCounterpartyIds(items, myId);
  }, [ticketShares, beverageShares, cinemaShares, myId]);

  const rows: ShareConversation[] = useMemo(
    () =>
      conversations.map((conversation) => {
        // An invite (movie/event/venue) is a plain MESSAGE whose text is a
        // deep link — see `lib/invite-link.ts`. The backend just echoes it
        // as the preview, so it's swapped for a friendly label here rather
        // than showing the raw link in the Chats list.
        const invite =
          conversation.lastMessageKind === 'MESSAGE' && conversation.lastMessagePreview
            ? parseInviteLink(conversation.lastMessagePreview)
            : null;

        return {
          counterpartyId: conversation.counterparty._id,
          counterparty: conversation.counterparty,
          shares: [],
          lastActivityAt: conversation.lastMessageAt,
          preview: {
            text: invite ? inviteChatPreview(invite.kind) : (conversation.lastMessagePreview ?? ''),
            sentByMe: conversation.lastMessageSenderId === myId,
          },
          hasPendingIncoming: pendingIncoming.has(conversation.counterparty._id),
          unreadCount: conversation.unreadCount,
        };
      }),
    [conversations, pendingIncoming, myId],
  );

  const refetchAll = useCallback(
    () => Promise.all([refetch(), refetchTickets(), refetchBeverages(), refetchCinema()]),
    [refetch, refetchTickets, refetchBeverages, refetchCinema],
  );
  const { refreshing, onRefresh } = useRefresh(refetchAll);

  const openConversation = useCallback(
    (conversation: ShareConversation) => {
      // Passed as a fast-path fallback only — the thread screen's own
      // `useConversationsList()` is the authoritative source once it loads,
      // this just avoids a flash of "Pazimo user" before that resolves.
      const { counterparty } = conversation;
      router.push({
        pathname: '/conversation/[userId]',
        params: {
          userId: conversation.counterpartyId,
          firstName: counterparty.firstName,
          lastName: counterparty.lastName ?? '',
          username: counterparty.username ?? '',
        },
      });
    },
    [router],
  );

  const openNewChat = useCallback(
    (person: ShareUser) => {
      router.push({
        pathname: '/conversation/[userId]',
        params: {
          userId: person._id,
          firstName: person.firstName,
          lastName: person.lastName ?? '',
          username: person.username ?? '',
        },
      });
    },
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: ShareConversation }) => (
      <ConversationRow conversation={item} onPress={openConversation} />
    ),
    [openConversation],
  );

  const topPadding = insets.top + HEADER_CONTENT_HEIGHT + Spacing.lg;

  return (
    <View style={styles.screen}>
      <AmbientBackground />
      <GlassHeader
        title="Chats"
        left={
          <Touchable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={goBack}
            pressedScale={0.9}
            style={[styles.backButton, { backgroundColor: theme.surfaceMuted }]}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </Touchable>
        }
        right={
          user ? (
            <GlassIconButton
              icon="search"
              accessibilityLabel="Search by username or phone number"
              size={34}
              onPress={() => setNewChatVisible(true)}
            />
          ) : undefined
        }
      />

      {!user ? (
        <View style={[styles.centered, { paddingTop: topPadding }]}>
          <EmptyState
            icon="paper-plane-outline"
            title="Sign in to chat"
            message="Sign in to message friends and send tickets, drinks, and more."
            actionLabel="Sign in"
            onAction={() => setSignInVisible(true)}
          />
        </View>
      ) : isLoading && conversations.length === 0 ? (
        <View style={[styles.centered, { paddingTop: topPadding }]}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(conversation) => conversation.counterpartyId}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.list,
            { paddingTop: topPadding, paddingBottom: tabBarClearance(insets.bottom) },
          ]}
          refreshControl={
            <PageRefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              progressViewOffset={topPadding}
            />
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            isError ? (
              <ErrorState message={error?.message} onRetry={() => refetch()} />
            ) : (
              <EmptyState
                icon="paper-plane-outline"
                title="No chats yet"
                message="Search for someone or start a new chat to message a friend."
                actionLabel="Find someone"
                onAction={() => setNewChatVisible(true)}
              />
            )
          }
        />
      )}

      {user ? <NewChatFab onPress={() => setNewChatVisible(true)} /> : null}

      <NewChatSheet
        visible={newChatVisible}
        onClose={() => setNewChatVisible(false)}
        onSelect={openNewChat}
      />
      <AuthSheet visible={signInVisible} onClose={() => setSignInVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { gap: Spacing.xs },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
