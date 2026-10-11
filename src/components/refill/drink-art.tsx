import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { memo, useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

const BOB_DURATION = 1600;
/** How far the drink lifts at the top of its float, px. */
const BOB_LIFT = 6;

export type DrinkArtProps = {
  /** Already resolved via `resolveImageUrl`. Usually a background-removed cutout. */
  imageUrl?: string | null;
  /** The drink's own color — only tints the fallback icon when there's no image. */
  color?: string | null;
  /** How tall the art is. The image is drawn whole inside it ("contain"). */
  height: number;
  /** Shown when the drink has no image. */
  fallbackIcon?: keyof typeof Ionicons.glyphMap;
  /** Float gently. Off when the system's Reduce Motion is on. */
  animated?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * A drink drawn as a product shot rather than a photo crop: its own image —
 * almost always a background-removed cutout — whole and centered on a clear
 * background (nothing painted behind it; whatever surface it sits on shows
 * through), with just a soft shadow on the "floor" that shrinks as it lifts.
 * Cover-cropping a cutout slices the bottle in half and fills the frame with
 * its transparent margin; `contain` keeps the whole drink.
 */
function DrinkArtImpl({
  imageUrl,
  color,
  height,
  fallbackIcon = 'wine',
  animated = true,
  style,
}: DrinkArtProps) {
  const reduceMotion = useReducedMotion();
  const float = animated && !reduceMotion;
  const [bob] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!float) {
      bob.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: BOB_DURATION, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: BOB_DURATION, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [float, bob]);

  const imageSize = height * 0.82;

  return (
    <View style={[styles.art, { height }, style]}>
      {/* Floor shadow — tighter and darker when the drink is lower. */}
      <Animated.View
        style={[
          styles.shadow,
          {
            width: imageSize * 0.55,
            opacity: bob.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.22] }),
            transform: [{ scaleX: bob.interpolate({ inputRange: [0, 1], outputRange: [1, 0.82] }) }],
          },
        ]}
      />

      <Animated.View
        style={{
          transform: [
            { translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -BOB_LIFT] }) },
            { rotate: bob.interpolate({ inputRange: [0, 1], outputRange: ['-2deg', '2deg'] }) },
          ],
        }}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={{ width: imageSize, height: imageSize }}
            contentFit="contain"
            transition={200}
          />
        ) : (
          <Ionicons name={fallbackIcon} size={height * 0.36} color={color || 'rgba(255,255,255,0.35)'} />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  art: { width: '100%', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  shadow: {
    position: 'absolute',
    bottom: '7%',
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
});

export const DrinkArt = memo(DrinkArtImpl);
