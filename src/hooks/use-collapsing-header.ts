import {
  clamp,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

/**
 * Instagram-style header: it tracks the finger 1:1 off-screen while scrolling
 * down, comes back the moment the user scrolls up, and snaps fully shown or
 * fully hidden when the gesture settles.
 *
 * `height` is the header's full height including the top safe-area inset, so
 * the hidden state clears the screen entirely. Spread `scrollHandler` onto a
 * Reanimated `Animated.ScrollView` (with `scrollEventThrottle={16}`) and
 * `headerStyle` onto the header.
 */
export function useCollapsingHeader(height: number) {
  /** 0 = fully shown, `height` = fully hidden. */
  const offset = useSharedValue(0);
  const lastY = useSharedValue(0);

  const snap = (y: number) => {
    'worklet';
    // Never leave a gap above the content near the top of the page.
    const hide = offset.value > height / 2 && y > height;
    offset.value = withTiming(hide ? height : 0, { duration: 180 });
  };

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      const y = e.contentOffset.y;
      const dy = y - lastY.value;
      lastY.value = y;

      // Pull-to-refresh / top overscroll: always show.
      if (y <= 0) {
        offset.value = 0;
        return;
      }
      // Bottom rubber-band bounce reports an upward delta — ignore it so the
      // header doesn't flash back in at the end of the feed.
      const maxY = e.contentSize.height - e.layoutMeasurement.height;
      if (y >= maxY) return;

      // Capped at `y` so near the top the header scrolls away with the content
      // instead of opening a blank band.
      offset.value = clamp(offset.value + dy, 0, Math.min(height, y));
    },
    onEndDrag: (e) => {
      // A drag with momentum is settled by onMomentumEnd instead.
      if (e.velocity && Math.abs(e.velocity.y) > 0.1) return;
      snap(e.contentOffset.y);
    },
    onMomentumEnd: (e) => snap(e.contentOffset.y),
  });

  const headerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -offset.value }],
  }));

  return { scrollHandler, headerStyle };
}
