import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Easing,
  PanResponder,
  StyleSheet,
  View,
} from 'react-native';

import { Touchable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { resolveImageUrl } from '@/lib/media';
import type { ProgrammeEntry } from '@/lib/programme';
import { movieChips } from '@/lib/programme';

/**
 * The programme as a deck of posters:
 *
 * - The top card is dragged DOWN and away to reveal the next film.
 * - Pulling UP brings the previous film back from underneath.
 * - The upcoming films have a small visible TIP at the TOP,
 *   making the deck feel like multiple physical cards stacked together.
 *
 * The actual swipe/scroll behavior is intentionally kept the same.
 */

const COMMIT_DISTANCE = 90;
const COMMIT_VELOCITY = 0.6;

const SPRING = {
  useNativeDriver: true,
  speed: 14,
  bounciness: 5,
} as const;

const SETTLE = {
  useNativeDriver: true,
  duration: 240,
} as const;

const HINT_DISTANCE = 54;
const HINT_DELAY = 620;

const CARD_RADIUS = 28;

/**
 * Tallest the card may get relative to its width. Posters are 2:3 (1.5); going
 * a little past that lets the card fill a tall screen, with `cover` trimming a
 * sliver off the poster's sides rather than leaving the stage half empty.
 */
const MAX_CARD_ASPECT = 2.1;

/**
 * ============================================================
 * STACK PREVIEW
 * ============================================================
 *
 * The films after the current one sit behind it as a deck, each
 * a little narrower and showing an even TIP above the one in
 * front of it:
 *
 *        ┌─────────────┐   level 2 ── 3rd film after
 *       ┌───────────────┐  level 1 ── 2nd film after
 *      ┌─────────────────┐ level 0 ── next film
 *     ┌───────────────────┐
 *     │      CURRENT      │ level -1 (front)
 *
 * Every card lives on one of these levels, and a swipe moves each
 * card exactly one level (down = forward, up = back), so the tip
 * you see is always the film you land on next.
 */
const STACK_PREVIEW_COUNT = 3;

/** How much of each card shows above the one in front, as a fraction of card height. */
const TIP_RATIO = 0.03;

/** How much narrower each level is than the one in front of it. */
const LEVEL_SCALE_STEP = 0.04;

/** Headroom reserved above the front card so the tips sit inside the clipped deck. */
const STACK_INSET_RATIO = STACK_PREVIEW_COUNT * TIP_RATIO;

function levelScale(level: number): number {
  return 1 - (level + 1) * LEVEL_SCALE_STEP;
}

/**
 * translateY that puts a card's top edge one tip above the level in front.
 * Cards scale about their centre, so a shrunk card's top edge has already
 * dropped by half the height it lost — that has to be pulled back up.
 */
function levelY(level: number, height: number): number {
  const top = -(level + 1) * TIP_RATIO * height;
  return top - (height * (1 - levelScale(level))) / 2;
}

export type PosterDeckProps = {
  entries: ProgrammeEntry[];
  width: number;

  /** Caps the card's height. */
  maxHeight?: number;

  /** Reports the visible card. */
  onIndexChange?: (index: number) => void;

  /** Tapping the front card. */
  onOpen?: (entry: ProgrammeEntry) => void;
};

function PosterDeckImpl({
  entries,
  width,
  maxHeight,
  onIndexChange,
  onOpen,
}: PosterDeckProps) {
  const height = Math.min(
    width * MAX_CARD_ASPECT,
    (maxHeight ?? Infinity) / (1 + STACK_INSET_RATIO),
  );
  const inset = Math.ceil(height * STACK_INSET_RATIO);


  const [index, setIndex] = useState(0);
  const [drag] = useState(() => new Animated.Value(0));

  /**
   * Disarmed by the first touch so the hint doesn't fight
   * with the user's gesture.
   */
  const [armed, setArmed] = useState(true);

  const count = entries.length;

  /**
   * ==========================================================
   * ARRIVAL HINT
   * ==========================================================
   *
   * This is the same hint behavior.
   */
  useEffect(() => {
    if (count < 2 || !armed) return;

    const timer = setTimeout(() => {
      Animated.sequence([
        Animated.timing(drag, {
          toValue: HINT_DISTANCE,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),

        Animated.spring(drag, {
          toValue: 0,
          speed: 10,
          bounciness: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }, HINT_DELAY);

    return () => clearTimeout(timer);
  }, [armed, count, drag]);

  /**
   * ==========================================================
   * CHANGE CARD
   * ==========================================================
   *
   * Same logic as the original.
   */
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

  /**
   * ==========================================================
   * PAN RESPONDER
   * ==========================================================
   *
   * IMPORTANT:
   *
   * This is the original scrolling behavior.
   *
   * Nothing about the direction or movement has been changed.
   */
  const pan = useMemo(
    () =>
      PanResponder.create({
        /**
         * Only clearly vertical gestures are claimed.
         */
        onStartShouldSetPanResponder: () => {
          setArmed(false);
          drag.stopAnimation();

          return false;
        },

        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dy) > 6 &&
          Math.abs(g.dy) > Math.abs(g.dx),

        /**
         * The card follows the finger.
         */
        onPanResponderMove: (_, g) => {
          const i = index;
          const h = height;

          const atEnd = i >= count - 1;
          const atStart = i <= 0;

          /**
           * At the end, give resistance.
           */
          if (g.dy > 0 && atEnd) {
            drag.setValue(
              Math.min(g.dy * 0.2, h * 0.08),
            );
          }

          /**
           * At the beginning, give resistance.
           */
          else if (g.dy < 0 && atStart) {
            drag.setValue(
              Math.max(g.dy * 0.2, -h * 0.08),
            );
          }

          /**
           * Normal movement.
           */
          else {
            drag.setValue(g.dy);
          }
        },

        /**
         * Release behavior stays exactly the same:
         *
         * DOWN = next
         * UP   = previous
         */
        onPanResponderRelease: (_, g) => {
          const i = index;
          const h = height;

          const forward =
            g.dy > COMMIT_DISTANCE ||
            g.vy > COMMIT_VELOCITY;

          const back =
            g.dy < -COMMIT_DISTANCE ||
            g.vy < -COMMIT_VELOCITY;

          /**
           * NEXT
           */
          if (forward && i < count - 1) {
            Animated.timing(drag, {
              toValue: h,
              ...SETTLE,
            }).start(({ finished }) => {
              if (finished) {
                step(1);
              }
            });
          }

          /**
           * PREVIOUS
           */
          else if (back && i > 0) {
            Animated.timing(drag, {
              toValue: -h,
              ...SETTLE,
            }).start(({ finished }) => {
              if (finished) {
                step(-1);
              }
            });
          }

          /**
           * Not enough movement:
           * return the card to its position.
           */
          else {
            Animated.spring(drag, {
              toValue: 0,
              ...SPRING,
            }).start();
          }
        },

        onPanResponderTerminate: () => {
          Animated.spring(drag, {
            toValue: 0,
            ...SPRING,
          }).start();
        },
      }),
    [count, drag, height, index, step],
  );

  if (!entries.length) {
    return null;
  }

  const current = entries[index];
  const previous = entries[index - 1];

  /**
   * The films behind the current one, nearest first. One more than
   * is shown is rendered: it waits on the level above the deck's top
   * edge (clipped out of sight) and slides into the last visible tip
   * as everything moves forward, instead of popping in afterwards.
   */
  const upcoming = entries.slice(
    index + 1,
    index + 2 + STACK_PREVIEW_COUNT,
  );

  // Every card is driven by the same drag, across three stops:
  //   -height  a full swipe UP   (back: everything moves one level deeper)
  //    0       at rest
  //   +height  a full swipe DOWN (forward: everything moves one level nearer)
  const inputRange = [-height, 0, height];

  /** Forward: leaves downward. Back: steps into the first level behind. */
  const frontY = drag.interpolate({
    inputRange,
    outputRange: [levelY(0, height), 0, height],
    extrapolate: 'clamp',
  });
  const frontScale = drag.interpolate({
    inputRange,
    outputRange: [levelScale(0), 1, 1],
    extrapolate: 'clamp',
  });

  /** Parked just below the deck; a swipe up brings it back over the front. */
  const previousY = drag.interpolate({
    inputRange,
    outputRange: [0, height, height],
    extrapolate: 'clamp',
  });

  return (
    <View
      style={[
        styles.deck,
        {
          width,
          height: height + inset,
        },
      ]}
      {...pan.panHandlers}
    >
      {previous ? (
        <Animated.View
          style={[
            styles.layer,
            { top: inset },
            styles.previousLayer,
            { transform: [{ translateY: previousY }] },
          ]}
        >
          <PosterCard
            entry={previous}
            width={width}
            height={height}
          />
        </Animated.View>
      ) : null}

      {/* Deepest first, so nearer cards draw over the ones behind them. */}
      {upcoming
        .map((entry, level) => ({ entry, level }))
        .reverse()
        .map(({ entry, level }) => {
          const cardY = drag.interpolate({
            inputRange,
            outputRange: [
              levelY(level + 1, height),
              levelY(level, height),
              levelY(level - 1, height),
            ],
            extrapolate: 'clamp',
          });
          const scale = drag.interpolate({
            inputRange,
            outputRange: [
              levelScale(level + 1),
              levelScale(level),
              levelScale(level - 1),
            ],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={entry.movie._id}
              pointerEvents="none"
              style={[
                styles.layer,
                { top: inset },
                {
                  // Nearer levels above deeper ones, all below the front card.
                  zIndex: 50 - level,
                  transform: [{ translateY: cardY }, { scale }],
                },
              ]}
            >
              <PosterCard
                entry={entry}
                width={width}
                height={height}
              />
            </Animated.View>
          );
        })}

      {/* ==================================================== */}
      {/* CURRENT / FRONT CARD                                 */}
      {/* ==================================================== */}
      <Animated.View
        style={[
          styles.layer,
          { top: inset },

          /**
           * Always above the upcoming cards.
           */
          styles.frontLayer,

          {
            transform: [
              {
                translateY: frontY,
              },
              {
                scale: frontScale,
              },
            ],
          },
        ]}
      >
        <PosterCard
          entry={current}
          width={width}
          height={height}
          onPress={
            onOpen
              ? () => onOpen(current)
              : undefined
          }
        />
      </Animated.View>
    </View>
  );
}

/**
 * ============================================================
 * POSTER CARD
 * ============================================================
 *
 * This part is unchanged.
 */
function PosterCard({
  entry,
  width,
  height,
  onPress,
}: {
  entry: ProgrammeEntry;
  width: number;
  height: number;
  onPress?: () => void;
}) {
  const poster = resolveImageUrl(
    entry.movie.poster,
  );

  const chips = movieChips(entry.movie);

  const tagline = entry.movie.description
    ? entry.movie.description
        .slice(0, 80)
        .toUpperCase()
    : null;

  const Card = onPress ? Touchable : View;

  return (
    <Card
      {...(onPress
        ? {
            accessibilityRole: 'button' as const,

            accessibilityLabel:
              `${entry.movie.title}. Open details`,

            onPress,

            pressedScale: 0.98,
          }
        : {})}
      style={[
        styles.card,
        {
          width,
          height,
        },
      ]}
    >
      {/* ==================================================== */}
      {/* POSTER IMAGE                                         */}
      {/* ==================================================== */}

      {poster ? (
        <Image
          source={{
            uri: poster,
          }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
          recyclingKey={entry.movie._id}
        />
      ) : (
        <View
          style={[
            StyleSheet.absoluteFill,
            styles.blank,
          ]}
        >
          <Ionicons
            name="film-outline"
            size={44}
            color="rgba(255,255,255,0.25)"
          />

          <Text
            variant="callout"
            style={styles.blankTitle}
            numberOfLines={2}
          >
            {entry.movie.title}
          </Text>
        </View>
      )}

      {/* ==================================================== */}
      {/* BOTTOM GRADIENT SCRIM                                */}
      {/* ==================================================== */}

      <LinearGradient
        colors={[
          'transparent',
          'rgba(0,0,0,0.18)',
          'rgba(0,0,0,0.72)',
        ]}
        locations={[
          0.45,
          0.72,
          1,
        ]}
        style={[
          StyleSheet.absoluteFill,
          styles.scrim,
        ]}
        pointerEvents="none"
      />

      {/* ==================================================== */}
      {/* TAGLINE                                              */}
      {/* ==================================================== */}

      {tagline ? (
        <View
          style={styles.taglineWrap}
          pointerEvents="none"
        >
          <Text
            variant="title"
            style={styles.tagline}
            numberOfLines={3}
          >
            {tagline}
          </Text>
        </View>
      ) : null}

      {/* ==================================================== */}
      {/* CHIPS                                                */}
      {/* ==================================================== */}

      {chips.length ? (
        <View
          style={styles.chips}
          pointerEvents="none"
        >
          {chips.map((chip) => (
            <View
              key={chip}
              style={styles.chip}
            >
              <Text
                variant="small"
                style={styles.chipText}
              >
                {chip}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

/**
 * ============================================================
 * STYLES
 * ============================================================
 */
const styles = StyleSheet.create({
  /**
   * The deck itself stays clipped exactly like the original.
   *
   * This is what makes the upcoming cards appear as small
   * tips at the top instead of creating a giant area around
   * the poster.
   */
  deck: {
    alignSelf: 'center',
    overflow: 'hidden',
  },

  /**
   * All cards occupy the same base area.
   */
  layer: {
    position: 'absolute',

    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  /**
   * Current card must always be above the upcoming stack.
   */
  frontLayer: {
    zIndex: 100,
  },

  /**
   * Previous card comes over the current card during
   * an upward swipe.
   */
  previousLayer: {
    zIndex: 200,
  },

  /**
   * ==========================================================
   * CARD
   * ==========================================================
   */
  card: {
    borderRadius: CARD_RADIUS,

    overflow: 'hidden',

    backgroundColor: '#141418',

    borderWidth: StyleSheet.hairlineWidth,

    borderColor:
      'rgba(255,255,255,0.14)',
  },

  blank: {
    alignItems: 'center',

    justifyContent: 'center',

    gap: Spacing.sm,

    padding: Spacing.lg,
  },

  blankTitle: {
    color: '#FFFFFF',

    textAlign: 'center',
  },

  /**
   * Bottom gradient.
   */
  scrim: {
    top: '40%',
  },

  /**
   * Tagline overlay.
   */
  taglineWrap: {
    position: 'absolute',

    left: Spacing.lg,

    right: Spacing.lg,

    bottom: Spacing.xl,
  },

  tagline: {
    color: '#FFFFFF',

    fontSize: 22,

    lineHeight: 27,

    fontWeight: '800',

    letterSpacing: 0.3,

    textShadowColor:
      'rgba(0,0,0,0.6)',

    textShadowOffset: {
      width: 0,
      height: 1,
    },

    textShadowRadius: 4,
  },

  /**
   * Top-left chips.
   */
  chips: {
    position: 'absolute',

    top: Spacing.md,

    left: Spacing.md,

    gap: Spacing.xs,
  },

  chip: {
    alignSelf: 'flex-start',

    paddingHorizontal: Spacing.md,

    paddingVertical: 6,

    borderRadius: Radius.pill,

    backgroundColor:
      'rgba(8,8,10,0.68)',

    borderWidth:
      StyleSheet.hairlineWidth,

    borderColor:
      'rgba(255,255,255,0.12)',
  },

  chipText: {
    color: '#FFFFFF',

    fontWeight: '600',

    fontSize: 13,
  },
});

export const PosterDeck = memo(
  PosterDeckImpl,
);