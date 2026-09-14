import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SignInSheet } from '@/components/account/sign-in-sheet';
import { ConversationRow } from '@/components/shares/conversation-row';
import { NewChatSheet } from '@/components/shares/new-chat-sheet';
import { AmbientBackground } from '@/components/ui/ambient-background';
import { GlassHeader, HEADER_CONTENT_HEIGHT } from '@/components/ui/glass-header';
import { GlassIconButton } from '@/components/ui/glass-button';
import { PageRefreshControl } from '@/components/ui/refresh-control';
import { EmptyState, ErrorState } from '@/components/ui/state-views';
import { tabBarClearance } from '@/constants/layout';
import { Spacing } from '@/constants/theme';
import { useRefresh } from '@/hooks/use-refresh';
import type { ShareConversation } from '@/lib/conversations';
import { useShareConversations } from '@/queries/ticket-shares';
import { useAuthStore } from '@/stores/use-auth-store';
import type { ShareUser } from '@/types/api';

/**
 * One row per person, not per ticket share — every share (sent or received,
 * any status) with the same counterparty collapses into one conversation,
 * newest activity first. See `lib/conversations.ts` for the grouping itself;
 * this screen just lists what it derives and opens `/conversation/[userId]`.
 */
export default function SharesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [signInVisible, setSignInVisible] = useState(false);
  const [newChatVisible, setNewChatVisible] = useState(false);

  const { conversations, isLoading, isError, error, refetch } = useShareConversations();
  const { refreshing, onRefresh } = useRefresh(refetch);

  const openConversation = useCallback(
    (conversation: ShareConversation) => {
      router.push({
        pathname: '/conversation/[userId]',
        params: { userId: conversation.counterpartyId },
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
        right={
          user ? (
            <GlassIconButton
              icon="search"
              accessibilityLabel="New chat"
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
            title="Sign in to share tickets"
            message="Sign in to send a ticket to a friend and see what's been shared with you."
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
          data={conversations}
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
                message="Search for someone or open a ticket with more than one admission to send one to a friend."
                actionLabel="Find someone"
                onAction={() => setNewChatVisible(true)}
              />
            )
          }
        />
      )}

      <NewChatSheet
        visible={newChatVisible}
        onClose={() => setNewChatVisible(false)}
        onSelect={openNewChat}
      />
      <SignInSheet visible={signInVisible} onClose={() => setSignInVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { gap: Spacing.xs },
});
