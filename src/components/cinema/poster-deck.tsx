import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { memo, useCallback, useMemo, useState } from 'react';
import { Animated, PanResponder, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { resolveImageUrl } from '@/lib/media';
import { movieChips } from '@/lib/programme';
import type { ProgrammeEntry } from '@/lib/programme';

/**
 * The programme as a deck of posters: the top card is dragged *down* and away to
 * reveal the next film already sitting behind it, and pulled back down from
 * above to return to the previous one.
 *
 * A deck rather than a pager because a poster is a physical object in the way a
 * feed row isn't — the card behind peeking over the top edge is what says "there
 * is another one under this", which a paging scroll view can only imply with a
 * scrollbar nobody looks at.
 *
 * Animation follows the house pattern from `ui/bottom-sheet.tsx`: `PanResponder`
 * driving `setValue` on a natively-driven `Animated.Value`. That keeps every
 * transform on the UI thread — `Animated.event` is the thing that cannot be
 * native-driven from a pan gesture, `setValue` is not — and avoids Reanimated's
 * quarrel with the React Compiler.
 */

/** Past this, the release commits instead of springing back. */
const COMMIT_DISTANCE = 90;
/** px/ms — a brisk flick commits even from a short drag. */
const COMMIT_VELOCITY = 0.6;

const SPRING = { useNativeDriver: true, speed: 14, bounciness: 5 } as const;
const SETTLE = { useNativeDriver: true, duration: 240 } as const;

/** Rounder than any token: a poster card reads as an object, not a panel. */
const CARD_RADIUS = 32;

/** How far the card behind peeks above the front one, and how much smaller. */
const PEEK = 16;
const PEEK_SCALE = 0.94;

export type PosterDeckProps = {
  entries: ProgrammeEntry[];
  width: number;
  height: number;
  /** Reports the visible card so the screen can headline its date. */
  onIndexChange?: (index: number) => void;
};

function PosterDeckImpl({ entries, width, height, onIndexChange }: PosterDeckProps) {
  const [index, setIndex] = useState(0);
  const [drag] = useState(() => new Animated.Value(0));

  const step = useCallback(
    (delta: number) => {
      setIndex((current) => {
        const next = current + delta;
        onIndexChange?.(next);
        return next;
      });
      drag.setValue(0);
    },
    [drag, onIndexChange],
  );

  // Rebuilt when the position or the deck's size changes, so the handlers close
  // over live values instead of reaching through a ref. `panHandlers` is just a
  // bag of callbacks handed to a View, so swapping it between renders is free.
  const count = entries.length;
  const pan = useMemo(
    () =>
      PanResponder.create({
        // Only claim clearly vertical drags, so a horizontal swipe still belongs
        // to whatever sits around the deck.
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dy) > 6 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_, g) => {
          const i = index;
          const h = height;
          const atEnd = i >= count - 1;
          const atStart = i <= 0;
          // Nothing behind or above to reveal, so the card only gives a little —
          // the resistance is the answer to "is there more?".
          if (g.dy > 0 && atEnd) drag.setValue(Math.min(g.dy * 0.2, h * 0.08));
          else if (g.dy < 0 && atStart) drag.setValue(Math.max(g.dy * 0.2, -h * 0.08));
          else drag.setValue(g.dy);
        },
        onPanResponderRelease: (_, g) => {
          const i = index;
          const h = height;
          const forward = g.dy > COMMIT_DISTANCE || g.vy > COMMIT_VELOCITY;
          const back = g.dy < -COMMIT_DISTANCE || g.vy < -COMMIT_VELOCITY;

          if (forward && i < count - 1) {
            Animated.timing(drag, { toValue: h, ...SETTLE }).start(({ finished }) => {
              if (finished) step(1);
            });
          } else if (back && i > 0) {
            Animated.timing(drag, { toValue: -h, ...SETTLE }).start(({ finished }) => {
              if (finished) step(-1);
            });
          } else {
            Animated.spring(drag, { toValue: 0, ...SPRING }).start();
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(drag, { toValue: 0, ...SPRING }).start();
        },
      }),
    [count, drag, height, index, step],
  );

  if (!entries.length) return null;

  const current = entries[index];
  const next = entries[index + 1];
  const previous = entries[index - 1];

  // Only positive drag moves the front card; a backward pull leaves it alone and
  // brings the previous card down over it instead.
  const frontY = drag.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [0, 0, 1],
  });

  // Parked one card-height below at rest, so it is off-screen until pulled.
  const previousY = drag.interpolate({
    inputRange: [-height, 0],
    outputRange: [0, height],
    extrapolate: 'clamp',
  });

  const behindScale = drag.interpolate({
    inputRange: [0, height],
    outputRange: [PEEK_SCALE, 1],
    extrapolate: 'clamp',
  });
  const behindY = drag.interpolate({
    inputRange: [0, height],
    outputRange: [-PEEK, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.deck, { width, height }]} {...pan.panHandlers}>
      {next ? (
        <Animated.View
          style={[styles.layer, { transform: [{ translateY: behindY }, { scale: behindScale }] }]}
        >
          <PosterCard entry={next} width={width} height={height} />
        </Animated.View>
      ) : null}

      <Animated.View style={[styles.layer, { transform: [{ translateY: frontY }] }]}>
        <PosterCard entry={current} width={width} height={height} />
      </Animated.View>

      {previous ? (
        <Animated.View style={[styles.layer, { transform: [{ translateY: previousY }] }]}>
          <PosterCard entry={previous} width={width} height={height} />
        </Animated.View>
      ) : null}
    </View>
  );
}

function PosterCard({
  entry,
  width,
  height,
}: {
  entry: ProgrammeEntry;
  width: number;
  height: number;
}) {
  const poster = resolveImageUrl(entry.movie.poster);
  const chips = movieChips(entry.movie);

  return (
    <View style={[styles.card, { width, height }]}>
      {poster ? (
        <Image
          source={{ uri: poster }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
          recyclingKey={entry.movie._id}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.blank]}>
          <Ionicons name="film-outline" size={44} color="rgba(255,255,255,0.25)" />
          <Text variant="callout" style={styles.blankTitle} numberOfLines={2}>
            {entry.movie.title}
          </Text>
        </View>
      )}

      {/* Chips ride the artwork's top-left, where a poster's own title almost
          never sits — and on their own dark pills, because the art behind them
          is unknowable. */}
      {chips.length ? (
        <View style={styles.chips}>
          {chips.map((chip) => (
            <View key={chip} style={styles.chip}>
              <Text variant="caption" style={styles.chipText}>
                {chip}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  deck: { alignSelf: 'center' },
  layer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  card: {
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
    backgroundColor: '#141418',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  blank: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
  },
  blankTitle: { color: '#FFFFFF', textAlign: 'center' },

  chips: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
    gap: Spacing.xs,
  },
  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(8,8,10,0.72)',
  },
  chipText: { color: '#FFFFFF' },
});

export const PosterDeck = memo(PosterDeckImpl);
