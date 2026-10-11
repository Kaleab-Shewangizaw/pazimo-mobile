import { getAssetByID } from '@react-native/assets-registry/registry';
import type { VideoSource } from 'expo-video';
import { createElement } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient as SvgGradient, Path, Stop } from 'react-native-svg';

import {
  PANEL_HEIGHT,
  PANEL_UNITS,
  REFLECTION_FADE,
  REFLECTION_PATH,
  REFLECTION_START_OPACITY,
  REFLECTION_VIDEO_TOP,
  SCREEN_HEIGHT,
  SCREEN_PATH,
  SCREEN_UNITS,
} from '@/components/cinema/screen-geometry';

/**
 * Web build of `screen-panel.tsx` — same single box, same shared geometry
 * (see `screen-geometry.ts`); a plain `<video>` with CSS masks stands in for
 * expo-video + MaskedView, which don't render on web.
 */

const PANEL_VIEWBOX = `0 0 100 ${PANEL_UNITS}`;
const SCREEN_VIEWBOX = `0 0 100 ${SCREEN_UNITS}`;

const svgUri = (svg: string) => `data:image/svg+xml,${encodeURIComponent(svg)}`;

const SCREEN_MASK = svgUri(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${SCREEN_VIEWBOX}" preserveAspectRatio="none"><path d="${SCREEN_PATH}" fill="#000"/></svg>`,
);

// The mask's own alpha does the fade, so the reflection dissolves into
// whatever is behind it rather than into an assumed background color.
const REFLECTION_MASK = svgUri(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${PANEL_VIEWBOX}" preserveAspectRatio="none">` +
    `<defs><linearGradient id="f" x1="0" y1="${REFLECTION_FADE.from}" x2="0" y2="${REFLECTION_FADE.to}" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0" stop-color="#000" stop-opacity="${REFLECTION_START_OPACITY}"/>` +
    `<stop offset="0.35" stop-color="#000" stop-opacity="${REFLECTION_START_OPACITY * 0.5}"/>` +
    `<stop offset="1" stop-color="#000" stop-opacity="0"/>` +
    `</linearGradient></defs><path d="${REFLECTION_PATH}" fill="url(#f)"/></svg>`,
);

const mask = (uri: string) =>
  ({
    WebkitMaskImage: `url("${uri}")`,
    maskImage: `url("${uri}")`,
    WebkitMaskSize: '100% 100%',
    maskSize: '100% 100%',
    WebkitMaskRepeat: 'no-repeat',
    maskRepeat: 'no-repeat',
  }) as unknown as ViewStyle;

function video(uri: string, flipped: boolean) {
  return createElement('video', {
    src: uri,
    autoPlay: true,
    muted: true,
    loop: true,
    playsInline: true,
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      transform: flipped ? 'scaleY(-1)' : undefined,
    },
  });
}

export function ScreenPanel({ source }: { source?: VideoSource }) {
  const uri = resolveUri(source);

  return (
    <View style={styles.container} pointerEvents="none">
      <View style={styles.panel}>
        {uri ? (
          <View style={[StyleSheet.absoluteFill, mask(REFLECTION_MASK)]}>
            <View style={styles.reflectedVideo}>{video(uri, true)}</View>
          </View>
        ) : (
          <Svg style={StyleSheet.absoluteFill} viewBox={PANEL_VIEWBOX} preserveAspectRatio="none">
            <Defs>
              <SvgGradient
                id="reflectionFill"
                x1="0"
                y1={REFLECTION_FADE.from}
                x2="0"
                y2={REFLECTION_FADE.to}
                gradientUnits="userSpaceOnUse">
                <Stop offset="0" stopColor="#FFFFFF" stopOpacity={REFLECTION_START_OPACITY * 0.45} />
                <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
              </SvgGradient>
            </Defs>
            <Path d={REFLECTION_PATH} fill="url(#reflectionFill)" />
          </Svg>
        )}

        <View style={styles.screen}>
          {uri ? (
            <View style={[StyleSheet.absoluteFill, mask(SCREEN_MASK)]}>{video(uri, false)}</View>
          ) : (
            <Svg width="100%" height="100%" viewBox={SCREEN_VIEWBOX} preserveAspectRatio="none">
              <Defs>
                <SvgGradient id="screenFill" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.35} />
                  <Stop offset="0.4" stopColor="#FFFFFF" stopOpacity={0.18} />
                  <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0.05} />
                </SvgGradient>
              </Defs>
              <Path d={SCREEN_PATH} fill="url(#screenFill)" />
            </Svg>
          )}
        </View>
      </View>
    </View>
  );
}

function resolveUri(source?: VideoSource): string | null {
  if (source == null) return null;
  if (typeof source === 'string') return source;
  if (typeof source === 'number') {
    const asset = getAssetByID(source);
    if (!asset) return null;
    const type = asset.type ? `.${asset.type}` : '';
    return `${asset.httpServerLocation}/${asset.name}${type}`;
  }
  return source.uri ?? null;
}

const styles = StyleSheet.create({
  container: { width: '100%', alignItems: 'center' },
  panel: { width: '98%', height: PANEL_HEIGHT, overflow: 'hidden' },
  screen: { position: 'absolute', top: 0, left: 0, right: 0, height: SCREEN_HEIGHT },
  reflectedVideo: { position: 'absolute', left: 0, right: 0, top: REFLECTION_VIDEO_TOP, height: SCREEN_HEIGHT },
});
