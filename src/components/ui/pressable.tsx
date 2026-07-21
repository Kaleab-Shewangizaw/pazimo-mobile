import * as Haptics from 'expo-haptics';
import { type ReactNode, memo, useCallback, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

/**
 * Press feedback uses React Native's Animated with `useNativeDriver`, not a
 * Reanimated shared value. Both animate on the UI thread, but this project has
 * the React Compiler enabled (`experiments.reactCompiler` in app.json) and the
 * compiler treats `sharedValue.value = x` inside an event handler as mutating an
 * immutable binding. An Animated.Value ref sidesteps that entirely.
 */

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SPRING = { useNativeDriver: true, speed: 40, bounciness: 4 } as const;

export type TouchableProps = Omit<PressableProps, 'style'> & {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Scale applied while held. Set to 1 to disable the press animation. */
  pressedScale?: number;
  haptic?: boolean;
};

function TouchableImpl({
  children,
  style,
  pressedScale = 0.97,
  haptic = false,
  onPressIn,
  onPress,
  ...rest
}: TouchableProps) {
  // Lazy state rather than a ref: the compiler forbids reading `ref.current`
  // during render, and this value is only ever read by the native driver.
  const [scale] = useState(() => new Animated.Value(1));

  const handlePressIn = useCallback<NonNullable<PressableProps['onPressIn']>>(
    (event) => {
      Animated.spring(scale, { toValue: pressedScale, ...SPRING }).start();
      onPressIn?.(event);
    },
    [onPressIn, pressedScale, scale],
  );

  const handlePressOut = useCallback(() => {
    Animated.spring(scale, { toValue: 1, ...SPRING }).start();
  }, [scale]);

  const handlePress = useCallback<NonNullable<PressableProps['onPress']>>(
    (event) => {
      if (haptic && Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
          // Haptics are a nicety; a device without a taptic engine must not throw.
        });
      }
      onPress?.(event);
    },
    [haptic, onPress],
  );

  return (
    <AnimatedPressable
      style={[style, { transform: [{ scale }] }]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      {...rest}>
      {children}
    </AnimatedPressable>
  );
}

export const Touchable = memo(TouchableImpl);
