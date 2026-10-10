import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmbientBackground } from '@/components/ui/ambient-background';
import { GlassHeader, HEADER_CONTENT_HEIGHT } from '@/components/ui/glass-header';
import { HeaderBackButton } from '@/components/ui/header-back-button';
import { Touchable } from '@/components/ui/pressable';
import { EmptyState, ErrorState } from '@/components/ui/state-views';
import { Text } from '@/components/ui/text';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { SOURCE_LABEL, SOURCE_LOOK, formatPoints } from '@/lib/rewards';
import { useMyRewards } from '@/queries/rewards';
import type { PointsSource } from '@/types/api';

type IconName = keyof typeof Ionicons.glyphMap;

const STEPS: { icon: IconName; label: string }[] = [
  { icon: 'bag-handle', label: 'Buy' },
  { icon: 'sparkles', label: 'Earn points' },
  { icon: 'trophy', label: 'Unlock medals' },
];

/** How points are earned: the current rate for each kind of purchase, each one a shortcut to go do it. */
export default function EarnScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useTheme();
  const rewards = useMyRewards();
  const topPadding = insets.top + HEADER_CONTENT_HEIGHT + Spacing.xl;

  const earning = rewards.data
    ? (Object.entries(rewards.data.earning) as [PointsSource, { amount: number; points: number } | null][]).filter(
        (entry): entry is [PointsSource, { amount: number; points: number }] => entry[1] !== null,
      )
    : [];

  return (
    <View style={styles.screen}>
      <AmbientBackground />
      <GlassHeader title="How to earn" left={<HeaderBackButton />} />

      {rewards.isLoading ? (
        <View style={[styles.centered, { paddingTop: topPadding }]}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      ) : rewards.isError ? (
        <View style={[styles.centered, { paddingTop: topPadding }]}>
          <ErrorState onRetry={() => rewards.refetch()} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: topPadding, paddingBottom: insets.bottom + Spacing.xxl }]}
          showsVerticalScrollIndicator={false}>
          <View style={styles.intro}>
            <Text variant="heading">Every birr counts</Text>
            <Text variant="small" color="textSecondary">
              Pay for anything in Pazimo and points land on your score automatically.
            </Text>
          </View>

          <View style={[styles.steps, { backgroundColor: theme.surface, borderColor: theme.glassBorder }]}>
            {STEPS.map((step, i) => (
              <View key={step.label} style={styles.stepWrap}>
                {i > 0 ? <Ionicons name="arrow-forward" size={14} color={theme.textMuted} /> : null}
                <View style={styles.step}>
                  <View style={[styles.stepIcon, { backgroundColor: theme.brandTint }]}>
                    <Ionicons name={step.icon} size={18} color={theme.text} />
                  </View>
                  <Text variant="caption" style={styles.bold}>
                    {step.label}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {earning.length === 0 ? (
            <EmptyState icon="sparkles-outline" title="Nothing earns points right now" message="Check back soon." />
          ) : (
            <View style={styles.list}>
              {earning.map(([source, rule]) => (
                <Touchable
                  key={source}
                  accessibilityRole="button"
                  accessibilityLabel={`${SOURCE_LABEL[source]}: ${rule.points} points for every ${rule.amount} birr`}
                  onPress={() => router.push(SOURCE_LOOK[source].href)}
                  pressedScale={0.97}
                  style={[styles.tile, { backgroundColor: theme.surface, borderColor: theme.glassBorder }]}>
                  <View style={[styles.tileIcon, { backgroundColor: theme.brand }]}>
                    <Ionicons name={SOURCE_LOOK[source].icon} size={22} color={theme.onBrand} />
                  </View>
                  <View style={styles.flex}>
                    <Text variant="body" style={styles.bold}>
                      {SOURCE_LABEL[source]}
                    </Text>
                    <Text variant="caption" color="textMuted">
                      for every {formatPoints(rule.amount)} ETB
                    </Text>
                  </View>
                  <View style={styles.rate}>
                    <Text style={[styles.rateValue, { color: theme.text }]}>+{formatPoints(rule.points)}</Text>
                    <Text variant="caption" color="textSecondary">
                      pts
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
                </Touchable>
              ))}
            </View>
          )}
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

  intro: { gap: Spacing.xs, paddingHorizontal: Spacing.xs },

  steps: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  stepWrap: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  step: { alignItems: 'center', gap: Spacing.xs },
  stepIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },

  list: { gap: Spacing.md },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tileIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  rate: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  rateValue: { fontSize: 22, lineHeight: 28, fontFamily: FontFamily.bold },
});
