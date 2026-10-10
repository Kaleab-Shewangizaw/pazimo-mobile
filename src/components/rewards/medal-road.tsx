import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { memo, useEffect, useRef, useState } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Medal } from '@/components/rewards/medal';
import { Touchable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatPoints } from '@/lib/rewards';
import type { Medal as MedalData } from '@/types/api';

const STEP = 100;
const NODE = 58;
const MARKER = 34;
const TRACK = 4;
// The road runs edge to edge, so it pads itself back in line with the page.
const PAD = Spacing.lg;

const center = (i: number) => PAD + i * STEP + STEP / 2;

/**
 * Every medal as a stop along one road, filled up to your score with a
 * "You" pin where you stand. Opens scrolled to that pin; tap a medal to
 * read what it's for.
 */
function MedalRoadImpl({ score, medals }: { score: number; medals: MedalData[] }) {
  const theme = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const sorted = [...medals].sort((a, b) => a.threshold - b.threshold);
  const nextIndex = sorted.findIndex((m) => m.threshold > score);
  const [selected, setSelected] = useState<MedalData | null>(sorted[nextIndex] ?? sorted.at(-1) ?? null);

  // Stop 0 is the start line at 0 pts; medal i sits at stop i + 1.
  const thresholds = [0, ...sorted.map((m) => m.threshold)];
  const reached = thresholds.filter((t) => t <= score).length - 1;
  const youX =
    reached >= thresholds.length - 1
      ? center(reached)
      : center(reached) + (STEP * (score - thresholds[reached])) / Math.max(1, thresholds[reached + 1] - thresholds[reached]);
  const trackStart = center(0);
  const contentWidth = PAD * 2 + thresholds.length * STEP;

  // Lazy state rather than a ref — the compiler forbids reading `ref.current` during render.
  const [fill] = useState(() => new Animated.Value(0));
  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => {
    Animated.timing(fill, {
      toValue: youX - trackStart,
      duration: 1100,
      delay: 250,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    scrollRef.current?.scrollTo({ x: Math.max(0, youX - screenWidth / 2), animated: false });
  }, [fill, screenWidth, trackStart, youX]);

  const pinLeft = Animated.add(fill, trackStart - MARKER);

  const pick = (medal: MedalData) => {
    Haptics.selectionAsync().catch(() => {});
    setSelected(medal);
  };

  return (
    <View style={styles.root}>
      <ScrollView
        ref={scrollRef}
        horizontal
        style={styles.bleed}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ width: contentWidth }}>
        <View style={[styles.track, { left: trackStart, width: center(thresholds.length - 1) - trackStart, backgroundColor: theme.surfaceMuted }]} />
        <Animated.View style={[styles.track, { left: trackStart, width: fill, backgroundColor: theme.brand }]} />

        <Animated.View style={[styles.pin, { left: pinLeft, width: MARKER * 2 }]} pointerEvents="none">
          <View style={[styles.pinBubble, { backgroundColor: theme.brand }]}>
            <Text variant="caption" style={[styles.pinText, { color: theme.onBrand }]}>
              You
            </Text>
          </View>
          <View style={[styles.pinTip, { borderTopColor: theme.brand }]} />
        </Animated.View>

        <View style={styles.row}>
          <View style={styles.node}>
            <View style={styles.medalSlot}>
              <View style={[styles.start, { backgroundColor: theme.surface, borderColor: theme.glassBorder }]}>
                <Ionicons name="flag" size={16} color={theme.textSecondary} />
              </View>
            </View>
            <Text variant="caption" color="textMuted">
              Start
            </Text>
          </View>

          {sorted.map((medal) => {
            const isSelected = selected?.id === medal.id;
            return (
              <Touchable
                key={medal.id}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${medal.name}, ${medal.unlockedAt ? 'unlocked' : `locked, ${medal.threshold} points`}`}
                onPress={() => pick(medal)}
                pressedScale={0.9}
                style={styles.node}>
                <View style={styles.medalSlot}>
                  <View style={[styles.selectRing, isSelected && { borderColor: theme.brand }]}>
                    <Medal medal={medal} size={NODE} />
                  </View>
                </View>
                <Text
                  variant="caption"
                  numberOfLines={1}
                  style={[styles.name, { color: isSelected ? theme.text : theme.textSecondary }]}>
                  {medal.name}
                </Text>
                <Text variant="caption" color="textMuted">
                  {medal.unlockedAt ? 'Unlocked' : `${formatPoints(medal.threshold)} pts`}
                </Text>
              </Touchable>
            );
          })}
        </View>
      </ScrollView>

      {selected ? (
        <View style={[styles.detail, { backgroundColor: theme.surface, borderColor: theme.glassBorder }]}>
          <Medal medal={selected} size={40} />
          <View style={styles.flex}>
            <Text variant="body" style={styles.bold}>
              {selected.name}
            </Text>
            <Text variant="small" color="textSecondary">
              {selected.description ||
                (selected.unlockedAt
                  ? `Unlocked at ${formatPoints(selected.threshold)} pts.`
                  : `Unlocks at ${formatPoints(selected.threshold)} pts.`)}
            </Text>
          </View>
          {selected.unlockedAt ? (
            <Ionicons name="checkmark-circle" size={22} color={theme.success} />
          ) : (
            <Text variant="caption" color="textMuted">
              {formatPoints(Math.max(0, selected.threshold - score))} to go
            </Text>
          )}
        </View>
      ) : null}
    </View>
  );
}

const SLOT = NODE + 8;
const TRACK_TOP = MARKER + Spacing.sm + SLOT / 2 - TRACK / 2;

const styles = StyleSheet.create({
  root: { gap: Spacing.lg },
  flex: { flex: 1 },
  bleed: { marginHorizontal: -Spacing.lg },
  bold: { fontFamily: FontFamily.bold },
  track: { position: 'absolute', top: TRACK_TOP, height: TRACK, borderRadius: TRACK / 2 },
  pin: { position: 'absolute', top: 0, height: MARKER, alignItems: 'center' },
  pinBubble: { paddingHorizontal: Spacing.md, paddingVertical: 4, borderRadius: Radius.pill },
  pinText: { fontFamily: FontFamily.bold },
  pinTip: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  row: { flexDirection: 'row', paddingHorizontal: PAD, marginTop: MARKER + Spacing.sm },
  node: { width: STEP, alignItems: 'center', gap: 2 },
  medalSlot: { height: SLOT, justifyContent: 'center', marginBottom: Spacing.xs },
  selectRing: { borderRadius: SLOT / 2, borderWidth: 2, borderColor: 'transparent', padding: 2 },
  start: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontFamily: FontFamily.bold, maxWidth: STEP - Spacing.sm },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
});

export const MedalRoad = memo(MedalRoadImpl);
