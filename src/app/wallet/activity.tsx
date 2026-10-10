import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmbientBackground } from '@/components/ui/ambient-background';
import { GlassHeader, HEADER_CONTENT_HEIGHT } from '@/components/ui/glass-header';
import { HeaderBackButton } from '@/components/ui/header-back-button';
import { PageRefreshControl } from '@/components/ui/refresh-control';
import { EmptyState, ErrorState } from '@/components/ui/state-views';
import { Text } from '@/components/ui/text';
import { FontFamily, Spacing } from '@/constants/theme';
import { useRefresh } from '@/hooks/use-refresh';
import { useTheme } from '@/hooks/use-theme';
import { relativeTimeLabel } from '@/lib/date';
import { formatPrice } from '@/lib/pricing';
import { ENTRY_LOOK } from '@/lib/wallet';
import { useMyWallet, useWalletStatement } from '@/queries/wallet';
import type { WalletEntry } from '@/types/api';

/** The wallet statement: deposits, payments and refunds, newest first, loading more as you scroll. */
export default function WalletActivityScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const wallet = useMyWallet();
  const canView = Boolean(wallet.data?.exists && wallet.data.device?.verified);
  const statement = useWalletStatement(canView);
  const { refreshing, onRefresh } = useRefresh(statement.refetch);

  const topPadding = insets.top + HEADER_CONTENT_HEIGHT + Spacing.xl;

  const renderEntry = ({ item: entry }: { item: WalletEntry }) => {
    const look = ENTRY_LOOK[entry.kind];
    const credit = entry.amount > 0;
    const amount = formatPrice(Math.abs(entry.amount), 'ETB');
    return (
      <View
        style={styles.row}
        accessible
        accessibilityLabel={`${look.label}, ${entry.description ?? ''}, ${credit ? 'plus' : 'minus'} ${amount}`}>
        <View style={[styles.icon, { backgroundColor: credit ? 'rgba(52,211,153,0.14)' : theme.surfaceMuted }]}>
          <Ionicons name={look.icon} size={20} color={credit ? theme.success : theme.textSecondary} />
        </View>
        <View style={styles.flex}>
          <Text variant="body" numberOfLines={1}>
            {entry.description || look.label}
          </Text>
          <Text variant="caption" color="textMuted">
            {relativeTimeLabel(entry.occurredAt)} · balance {formatPrice(entry.balanceAfter, 'ETB')}
          </Text>
        </View>
        <Text variant="body" style={[styles.amount, credit ? { color: theme.success } : null]}>
          {credit ? '+' : '−'}
          {amount}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <AmbientBackground />
      <GlassHeader title="Activity" left={<HeaderBackButton />} />

      {statement.isLoading || wallet.isLoading ? (
        <View style={[styles.centered, { paddingTop: topPadding }]}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      ) : statement.isError ? (
        <View style={[styles.centered, { paddingTop: topPadding }]}>
          <ErrorState onRetry={() => statement.refetch()} />
        </View>
      ) : (
        <FlatList
          data={statement.entries}
          keyExtractor={(entry) => entry.id}
          renderItem={renderEntry}
          ItemSeparatorComponent={() => <View style={[styles.divider, { backgroundColor: theme.hairline }]} />}
          contentContainerStyle={[
            styles.content,
            { paddingTop: topPadding, paddingBottom: insets.bottom + Spacing.xxl },
            statement.entries.length === 0 ? styles.grow : null,
          ]}
          ListEmptyComponent={
            <EmptyState icon="receipt-outline" title="No activity yet" message="Money you add and spend shows up here." />
          }
          ListFooterComponent={
            statement.isFetchingNextPage ? <ActivityIndicator color="#FFFFFF" style={styles.footer} /> : null
          }
          onEndReached={() => {
            if (statement.hasNextPage && !statement.isFetchingNextPage) statement.fetchNextPage();
          }}
          onEndReachedThreshold={0.4}
          refreshControl={<PageRefreshControl refreshing={refreshing} onRefresh={onRefresh} progressViewOffset={topPadding} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: Spacing.lg },
  grow: { flexGrow: 1, justifyContent: 'center' },
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, gap: Spacing.md },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  amount: { fontFamily: FontFamily.bold },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 40 + Spacing.md },
  footer: { marginTop: Spacing.lg },
});
