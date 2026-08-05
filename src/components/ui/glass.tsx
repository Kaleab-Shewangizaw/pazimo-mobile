import { BlurView } from 'expo-blur';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { type ReactNode, type RefObject, memo } from 'react';
import { Platform, StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme, useThemeName } from '@/hooks/use-theme';

/**
 * Real blur is the expensive part of glassmorphism: every blurred view forces an
 * offscreen pass over what is behind it, and on Android that cost lands on the
 * UI thread. So this file exposes two components with the same visual language
 * but very different budgets:
 *
 *   <Glass>   — genuine backdrop blur. Use for *chrome*: headers, the tab bar,
 *               floating action bars. A bounded number of them, none recycled.
 *   <Surface> — a flat translucent fill with the same border and radius. Use for
 *               anything inside a scrolling list.
 *
 * Putting <Glass> in a list row is the single easiest way to make this app janky.
 */

/**
 * Two separate checks, both required. `isLiquidGlassAvailable` only reports that
 * the app is *built* against the Liquid Glass design; several iOS 26 betas ship
 * without the underlying API, where touching `GlassView` crashes. Expo added
 * `isGlassEffectAPIAvailable` for exactly that gap (expo/expo#40911).
 */
export const hasLiquidGlass =
  Platform.OS === 'ios' && isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

export type GlassProps = ViewProps & {
  children?: ReactNode;
  /** `regular` reads as frosted; `clear` is a lighter, more transparent pass. */
  variant?: 'regular' | 'clear';
  /** Blur strength for the non-liquid-glass path. */
  intensity?: number;
  radius?: number;
  bordered?: boolean;
  /**
   * Colour washed *into* the glass. Use this instead of stacking your own
   * translucent `<View>` on top: an overlay sits above the native effect and
   * flattens the lensing and specular highlights that make it read as glass,
   * whereas `tintColor` is composited by the effect itself.
   */
  tint?: string;
  /**
   * Let the glass react to touch the way native iOS 26 chrome does — it warps
   * and brightens around the finger. iOS 26+ only; a no-op elsewhere.
   */
  interactive?: boolean;
  /**
   * Ref to the `<BlurTargetView>` wrapping whatever should show through.
   * Android-only, and mandatory there since SDK 57: a blur method without a
   * target silently degrades to a flat tint (and warns). Point it at *static*
   * content — a fixed backdrop, a hero photo — never at a scrolling subtree,
   * which the blur would have to re-capture every frame.
   */
  blurTarget?: RefObject<View | null>;
};

/**
 * SDK 31+ only. The pre-31 implementation is the one Expo flags as a
 * performance risk, and `dimezisBlurViewSdk31Plus` falls back to a plain tint
 * there rather than dragging the UI thread down.
 */
const ANDROID_BLUR = 'dimezisBlurViewSdk31Plus';

function GlassImpl({
  children,
  variant = 'regular',
  intensity = 40,
  radius = Radius.lg,
  bordered = true,
  tint,
  interactive = false,
  blurTarget,
  style,
  ...rest
}: GlassProps) {
  const theme = useTheme();
  const scheme = useThemeName();

  const frame: ViewStyle = {
    borderRadius: radius,
    overflow: 'hidden',
    borderWidth: bordered ? StyleSheet.hairlineWidth : 0,
    borderColor: theme.glassBorder,
  };

  // iOS 26+ renders true liquid glass natively — cheaper and better looking
  // than a BlurView, and it picks up the system's specular highlights.
  if (hasLiquidGlass) {
    return (
      <GlassView
        glassEffectStyle={variant}
        // Pinned rather than "auto": the app is dark-only, and this must not
        // drift if a user has their system appearance set to light.
        colorScheme="dark"
        tintColor={tint}
        isInteractive={interactive}
        style={[frame, style]}
        {...rest}>
        {children}
      </GlassView>
    );
  }

  // Web has no BlurView; `backdrop-filter` via a plain view is the closest
  // equivalent and costs nothing extra on the native side.
  if (Platform.OS === 'web') {
    return (
      <View
        style={[
          frame,
          {
            backgroundColor: tint ?? theme.glass,
            backdropFilter: `blur(${intensity / 2}px)`,
          } as ViewStyle,
          style,
        ]}
        {...rest}>
        {children}
      </View>
    );
  }

  return (
    <BlurView
      intensity={intensity}
      tint={scheme === 'dark' ? 'dark' : 'light'}
      // Naming a method with no target is worse than not asking for one: SDK 57
      // warns and falls back anyway.
      blurMethod={blurTarget ? ANDROID_BLUR : 'none'}
      blurTarget={blurTarget}
      style={[frame, style]}
      {...rest}>
      {/* No native tint to composite into, so the fallback paints it as a fill
          under the content. */}
      {tint ? <View style={[StyleSheet.absoluteFill, { backgroundColor: tint }]} /> : null}
      {children}
    </BlurView>
  );
}

export const Glass = memo(GlassImpl);

export type SurfaceProps = ViewProps & {
  children?: ReactNode;
  radius?: number;
  bordered?: boolean;
  /** `muted` sits a step back from the page; `raised` sits a step forward. */
  tone?: 'raised' | 'muted';
};

function SurfaceImpl({
  children,
  radius = Radius.lg,
  bordered = true,
  tone = 'raised',
  style,
  ...rest
}: SurfaceProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: tone === 'raised' ? theme.surface : theme.surfaceMuted,
          borderRadius: radius,
          borderWidth: bordered ? StyleSheet.hairlineWidth : 0,
          borderColor: theme.hairline,
        },
        style,
      ]}
      {...rest}>
      {children}
    </View>
  );
}

export const Surface = memo(SurfaceImpl);
