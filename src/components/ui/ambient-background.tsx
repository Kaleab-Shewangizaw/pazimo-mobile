import { BlurTargetView, BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { type RefObject, memo } from 'react';
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
const GLASS_TINT = 'rgba(3, 3, 4, 0.749)';

/**
 * SDK 31+ only, matches the constant in `ui/glass.tsx`. The pre-31
 * implementation is the one Expo flags as a performance risk.
 */
const ANDROID_BLUR = 'dimezisBlurViewSdk31Plus';

export type AmbientBackgroundProps = {
  /**
   * Hand this to any `<Glass>` floating above the page and Android will blur
   * the real backdrop instead of settling for a flat tint (SDK 57 requires an
   * explicit target). Cheap here because this backdrop never changes.
   */
  blurTarget?: RefObject<View | null>;
};

function AmbientBackgroundImpl({ blurTarget }: AmbientBackgroundProps) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* The target must wrap only the raw image, never the `BlurView` that
          samples it — a target containing its own sampler feeds back into
          itself. */}
      <BlurTargetView ref={blurTarget} style={StyleSheet.absoluteFill}>
        <Image
          source={BG}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          blurRadius={16}
          cachePolicy="memory-disk"
        />
      </BlurTargetView>
      <BlurView
        intensity={60}
        tint="dark"
        // Needs its own `blurTarget` too, same as every other BlurView here —
        // without one it silently falls back to a flat tint on Android.
        blurMethod={Platform.OS === 'android' ? ANDROID_BLUR : 'none'}
        blurTarget={blurTarget}
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
