import { Ionicons } from '@expo/vector-icons';
import { memo, useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { Medal } from '@/components/rewards/medal';
import { Text } from '@/components/ui/text';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatPoints } from '@/lib/rewards';
import type { MyRewards } from '@/types/api';

const MEDAL = 104;
const HALO = 200;

/** Counts from 0 up to `target` with an ease-out, so the score lands rather than just appearing. */
function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let frame = 0;
    const start = Date.now();
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      setValue(target * (1 - (1 - t) ** 3));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return value;
}

/** What to say under the score — a nudge that gets louder the closer the next medal is. */
function cheer({ score, next, achievements }: MyRewards, progress: number) {
  if (!next) return achievements.length ? 'Every medal unlocked. Legend.' : 'Points are on the way.';
  const pts = `${formatPoints(next.remaining)} pts`;
  if (score === 0) return `Your first ticket or drink starts the climb to ${next.name}.`;
  if (progress >= 0.75) return `So close! Just ${pts} to ${next.name}.`;
  if (progress >= 0.4) return `Halfway there. ${pts} to ${next.name}.`;
  return `${pts} to ${next.name}. Keep going!`;
}

/**
 * The rewards page's hero: your latest medal bobbing in a soft glow, the
 * score counting up beneath it, and a line cheering you on to the next one.
 */
function ScoreHeroImpl({ rewards }: { rewards: MyRewards }) {
  const theme = useTheme();
  const { score, next, achievements } = rewards;
  const unlocked = achievements.filter((a) => a.unlockedAt);
  const current = unlocked.at(-1) ?? null;
  const previous = achievements.filter((a) => a.threshold <= score).at(-1)?.threshold ?? 0;
  const progress = next ? Math.min(1, (score - previous) / Math.max(1, next.threshold - previous)) : 1;
  const shown = useCountUp(score);

  // Lazy state rather than refs — the compiler forbids reading `ref.current` during render.
  const [pop] = useState(() => new Animated.Value(0));
  const [bob] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 6, bounciness: 14 }).start();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bob, pop]);

  const medalMotion = {
    transform: [
      { translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) },
      { rotate: bob.interpolate({ inputRange: [0, 1], outputRange: ['-4deg', '4deg'] }) },
      { scale: pop },
    ],
  };

  return (
    <View style={styles.root}>
      <View style={styles.stage}>
        <Svg width={HALO} height={HALO} style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="halo" cx="0.5" cy="0.5" r="0.5">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.16} />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={HALO / 2} cy={HALO / 2} r={HALO / 2} fill="url(#halo)" />
        </Svg>
        <Animated.View style={medalMotion}>
          {current ? (
            <Medal medal={current} size={MEDAL} />
          ) : (
            <View style={[styles.empty, { backgroundColor: theme.surface, borderColor: theme.glassBorder }]}>
              <Ionicons name="sparkles" size={MEDAL * 0.4} color={theme.text} />
            </View>
          )}
        </Animated.View>
      </View>

      {current ? (
        <View style={[styles.badge, { backgroundColor: theme.brandTint }]}>
          <Text variant="caption" style={styles.badgeText}>
            {current.name.toUpperCase()}
          </Text>
        </View>
      ) : null}

      <View style={styles.scoreRow}>
        <Text style={[styles.score, { color: theme.text }]} accessibilityLabel={`${score} points`}>
          {formatPoints(shown)}
        </Text>
        <Text variant="callout" color="textSecondary" style={styles.unit}>
          pts
        </Text>
      </View>
      <Text variant="small" color="textSecondary" style={styles.cheer}>
        {cheer(rewards, progress)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center' },
  stage: { width: HALO, height: HALO, alignItems: 'center', justifyContent: 'center', marginTop: -Spacing.xl, marginBottom: -Spacing.xl },
  empty: {
    width: MEDAL,
    height: MEDAL,
    borderRadius: MEDAL / 2,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: { paddingHorizontal: Spacing.md, paddingVertical: 4, borderRadius: Radius.pill, marginBottom: Spacing.sm },
  badgeText: { fontFamily: FontFamily.bold, letterSpacing: 2 },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.xs },
  score: { fontSize: 56, lineHeight: 64, fontFamily: FontFamily.bold },
  unit: { fontFamily: FontFamily.bold },
  cheer: { textAlign: 'center', paddingHorizontal: Spacing.xl },
});

export const ScoreHero = memo(ScoreHeroImpl);
