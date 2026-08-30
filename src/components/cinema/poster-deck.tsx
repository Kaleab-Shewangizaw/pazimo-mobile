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

const POSTER_ASPECT = 1.5;

/**
 * ============================================================
 * STACK PREVIEW
 * ============================================================
 *
 * The first upcoming card peeks slightly above the current one.
 *
 * The second and third upcoming cards peek a little further
 * above it, creating the visual feeling of a deck.
 *
 * ONLY THE TOP is exposed.
 *
 * Nothing is added to the bottom.
 */
const PEEK_RATIO = 0.09;
const PEEK_SCALE = 0.93;

/**
 * Additional cards in the visible stack.
 *
 * Keeping this at 3 gives:
 *
 *     Movie 3  ── tiny tip
 *       Movie 2 ── tip
 *         Movie 1 ── current
 *
 * without making the stack distracting.
 */
const STACK_PREVIEW_COUNT = 3;

/**
 * Distance between each visible card tip.
 */
const STACK_GAP_RATIO = 0.055;

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
    width * POSTER_ASPECT,
    maxHeight ?? Infinity,
  );

  const peek = height * PEEK_RATIO;
  const stackGap = height * STACK_GAP_RATIO;

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

  /**
   * We keep the previous card exactly as before.
   */
  const previous = entries[index - 1];

  /**
   * Build the upcoming stack.
   *
   * entries[index + 1]
   * entries[index + 2]
   * entries[index + 3]
   */
  const upcoming = entries.slice(
    index + 1,
    index + 1 + STACK_PREVIEW_COUNT,
  );

  /**
   * ==========================================================
   * CURRENT CARD
   * ==========================================================
   *
   * Same behavior as the original:
   *
   * positive drag -> card moves down.
   *
   * negative drag -> front card stays at the top while the
   * previous card comes over it.
   */
  const frontY = drag.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [0, 0, 1],
  });

  /**
   * ==========================================================
   * PREVIOUS CARD
   * ==========================================================
   *
   * EXACT SAME movement:
   *
   * At rest:
   *   translateY = height
   *
   * Swipe UP:
   *   translateY -> 0
   *
   * No blur.
   * No opacity.
   */
  const previousY = drag.interpolate({
    inputRange: [-height, 0],
    outputRange: [0, height],
    extrapolate: 'clamp',
  });

  const previousScale = drag.interpolate({
    inputRange: [-height, 0],
    outputRange: [1, PEEK_SCALE],
    extrapolate: 'clamp',
  });

  return (
    <View
      style={[
        styles.deck,
        {
          width,
          height,
        },
      ]}
      {...pan.panHandlers}
    >
      {/* ==================================================== */}
      {/* PREVIOUS CARD                                        */}
      {/* ==================================================== */}
      {previous ? (
        <Animated.View
          style={[
            styles.layer,
            styles.previousLayer,
            {
              /**
               * IMPORTANT:
               *
               * Completely solid.
               *
               * No blur.
               * No fade.
               */
              opacity: 1,

              transform: [
                {
                  translateY: previousY,
                },
                {
                  scale: previousScale,
                },
              ],
            },
          ]}
        >
          <PosterCard
            entry={previous}
            width={width}
            height={height}
          />
        </Animated.View>
      ) : null}

      {/* ==================================================== */}
      {/* UPCOMING STACK                                       */}
      {/* ==================================================== */}
      {/*
       *
       * The cards are rendered from deepest -> closest.
       *
       * Each one sits slightly higher than the one before it.
       *
       * This creates:
       *
       *        ┌───────────────┐
       *        │    MOVIE 3   │
       *        └───────────────┘
       *          ┌───────────────┐
       *          │    MOVIE 2   │
       *          └───────────────┘
       *            ┌───────────────┐
       *            │    MOVIE 1   │
       *            └───────────────┘
       *              CURRENT
       *
       * Only the TOP tips are visible.
       *
       * There is NOTHING sticking out from the bottom.
       */}

      {upcoming
        .slice()
        .reverse()
        .map((entry, reversedIndex) => {
          /**
           * Convert reversed index back into stack position.
           *
           * Example:
           *
           * Movie 3 -> 2
           * Movie 2 -> 1
           * Movie 1 -> 0
           */
          const stackIndex =
            upcoming.length - 1 - reversedIndex;

          /**
           * The closest upcoming card is the lowest one.
           *
           * Deeper cards sit further above it.
           */
          const restingY =
            -peek - stackIndex * stackGap;

          /**
           * When the current card moves down, the closest
           * upcoming card moves into its position.
           *
           * The other cards follow the same stack relationship.
           */
          const targetY =
            stackIndex === 0
              ? 0
              : -stackIndex * stackGap;

          const cardY = drag.interpolate({
            inputRange: [0, height],
            outputRange: [restingY, targetY],
            extrapolate: 'clamp',
          });

          /**
           * Keep the cards slightly smaller while they are
           * behind the current poster.
           *
           * They become full size as they become the front card.
           */
          const scale = drag.interpolate({
            inputRange: [0, height],
            outputRange: [
              Math.max(
                0.88,
                PEEK_SCALE -
                  stackIndex * 0.025,
              ),
              stackIndex === 0
                ? 1
                : Math.max(
                    0.88,
                    PEEK_SCALE -
                      (stackIndex - 1) * 0.025,
                  ),
            ],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={entry.movie._id}
              pointerEvents="none"
              style={[
                styles.layer,

                /**
                 * Deeper cards get lower z-index.
                 * The closest upcoming card sits above them.
                 */
                {
                  zIndex: 10 + stackIndex,

                  /**
                   * FULLY SOLID.
                   *
                   * No blur.
                   * No opacity animation.
                   */
                  opacity: 1,

                  transform: [
                    {
                      translateY: cardY,
                    },
                    {
                      scale,
                    },
                  ],
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

          /**
           * Always above the upcoming cards.
           */
          styles.frontLayer,

          {
            transform: [
              {
                translateY: frontY,
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