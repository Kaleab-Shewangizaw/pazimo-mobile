import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Medal } from '@/components/rewards/medal';
import { AmbientBackground } from '@/components/ui/ambient-background';
import { Button } from '@/components/ui/button';
import { GlassHeader, HEADER_CONTENT_HEIGHT } from '@/components/ui/glass-header';
import { HeaderBackButton } from '@/components/ui/header-back-button';
import { Touchable } from '@/components/ui/pressable';
import { PageRefreshControl } from '@/components/ui/refresh-control';
import { SectionHeader } from '@/components/ui/section';
import { ErrorState } from '@/components/ui/state-views';
import { Text } from '@/components/ui/text';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useRefresh } from '@/hooks/use-refresh';
import { useTheme } from '@/hooks/use-theme';
import { relativeTimeLabel } from '@/lib/date';
import { SOURCE_LABEL, currentPeriodKey, formatPoints, periodLabel } from '@/lib/rewards';
import { useMyRewards, usePointsHistory } from '@/queries/rewards';
import type { PointsSource, RecapPeriodType } from '@/types/api';

/**
 * Your Pazimo score: what you've earned, the next medal you're working
 * toward, every medal (earned and still locked), and the way into your
 * shareable monthly and yearly recaps. Where a medal push lands.
 */
export default function RewardsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useTheme();
  const rewards = useMyRewards();
  const history = usePointsHistory();
  const { refreshing, onRefresh } = useRefresh(rewards.refetch, history.refetch);

  const data = rewards.data;
  const topPadding = insets.top + HEADER_CONTENT_HEIGHT + Spacing.xl;

  const openRecap = (period: RecapPeriodType) =>
    router.push({ pathname: '/rewards/recap', params: { period, key: currentPeriodKey(period) } });

  const earning = data
    ? (Object.entries(data.earning) as [PointsSource, { amount: number; points: number } | null][]).filter(
        (entry): entry is [PointsSource, { amount: number; points: number }] => entry[1] !== null,
      )
    : [];

  const previous = data?.achievements.filter((a) => a.threshold <= data.score).at(-1)?.threshold ?? 0;
  const progress = data?.next ? Math.min(1, (data.score - previous) / Math.max(1, data.next.threshold - previous)) : 1;

  return (
    <View style={styles.screen}>
      <AmbientBackground />
      <GlassHeader title="Rewards" left={<HeaderBackButton />} />

      {rewards.isLoading ? (
        <View style={[styles.centered, { paddingTop: topPadding }]}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      ) : rewards.isError || !data ? (
        <View style={[styles.centered, { paddingTop: topPadding }]}>
          <ErrorState onRetry={() => rewards.refetch()} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: topPadding, paddingBottom: insets.bottom + Spacing.xxl }]}
          refreshControl={<PageRefreshControl refreshing={refreshing} onRefresh={onRefresh} progressViewOffset={topPadding} />}
          showsVerticalScrollIndicator={false}>
          <LinearGradient
            colors={['#2A1B4A', '#5B2A6E', '#E8456B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.scoreCard}>
            <Text variant="small" style={styles.scoreLabel}>
              YOUR SCORE
            </Text>
            <Text style={styles.score} accessibilityLabel={`${data.score} points`}>
              {formatPoints(data.score)}
            </Text>
            {data.next ? (
              <View style={styles.progressBlock}>
                <View style={styles.track}>
                  <View style={[styles.bar, { width: `${Math.round(progress * 100)}%` }]} />
                </View>
                <Text variant="small" style={styles.onGradient}>
                  {formatPoints(data.next.remaining)} pts to {data.next.name}
                </Text>
              </View>
            ) : data.achievements.length ? (
              <Text variant="small" style={styles.onGradient}>
                Every medal unlocked. Legend.
              </Text>
            ) : null}
          </LinearGradient>

          <View style={styles.recapRow}>
            <Touchable
              accessibilityRole="button"
              onPress={() => openRecap('month')}
              pressedScale={0.97}
              style={[styles.recapTile, { backgroundColor: theme.surface, borderColor: theme.glassBorder }]}>
              <Ionicons name="albums" size={22} color="#FFD166" />
              <Text variant="body" style={styles.bold}>
                {periodLabel('month', currentPeriodKey('month')).split(' ')[0]} recap
              </Text>
              <Text variant="caption" color="textSecondary">
                Your month in cards
              </Text>
            </Touchable>
            <Touchable
              accessibilityRole="button"
              onPress={() => openRecap('year')}
              pressedScale={0.97}
              style={[styles.recapTile, { backgroundColor: theme.surface, borderColor: theme.glassBorder }]}>
              <Ionicons name="sparkles" size={22} color="#FF6FD8" />
              <Text variant="body" style={styles.bold}>
                {currentPeriodKey('year')} recap
              </Text>
              <Text variant="caption" color="textSecondary">
                Your year so far
              </Text>
            </Touchable>
          </View>

          {data.achievements.length ? (
            <View>
              <SectionHeader title="Medals" />
              <View style={styles.shelf}>
                {data.achievements.map((medal) => (
                  <View key={medal.id} style={styles.medalCell} accessible accessibilityLabel={`${medal.name}, ${medal.unlockedAt ? 'unlocked' : `locked, ${medal.threshold} points`}`}>
                    <Medal medal={medal} size={68} />
                    <Text variant="small" numberOfLines={2} style={[styles.medalName, !medal.unlockedAt && styles.dim]}>
                      {medal.name}
                    </Text>
                    <Text variant="caption" color="textMuted">
                      {medal.unlockedAt ? 'Unlocked' : `${formatPoints(medal.threshold)} pts`}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {earning.length ? (
            <View>
              <SectionHeader title="How you earn" />
              <View style={[styles.panel, { backgroundColor: theme.surface, borderColor: theme.glassBorder }]}>
                {earning.map(([source, rule]) => (
                  <View key={source} style={styles.earnRow}>
                    <Text variant="body">{SOURCE_LABEL[source]}</Text>
                    <Text variant="small" color="textSecondary">
                      {formatPoints(rule.points)} pts per {formatPoints(rule.amount)} ETB
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <View>
            <SectionHeader title="Recent points" />
            {history.items.length === 0 ? (
              <Text variant="small" color="textMuted" style={styles.empty}>
                Buy a ticket or a drink in the app and your points land here.
              </Text>
            ) : (
              <View style={[styles.panel, { backgroundColor: theme.surface, borderColor: theme.glassBorder }]}>
                {history.items.map((item) => (
                  <View key={item.id} style={styles.historyRow}>
                    <View style={styles.flex}>
                      <Text variant="body">{SOURCE_LABEL[item.source]}</Text>
                      <Text variant="caption" color="textMuted">
                        {formatPoints(item.amount)} ETB · {relativeTimeLabel(item.earnedAt)}
                      </Text>
                    </View>
                    <Text variant="body" style={[styles.bold, { color: theme.success }]}>
                      +{formatPoints(item.points)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            {history.hasNextPage ? (
              <Button
                label="Show more"
                variant="ghost"
                loading={history.isFetchingNextPage}
                onPress={() => history.fetchNextPage()}
                style={styles.more}
              />
            ) : null}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: Spacing.lg, gap: Spacing.xl },
  flex: { flex: 1 },
  bold: { fontFamily: FontFamily.bold },
  dim: { opacity: 0.6 },

  scoreCard: { borderRadius: Radius.xl, padding: Spacing.xl, gap: Spacing.sm, overflow: 'hidden' },
  scoreLabel: { color: 'rgba(255,255,255,0.75)', letterSpacing: 2, fontFamily: FontFamily.bold },
  score: { color: '#FFFFFF', fontSize: 64, lineHeight: 70, fontFamily: FontFamily.bold },
  onGradient: { color: 'rgba(255,255,255,0.9)' },
  progressBlock: { gap: Spacing.xs, marginTop: Spacing.xs },
  track: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.22)', overflow: 'hidden' },
  bar: { height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' },

  recapRow: { flexDirection: 'row', gap: Spacing.md },
  recapTile: {
    flex: 1,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.lg,
    gap: Spacing.xs,
  },

  shelf: { flexDirection: 'row', flexWrap: 'wrap', rowGap: Spacing.lg },
  medalCell: { width: '33.33%', alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.xs },
  medalName: { textAlign: 'center' },

  panel: { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: Spacing.lg },
  earnRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.md, gap: Spacing.md },
  historyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, gap: Spacing.md },
  empty: { paddingHorizontal: Spacing.xs },
  more: { alignSelf: 'center', marginTop: Spacing.sm },
});
