import MaskedView from '@react-native-masked-view/masked-view';
import { useVideoPlayer, VideoView, type VideoSource } from 'expo-video';
import { StyleSheet, View } from 'react-native';
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

const PANEL_VIEWBOX = `0 0 100 ${PANEL_UNITS}`;
const SCREEN_VIEWBOX = `0 0 100 ${SCREEN_UNITS}`;

/**
 * The cinema screen at the top of a seat map, playing a looping muted clip,
 * with its reflection on the floor below. Both layers sit in ONE box and
 * share one coordinate system (see `screen-geometry.ts`), so the reflection
 * begins exactly on the screen's curved bottom edge — no gap, no overlap.
 *
 * The reflection fades out through its mask's own alpha rather than a
 * painted-on gradient, so it dissolves into whatever is behind the map
 * instead of into an assumed background color.
 */
export function ScreenPanel({ source }: { source?: VideoSource }) {
  const player = useVideoPlayer(source ?? null, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  return (
    <View style={styles.container} pointerEvents="none">
      <View style={styles.panel}>
        {/* Reflection first, so the screen draws over the shared edge. */}
        {source ? (
          <MaskedView
            style={StyleSheet.absoluteFill}
            maskElement={
              <Svg width="100%" height="100%" viewBox={PANEL_VIEWBOX} preserveAspectRatio="none">
                <FadeGradient id="reflectionMask" color="#000000" />
                <Path d={REFLECTION_PATH} fill="url(#reflectionMask)" />
              </Svg>
            }>
            <VideoView
              player={player}
              style={styles.reflectedVideo}
              contentFit="cover"
              nativeControls={false}
            />
          </MaskedView>
        ) : (
          <Svg style={StyleSheet.absoluteFill} viewBox={PANEL_VIEWBOX} preserveAspectRatio="none">
            <FadeGradient id="reflectionFill" color="#FFFFFF" scale={0.45} />
            <Path d={REFLECTION_PATH} fill="url(#reflectionFill)" />
          </Svg>
        )}

        <View style={styles.screen}>
          {source ? (
            <MaskedView
              style={StyleSheet.absoluteFill}
              maskElement={
                <Svg width="100%" height="100%" viewBox={SCREEN_VIEWBOX} preserveAspectRatio="none">
                  <Path d={SCREEN_PATH} fill="#000000" />
                </Svg>
              }>
              <VideoView
                player={player}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                nativeControls={false}
              />
            </MaskedView>
          ) : (
            <Svg width="100%" height="100%" viewBox={SCREEN_VIEWBOX} preserveAspectRatio="none">
              <Defs>
                <SvgGradient id="screenFill" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.3} />
                  <Stop offset="0.4" stopColor="#FFFFFF" stopOpacity={0.17} />
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

/**
 * Fades down the reflection in panel units: `REFLECTION_START_OPACITY` at
 * the screen's edge, nothing at the bottom. As a mask (black) it fades the
 * mirrored video itself; as a fill (white) it's the no-video fallback.
 */
function FadeGradient({ id, color, scale = 1 }: { id: string; color: string; scale?: number }) {
  const start = REFLECTION_START_OPACITY * scale;
  return (
    <Defs>
      <SvgGradient
        id={id}
        x1="0"
        y1={REFLECTION_FADE.from}
        x2="0"
        y2={REFLECTION_FADE.to}
        gradientUnits="userSpaceOnUse">
        <Stop offset="0" stopColor={color} stopOpacity={start} />
        <Stop offset="0.35" stopColor={color} stopOpacity={start * 0.5} />
        <Stop offset="1" stopColor={color} stopOpacity={0} />
      </SvgGradient>
    </Defs>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', alignItems: 'center' },
  panel: { width: '98%', height: PANEL_HEIGHT, overflow: 'hidden' },
  // The screen's video box is exactly the screen's units tall, so its mask
  // (viewBox 0…SCREEN_UNITS) lines up with the panel's own coordinates.
  screen: { position: 'absolute', top: 0, left: 0, right: 0, height: SCREEN_HEIGHT },
  // The same video, flipped about the screen's bottom contour.
  reflectedVideo: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: REFLECTION_VIDEO_TOP,
    height: SCREEN_HEIGHT,
    transform: [{ scaleY: -1 }],
  },
});
