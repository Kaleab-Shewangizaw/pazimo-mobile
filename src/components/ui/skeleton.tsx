import { memo, useEffect } from 'react';
import { type DimensionValue, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Pulse runs on the UI thread via Reanimated, so a screenful of skeletons costs
 * nothing on the JS thread while the first fetch is in flight.
 */
function SkeletonImpl({
  width = '100%',
  height = 16,
  radius = Radius.sm,
  style,
}: {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  style?: ViewStyle;
}) {
  const theme = useTheme();
  const opacity = useSharedValue(0.55);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 850 }), -1, true);
    return () => cancelAnimation(opacity);
  }, [opacity]);

  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: theme.skeleton },
        animated,
        style,
      ]}
    />
  );
}

export const Skeleton = memo(SkeletonImpl);
