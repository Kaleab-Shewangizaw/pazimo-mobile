import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { type ReactNode, memo } from 'react';
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

const liquidGlass = Platform.OS === 'ios' && isLiquidGlassAvailable();

export type GlassProps = ViewProps & {
  children?: ReactNode;
  /** `regular` reads as frosted; `clear` is a lighter, more transparent pass. */
  variant?: 'regular' | 'clear';
  /** Blur strength for the non-liquid-glass path. */
  intensity?: number;
  radius?: number;
  bordered?: boolean;
};

function GlassImpl({
  children,
  variant = 'regular',
  intensity = 40,
  radius = Radius.lg,
  bordered = true,
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
  if (liquidGlass) {
    return (
      <GlassView
        glassEffectStyle={variant}
        style={[frame, style]}
        {...rest}
        // The native effect already draws its own edge treatment.
        {...(bordered ? null : { borderWidth: 0 })}>
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
          { backgroundColor: theme.glass, backdropFilter: `blur(${intensity / 2}px)` } as ViewStyle,
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
      style={[frame, style]}
      {...rest}>
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
