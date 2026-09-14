import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AvatarInitials } from '@/components/shares/avatar-initials';
import { ShareDetailSheet } from '@/components/shares/share-detail-sheet';
import { ShareRow } from '@/components/shares/share-row';
import { ShareTicketSheet } from '@/components/shares/share-ticket-sheet';
import { AmbientBackground } from '@/components/ui/ambient-background';
import { Button } from '@/components/ui/button';
import { Touchable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useGoBack } from '@/hooks/use-go-back';
import { useTheme } from '@/hooks/use-theme';
import { useShareConversations } from '@/queries/ticket-shares';
import type { ShareUser, TicketShare } from '@/types/api';

const HEADER_HEIGHT = 44;

/**
 * One person's full history — every ticket transfer between us, in
 * chronological order, exactly as `groupSharesByCounterparty` derived it.
 * Reused wholesale: each row is the same `ShareRow` bubble the old flat list
 * used, and tapping one opens the same `ShareDetailSheet` — only how they're
 * grouped and entered changed, not the transfer machinery itself.
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

  const { conversations, isLoading } = useShareConversations();
  const existing = conversations.find((c) => c.counterpartyId === userId);

  // A brand-new conversation (opened from search, no shared history yet) has
  // no entry in `conversations` — the route params carry enough of the
  // person to render the header and start a transfer anyway. Memoised so its
  // identity only changes when the underlying data actually does — `ShareTicketSheet`
  // resyncs its in-progress compose off this object's id, and an unmemoised
  // fallback recreated every render would otherwise reset it mid-flow.
  const counterparty: ShareUser = useMemo(
    () =>
      existing?.counterparty ?? {
        _id: userId ?? '',
        firstName: firstName || 'Pazimo user',
        lastName: lastName || undefined,
        username: username || undefined,
      },
    [existing?.counterparty, userId, firstName, lastName, username],
  );
  const shares = existing?.shares ?? [];

  const name = [counterparty.firstName, counterparty.lastName].filter(Boolean).join(' ').trim() ||
    (counterparty.username ? `@${counterparty.username}` : 'Pazimo user');

  const [shareSheetVisible, setShareSheetVisible] = useState(false);
  const [detailShare, setDetailShare] = useState<TicketShare | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  const openDetail = useCallback((share: TicketShare) => {
    setDetailShare(share);
    setDetailVisible(true);
  }, []);

  return (
    <View style={styles.screen}>
      <AmbientBackground />

      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Touchable
          accessibilityRole="button"
          accessibilityLabel="Back to Chats"
          onPress={goBack}
          pressedScale={0.9}
          style={styles.headerButton}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </Touchable>
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
      </View>

      {isLoading && !existing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      ) : shares.length === 0 ? (
        <View style={styles.centered}>
          <View style={[styles.emptyIcon, { backgroundColor: theme.brandTint }]}>
            <Ionicons name="pricetags-outline" size={28} color={theme.brand} />
          </View>
          <Text variant="title" style={styles.centeredText}>
            No shared tickets yet
          </Text>
          <Text variant="body" color="textSecondary" style={styles.centeredText}>
            Send {name} a ticket to start this conversation.
          </Text>
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          showsVerticalScrollIndicator={false}>
          {shares.map((share) => (
            <ShareRow key={share._id} share={share} onPress={openDetail} />
          ))}
        </ScrollView>
      )}

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
        <Button
          label="Send a ticket"
          icon={<Ionicons name="attach-outline" size={18} color={theme.onBrand} />}
          onPress={() => setShareSheetVisible(true)}
        />
      </View>

      <ShareTicketSheet
        visible={shareSheetVisible}
        onClose={() => setShareSheetVisible(false)}
        initialRecipient={counterparty}
      />
      <ShareDetailSheet share={detailShare} visible={detailVisible} onClose={() => setDetailVisible(false)} />
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
  headerButton: {
    width: HEADER_HEIGHT,
    height: HEADER_HEIGHT,
    marginLeft: -Spacing.sm,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
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
