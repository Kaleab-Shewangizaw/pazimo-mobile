import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { memo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

/**
 * The page backdrop from the reference design: a softly blurred photo under a
 * real sheet of frosted glass, with every panel floating above.
 *
 * This is the one sanctioned full-screen BlurView in the app: it sits over a
 * static image, not over scrolling content, so the blur pass has nothing
 * changing beneath it (see the budget note in ui/glass.tsx).
 */
const BG = require('@/assets/images/bg.jpg');

/** Final darkening pass so panels and text keep their contrast floor. */
const GLASS_TINT = 'rgba(3, 3, 4, 0.55)';

function AmbientBackgroundImpl() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Image
        source={BG}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        blurRadius={10}
        cachePolicy="memory-disk"
      />
      <BlurView
        intensity={40}
        tint="dark"
        // Android's BlurView only tints unless the experimental renderer is on.
        experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : 'none'}
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, styles.glass]} />
    </View>
  );
}

const styles = StyleSheet.create({
  glass: { backgroundColor: GLASS_TINT },
});

export const AmbientBackground = memo(AmbientBackgroundImpl);
