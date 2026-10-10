import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmbientBackground } from '@/components/ui/ambient-background';
import { GlassHeader, HEADER_CONTENT_HEIGHT } from '@/components/ui/glass-header';
import { HeaderBackButton } from '@/components/ui/header-back-button';
import { PageRefreshControl } from '@/components/ui/refresh-control';
import { EmptyState, ErrorState } from '@/components/ui/state-views';
import { Text } from '@/components/ui/text';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useRefresh } from '@/hooks/use-refresh';
import { useTheme } from '@/hooks/use-theme';
import { relativeTimeLabel } from '@/lib/date';
import { SOURCE_LABEL, SOURCE_LOOK, formatPoints } from '@/lib/rewards';
import { usePointsHistory } from '@/queries/rewards';
import type { PointsHistoryItem } from '@/types/api';

/** Every purchase that earned points, newest first, loading more as you scroll. */
export default function PointsHistoryScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const router = useRouter();
  const history = usePointsHistory();
  const { refreshing, onRefresh } = useRefresh(history.refetch);

  const topPadding = insets.top + HEADER_CONTENT_HEIGHT + Spacing.xl;

  const renderItem = ({ item }: { item: PointsHistoryItem }) => (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`${SOURCE_LABEL[item.source]}, ${item.amount} birr, plus ${item.points} points`}>
      <View style={[styles.icon, { backgroundColor: theme.surfaceMuted }]}>
        <Ionicons name={SOURCE_LOOK[item.source].icon} size={19} color={theme.text} />
      </View>
      <View style={styles.flex}>
        <Text variant="body" numberOfLines={1}>
          {SOURCE_LABEL[item.source]}
        </Text>
        <Text variant="caption" color="textMuted">
          {formatPoints(item.amount)} ETB · {relativeTimeLabel(item.earnedAt)}
        </Text>
      </View>
      <View style={styles.points}>
        <Text variant="small" style={[styles.bold, { color: theme.success }]}>
          +{formatPoints(item.points)}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.screen}>
      <AmbientBackground />
      <GlassHeader title="Points" left={<HeaderBackButton />} />

      {history.isLoading ? (
        <View style={[styles.centered, { paddingTop: topPadding }]}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      ) : history.isError ? (
        <View style={[styles.centered, { paddingTop: topPadding }]}>
          <ErrorState onRetry={() => history.refetch()} />
        </View>
      ) : (
        <FlatList
          data={history.items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={[styles.divider, { backgroundColor: theme.hairline }]} />}
          contentContainerStyle={[
            styles.content,
            { paddingTop: topPadding, paddingBottom: insets.bottom + Spacing.xxl },
            history.items.length === 0 ? styles.grow : null,
          ]}
          ListEmptyComponent={
            <EmptyState
              icon="sparkles-outline"
              title="No points yet"
              message="Buy a ticket or a drink in the app and your points land here."
              actionLabel="See how to earn"
              onAction={() => router.push('/rewards/earn')}
            />
          }
          ListFooterComponent={
            history.isFetchingNextPage ? <ActivityIndicator color="#FFFFFF" style={styles.footer} /> : null
          }
          onEndReached={() => {
            if (history.hasNextPage && !history.isFetchingNextPage) history.fetchNextPage();
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
  bold: { fontFamily: FontFamily.bold },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, gap: Spacing.md },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  points: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(52,211,153,0.14)',
  },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 40 + Spacing.md },
  footer: { marginTop: Spacing.lg },
});
