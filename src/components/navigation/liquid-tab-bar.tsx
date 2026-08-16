import type { BottomTabBarProps, BottomTabNavigationOptions } from 'expo-router/js-tabs';
import * as Haptics from 'expo-haptics';
import { type ReactNode, memo, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';

import { Glass, hasLiquidGlass } from '@/components/ui/glass';
import { Touchable } from '@/components/ui/pressable';
import { TabBar } from '@/constants/layout';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * The floating capsule tab bar, rendered by hand rather than through
 * `tabBarBackground` + `tabBarIcon`.
 *
 * Two things the option-based version could not do, both of which are the
 * difference between "a blurred rectangle" and glass:
 *
 *  1. Nothing may be painted *over* the glass. The previous bar stacked an
 *     opaque `rgba(12,12,14,0.55)` view on top of the native effect, which
 *     flattened the lensing and specular edge into frosted plastic. Any tint now
 *     goes through `tintColor` so the effect composites it itself.
 *  2. The selection indicator has to know where every tab sits so it can travel
 *     between them. `tabBarIcon` only ever sees its own tab, so the old pill
 *     could only pop from slot to slot.
 *
 * Everything animated here runs on the native driver, which rules out animating
 * `width`, `left` or `color` — hence `scaleX`/`scaleY` for the stretch and a
 * crossfade between two pre-coloured icons rather than an interpolated tint.
 */

const PILL_HEIGHT = 44;
/** Cap so the indicator stays a pill on wide screens instead of a slab. */
const PILL_MAX_WIDTH = 68;
const ICON_SIZE = 24;

/**
 * The raised centre action. A pill rather than a disc because it carries a word
 * — a circle wide enough to set text in would tower over the flat icons either
 * side of it.
 */
const ACTION_WIDTH = 78;
const ACTION_HEIGHT = 48;
/** Size hint for the content renderer, when it draws a glyph instead of text. */
const ACTION_ICON = 22;
/** How far the button stands proud of the bar. */
const ACTION_LIFT = 14;

const INACTIVE_ICON = 'rgba(255,255,255,0.72)';

const SLIDE_SPRING = { useNativeDriver: true, speed: 18, bounciness: 6 } as const;

/**
 * Squash and stretch. The pill lengthens along its direction of travel and
 * thins vertically to preserve apparent volume, then springs back — the cue
 * that reads as "liquid" rather than "a rectangle that moved".
 */
const STRETCH_X = 1.18;
const SQUASH_Y = 0.94;

/**
 * The travelling pill takes roughly this long to get under the incoming icon.
 * The icon's fill and pop are held back by it so a black glyph never flashes
 * against dark glass in open space.
 */
const ARRIVAL_DELAY = 120;

/**
 * `href: null` is expo-router's way of keeping a route navigable while taking it
 * off the bar. It implements that by stamping `display: 'none'` onto
 * `tabBarItemStyle` — which a stock tab bar honours for free, and a hand-rolled
 * one like this has to read for itself or it draws an empty slot.
 */
function isHidden(options: BottomTabNavigationOptions): boolean {
  const style = StyleSheet.flatten(options.tabBarItemStyle);
  return style?.display === 'none';
}

export type LiquidTabBarProps = BottomTabBarProps & {
  /**
   * Route name to raise out of the bar as a round action button instead of a
   * flat slot. It still navigates like any other tab; it just doesn't take the
   * travelling pill, because a pill sliding under a raised button reads as two
   * indicators fighting.
   */
  centerRoute?: string;
  /** What that button shows — a word or a glyph — drawn on the brand fill. */
  renderCenterContent?: (props: { color: string; size: number }) => ReactNode;
  centerLabel?: string;
};

function LiquidTabBarImpl({
  state,
  descriptors,
  navigation,
  insets,
  centerRoute,
  renderCenterContent,
  centerLabel,
}: LiquidTabBarProps) {
  const { width } = useWindowDimensions();
  const theme = useTheme();

  // Hidden routes still exist in navigation state — they are reachable by
  // `router.push`, they just have no slot here.
  const visible = state.routes.filter((route) => !isHidden(descriptors[route.key].options));
  const active = state.routes[state.index];
  // -1 when a hidden route is showing, which parks the pill rather than
  // sliding it somewhere arbitrary.
  const activeIndex = visible.findIndex((route) => route.key === active?.key);
  const centerIndex = centerRoute ? visible.findIndex((r) => r.name === centerRoute) : -1;

  const count = visible.length;
  // Derived from the window rather than measured via `onLayout`: the app is
  // portrait-locked and the dock spans the full width, so this is exact and
  // spares the indicator a frame parked at x=0 on first paint.
  const barWidth = width - insets.left - insets.right - TabBar.inset * 2;
  const slotWidth = barWidth / count;
  const pillWidth = Math.min(slotWidth - Spacing.sm, PILL_MAX_WIDTH);

  // The pill has nowhere meaningful to sit when the raised button owns the
  // selection, or when the showing route was never on the bar at all.
  const pillVisible = activeIndex >= 0 && activeIndex !== centerIndex;

  // Animated.Value, not a Reanimated shared value — see the note in
  // `components/ui/pressable.tsx` about the React Compiler.
  const [slide] = useState(() => new Animated.Value(Math.max(activeIndex, 0)));
  const [stretch] = useState(() => new Animated.Value(0));
  const hasMounted = useRef(false);

  useEffect(() => {
    // The initial index is already the resting value; animating it on mount
    // would flick the pill across an empty bar as the app opens.
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    if (activeIndex < 0) return;
    Animated.parallel([
      Animated.spring(slide, { toValue: activeIndex, ...SLIDE_SPRING }),
      Animated.sequence([
        Animated.timing(stretch, {
          toValue: 1,
          duration: 120,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(stretch, {
          toValue: 0,
          speed: 14,
          bounciness: 14,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [activeIndex, slide, stretch]);

  // `slide` carries the tab index; the pixel offset is interpolated at render so
  // a width change re-derives it for free.
  const translateX =
    count > 1
      ? slide.interpolate({
          inputRange: visible.map((_, i) => i),
          outputRange: visible.map((_, i) => i * slotWidth + (slotWidth - pillWidth) / 2),
        })
      : (slotWidth - pillWidth) / 2;

  const scaleX = stretch.interpolate({ inputRange: [0, 1], outputRange: [1, STRETCH_X] });
  const scaleY = stretch.interpolate({ inputRange: [0, 1], outputRange: [1, SQUASH_Y] });

  const press = (route: (typeof state.routes)[number], focused: boolean) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
        // A device without a taptic engine must not throw.
      });
    }
    // Emitted even when already focused — `useScrollToTop` listens for this to
    // send the active feed back to the top.
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });
    if (!focused && !event.defaultPrevented) {
      navigation.navigate(route.name, route.params);
    }
  };

  const centre = centerIndex >= 0 ? visible[centerIndex] : null;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.dock, { paddingBottom: insets.bottom + TabBar.floatGap }]}>
      {/* The shadow lives on a wrapper: `Glass` clips its own children, and a
          floating capsule has no surface behind it to imply depth. */}
      <View style={styles.shadow}>
        <Glass
          variant="regular"
          intensity={50}
          radius={Radius.xl}
          // The native effect draws its own edge; a hairline on top of it reads
          // as a seam. The blur fallback still needs one to define the shape.
          bordered={!hasLiquidGlass}
          interactive
          tint={hasLiquidGlass ? undefined : 'rgba(12, 12, 14, 0.55)'}
          style={styles.bar}>
          <Animated.View
            style={[
              styles.pill,
              {
                width: pillWidth,
                opacity: pillVisible ? 1 : 0,
                transform: [{ translateX }, { scaleX }, { scaleY }],
              },
            ]}
          />
          <View style={styles.row}>
            {visible.map((route, index) => {
              const { options } = descriptors[route.key];
              const focused = route.key === active?.key;

              // The raised button is drawn outside the glass, which clips its
              // children — so the slot it would occupy is held open instead.
              if (index === centerIndex) {
                return <View key={route.key} style={styles.slot} />;
              }

              return (
                <TabSlot
                  key={route.key}
                  focused={focused}
                  label={options.tabBarAccessibilityLabel ?? options.title}
                  testID={options.tabBarButtonTestID}
                  renderIcon={options.tabBarIcon}
                  onPress={() => press(route, focused)}
                  onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
                />
              );
            })}
          </View>
        </Glass>

        {/* Sibling of the glass, not a child of it: the button has to break the
            bar's top edge, and `Glass` clips whatever it contains. Positioned
            against the bar rather than the dock so the maths stays in one
            coordinate space. */}
        {centre ? (
          <Touchable
            accessibilityRole="button"
            accessibilityState={{ selected: activeIndex === centerIndex }}
            accessibilityLabel={
              centerLabel ?? descriptors[centre.key].options.title ?? centre.name
            }
            haptic
            pressedScale={0.9}
            onPress={() => press(centre, activeIndex === centerIndex)}
            style={[
              styles.action,
              {
                left: centerIndex * slotWidth + (slotWidth - ACTION_WIDTH) / 2,
                bottom: TabBar.height - ACTION_HEIGHT + ACTION_LIFT,
                backgroundColor: theme.brand,
                // The travelling pill can't mark this slot, so the ring does:
                // dark it reads as a cut-out, light it reads as selected.
                borderColor:
                  activeIndex === centerIndex ? '#FFFFFF' : 'rgba(8,8,10,0.85)',
              },
            ]}>
            {renderCenterContent?.({ color: theme.onBrand, size: ACTION_ICON })}
          </Touchable>
        ) : null}
      </View>
    </View>
  );
}

type TabSlotProps = {
  focused: boolean;
  label?: string;
  testID?: string;
  /**
   * Called twice — once unfocused, once focused — so both weights of the icon
   * can be stacked and crossfaded. Keeps the icon set declared per-screen in
   * `(tabs)/_layout.tsx` while the bar keeps control of the transition.
   */
  renderIcon?: (props: { focused: boolean; color: string; size: number }) => ReactNode;
  onPress: () => void;
  onLongPress: () => void;
};

function TabSlotImpl({
  focused,
  label,
  testID,
  renderIcon,
  onPress,
  onLongPress,
}: TabSlotProps) {
  const theme = useTheme();

  const [focus] = useState(() => new Animated.Value(focused ? 1 : 0));
  const [pop] = useState(() => new Animated.Value(1));
  const hasMounted = useRef(false);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    Animated.parallel([
      Animated.timing(focus, {
        toValue: focused ? 1 : 0,
        duration: 170,
        // Gaining focus waits for the pill; losing it clears immediately, so
        // the outgoing glyph is never left dark once the pill has moved off.
        delay: focused ? ARRIVAL_DELAY : 0,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      // Dip then spring: the overshoot on the way back out is the "pop", so it
      // comes from the spring itself rather than a scripted third keyframe.
      Animated.sequence([
        Animated.timing(pop, {
          toValue: focused ? 0.86 : 0.94,
          duration: focused ? 110 : 90,
          delay: focused ? ARRIVAL_DELAY : 0,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(pop, {
          toValue: 1,
          speed: 13,
          bounciness: focused ? 20 : 4,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [focus, focused, pop]);

  const outlineOpacity = focus.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      testID={testID}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.slot}>
      <Animated.View style={{ transform: [{ scale: pop }] }}>
        <Animated.View style={{ opacity: outlineOpacity }}>
          {renderIcon?.({ focused: false, color: INACTIVE_ICON, size: ICON_SIZE })}
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, styles.center, { opacity: focus }]}>
          {renderIcon?.({ focused: true, color: theme.onBrand, size: ICON_SIZE })}
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const TabSlot = memo(TabSlotImpl);

const styles = StyleSheet.create({
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: TabBar.inset,
  },
  shadow: {
    borderRadius: Radius.xl,
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    // Deliberately no `elevation`: on Android it would promote this to its own
    // layer and draw an opaque outline behind the translucent blur fallback.
    elevation: 0,
  },
  bar: { height: TabBar.height },
  action: {
    position: 'absolute',
    width: ACTION_WIDTH,
    height: ACTION_HEIGHT,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    // Its own shadow: it floats above a bar that is already floating, and
    // without one it reads as a sticker rather than a raised control.
    shadowColor: '#000000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    // A ring separating the button from the bar's lit edge where they overlap.
    // Its colour is set per-render — it doubles as the selected state.
    borderWidth: 3,
  },
  row: { flex: 1, flexDirection: 'row' },
  slot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  pill: {
    position: 'absolute',
    top: (TabBar.height - PILL_HEIGHT) / 2,
    left: 0,
    height: PILL_HEIGHT,
    borderRadius: Radius.pill,
    backgroundColor: '#FFFFFF',
  },
});

export const LiquidTabBar = memo(LiquidTabBarImpl);
