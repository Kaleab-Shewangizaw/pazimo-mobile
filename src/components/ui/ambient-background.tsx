import { BlurTargetView, BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { type RefObject, memo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import {
  BACKGROUND_DEFAULT_BLUR_RADIUS,
  BACKGROUND_DEFAULT_DIM,
  BACKGROUND_FROST_INTENSITY,
} from '@/constants/appearance';
import { resolveImageUrl } from '@/lib/media';
import { useAppBackground } from '@/queries/app-background';

/**
 * The page backdrop from the reference design: a softly blurred photo under a
 * real sheet of frosted glass, with every panel floating above.
 *
 * The photo, its blur and the darkening wash are set by admins (web dashboard →
 * App → Appearance). The bundled photo and the defaults in
 * constants/appearance.ts cover first launch, no active image, and a failed
 * request.
 *
 * This is the one sanctioned full-screen BlurView in the app: it sits over a
 * static image, not over scrolling content, so the blur pass has nothing
 * changing beneath it (see the budget note in ui/glass.tsx).
 */
const BG = require('@/assets/images/bg.jpg');

/**
 * Picked once per launch, so with several active images each session gets one
 * of them, and every screen in that session shows the same one.
 */
const SESSION_PICK = Math.random();

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
  const { data } = useAppBackground();
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  const active = data?.images.filter((image) => image.active) ?? [];
  const picked = active.length ? active[Math.floor(SESSION_PICK * active.length)] : null;
  const remoteUrl = resolveImageUrl(picked?.url);
  const source = remoteUrl && remoteUrl !== failedUrl ? { uri: remoteUrl } : BG;

  const blurRadius = data?.blurRadius ?? BACKGROUND_DEFAULT_BLUR_RADIUS;
  // Final darkening pass so panels and text keep their contrast floor.
  const dim = data?.dimOpacity ?? BACKGROUND_DEFAULT_DIM;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* The target must wrap only the raw image, never the `BlurView` that
          samples it — a target containing its own sampler feeds back into
          itself. */}
      <BlurTargetView ref={blurTarget} style={StyleSheet.absoluteFill}>
        <Image
          source={source}
          // Holds the bundled photo on screen while a remote one downloads.
          placeholder={BG}
          placeholderContentFit="cover"
          transition={300}
          onError={() => setFailedUrl(remoteUrl)}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          blurRadius={blurRadius}
          cachePolicy="memory-disk"
        />
      </BlurTargetView>
      {BACKGROUND_FROST_INTENSITY > 0 ? (
        <BlurView
          intensity={BACKGROUND_FROST_INTENSITY}
          tint="dark"
          // Needs its own `blurTarget` too, same as every other BlurView here —
          // without one it silently falls back to a flat tint on Android.
          blurMethod={Platform.OS === 'android' ? ANDROID_BLUR : 'none'}
          blurTarget={blurTarget}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(3, 3, 4, ${dim})` }]} />
    </View>
  );
}

export const AmbientBackground = memo(AmbientBackgroundImpl);
