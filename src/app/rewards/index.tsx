import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MedalRoad } from '@/components/rewards/medal-road';
import { ScoreHero } from '@/components/rewards/score-hero';
import { AmbientBackground } from '@/components/ui/ambient-background';
import { GlassHeader, HEADER_CONTENT_HEIGHT } from '@/components/ui/glass-header';
import { HeaderBackButton } from '@/components/ui/header-back-button';
import { Touchable } from '@/components/ui/pressable';
import { PageRefreshControl } from '@/components/ui/refresh-control';
import { ErrorState } from '@/components/ui/state-views';
import { Text } from '@/components/ui/text';
import { FontFamily, Spacing } from '@/constants/theme';
import { useRefresh } from '@/hooks/use-refresh';
import { useTheme } from '@/hooks/use-theme';
import { currentPeriodKey } from '@/lib/rewards';
import { useMyRewards } from '@/queries/rewards';

type IconName = keyof typeof Ionicons.glyphMap;

/**
 * Your Pazimo score: the medal you've reached and the score under it, the
 * way into your recap, points history and how to earn, and the road of
 * medals still ahead. Where a medal push lands.
 */
export default function RewardsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useTheme();
  const rewards = useMyRewards();
  const { refreshing, onRefresh } = useRefresh(rewards.refetch);

  const data = rewards.data;
  const topPadding = insets.top + HEADER_CONTENT_HEIGHT + Spacing.xl;

  const actions: { icon: IconName; label: string; onPress: () => void }[] = [
    {
      icon: 'albums',
      label: 'Recap',
      onPress: () => router.push({ pathname: '/rewards/recap', params: { period: 'month', key: currentPeriodKey('month') } }),
    },
    { icon: 'time-outline', label: 'Points', onPress: () => router.push('/rewards/history') },
    { icon: 'sparkles-outline', label: 'Earn', onPress: () => router.push('/rewards/earn') },
  ];

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
          <ScoreHero rewards={data} />

          <View style={styles.actions}>
            {actions.map((action, index) => {
              const solid = index === 0;
              return (
                <Touchable
                  key={action.label}
                  accessibilityRole="button"
                  accessibilityLabel={action.label}
                  onPress={action.onPress}
                  haptic={solid}
                  style={styles.action}>
                  <View
                    style={[
                      styles.actionDisc,
                      solid
                        ? { backgroundColor: theme.brand }
                        : { backgroundColor: theme.surface, borderColor: theme.glassBorder, borderWidth: StyleSheet.hairlineWidth },
                    ]}>
                    <Ionicons name={action.icon} size={24} color={solid ? theme.onBrand : theme.text} />
                  </View>
                  <Text variant="small" style={styles.bold}>
                    {action.label}
                  </Text>
                </Touchable>
              );
            })}
          </View>

          {data.achievements.length ? (
            <View>
              <Text variant="label" color="textSecondary" style={styles.sectionLabel}>
                YOUR MEDAL ROAD
              </Text>
              <MedalRoad score={data.score} medals={data.achievements} />
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: Spacing.lg, gap: Spacing.xxl },
  bold: { fontFamily: FontFamily.bold },

  actions: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: Spacing.sm },
  action: { alignItems: 'center', gap: Spacing.sm, minWidth: 76 },
  actionDisc: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },

  sectionLabel: { marginBottom: Spacing.sm, paddingHorizontal: Spacing.xs },
});
