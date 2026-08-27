import { getAssetByID } from '@react-native/assets-registry/registry';
import { LinearGradient } from 'expo-linear-gradient';
import type { VideoSource } from 'expo-video';
import { createElement } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, {
  Defs,
  Path,
  Stop,
  LinearGradient as SvgGradient,
} from 'react-native-svg';

/**
 * ================================================================
 * CINEMA SCREEN
 * ================================================================
 *
 * Main screen:
 *
 *          ╭────────────────────╮
 *       ╭──╯                    ╰──╮
 *      ╰────────────────────────────╯
 *
 * The bottom edge curves upward toward the center.
 */

export const SCREEN_VIEWBOX = '0 0 100 48';

export const SCREEN_PATH =
  'M 0,22 Q 50,0 100,22 L 95,44 Q 50,28 5,44 Z';

/**
 * ================================================================
 * REFLECTION
 * ================================================================
 *
 * The reflection starts EXACTLY from the bottom contour of the
 * screen:
 *
 *      M 5,44 Q 50,28 95,44
 *
 * Then it expands outward as it travels downward:
 *
 *      top:    x = 5 → 95
 *      bottom: x = 0 → 100
 *
 * This creates the "narrow → wide" perspective.
 *
 * The top contour is deliberately identical to the screen's
 * bottom contour, eliminating the visible line/gap.
 */
export const REFLECTION_PATH =
  'M 5,44 Q 50,28 95,44 L 100,66 Q 50,58 0,66 Z';

/**
 * Reflection coordinate system.
 *
 * The reflection starts at Y=44, exactly where the screen's
 * bottom edge exists.
 */
const REFLECTION_VIEWBOX = '0 28 100 38';

/**
 * ================================================================
 * WEB MASKS
 * ================================================================
 */

const MASK_URI = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${SCREEN_VIEWBOX}" preserveAspectRatio="none"><path d="${SCREEN_PATH}" fill="#000"/></svg>`,
)}`;

const REFLECTION_MASK_URI = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${REFLECTION_VIEWBOX}" preserveAspectRatio="none"><path d="${REFLECTION_PATH}" fill="#000"/></svg>`,
)}`;

/**
 * ================================================================
 * SCREEN PANEL
 * ================================================================
 */

export function ScreenPanel({ source }: { source?: VideoSource }) {
  const uri = resolveUri(source);

  return (
    <View style={styles.screenContainer}>
      {/* ==========================================================
          MAIN SCREEN
      ========================================================== */}

      <View style={styles.screenPanel}>
        {uri ? (
          <View style={[StyleSheet.absoluteFill, maskStyle]}>
            {createElement('video', {
              src: uri,
              autoPlay: true,
              muted: true,
              loop: true,
              playsInline: true,
              style: {
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              },
            })}
          </View>
        ) : (
          <Svg
            width="100%"
            height="100%"
            viewBox={SCREEN_VIEWBOX}
            preserveAspectRatio="none"
          >
            <Defs>
              <SvgGradient
                id="screenFill"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <Stop
                  offset="0"
                  stopColor="#FFFFFF"
                  stopOpacity={0.35}
                />

                <Stop
                  offset="0.4"
                  stopColor="#FFFFFF"
                  stopOpacity={0.18}
                />

                <Stop
                  offset="1"
                  stopColor="#FFFFFF"
                  stopOpacity={0.05}
                />
              </SvgGradient>
            </Defs>

            <Path
              d={SCREEN_PATH}
              fill="url(#screenFill)"
            />
          </Svg>
        )}
      </View>

      {/* ==========================================================
          REFLECTION
      ========================================================== */}

      <View
        style={styles.reflectionWrap}
        pointerEvents="none"
      >
        <View style={styles.reflectionInner}>
          {uri ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                reflectionMaskStyle,
              ]}
            >
              {createElement('video', {
                src: uri,
                autoPlay: true,
                muted: true,
                loop: true,
                playsInline: true,
                style: {
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: 'scaleY(-1)',
                  filter: 'blur(2px)',
                },
              })}
            </View>
          ) : (
            <Svg
              width="100%"
              height="100%"
              viewBox={REFLECTION_VIEWBOX}
              preserveAspectRatio="none"
            >
              <Defs>
                <SvgGradient
                  id="reflectionFill"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <Stop
                    offset="0"
                    stopColor="#FFFFFF"
                    stopOpacity={0.24}
                  />

                  <Stop
                    offset="0.25"
                    stopColor="#FFFFFF"
                    stopOpacity={0.15}
                  />

                  <Stop
                    offset="0.55"
                    stopColor="#FFFFFF"
                    stopOpacity={0.07}
                  />

                  <Stop
                    offset="1"
                    stopColor="#FFFFFF"
                    stopOpacity={0}
                  />
                </SvgGradient>
              </Defs>

              <Path
                d={REFLECTION_PATH}
                fill="url(#reflectionFill)"
              />
            </Svg>
          )}
        </View>

        {/* ========================================================
            REFLECTION FADE
        ======================================================== */}

        <LinearGradient
          colors={[
            'rgba(5,5,7,0)',
            'rgba(5,5,7,0.08)',
            'rgba(5,5,7,0.28)',
            'rgba(5,5,7,0.62)',
            'rgba(5,5,7,0.98)',
          ]}
          locations={[
            0,
            0.16,
            0.38,
            0.68,
            1,
          ]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />

        {/* ========================================================
            CONTACT GLOW
        ======================================================== */}

        <LinearGradient
          colors={[
            'rgba(255,255,255,0.055)',
            'rgba(255,255,255,0.018)',
            'rgba(255,255,255,0)',
          ]}
          style={styles.reflectionHighlight}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </View>
    </View>
  );
}

/**
 * ================================================================
 * VIDEO URI RESOLUTION
 * ================================================================
 */

function resolveUri(source?: VideoSource): string | null {
  if (source == null) {
    return null;
  }

  if (typeof source === 'string') {
    return source;
  }

  if (typeof source === 'number') {
    const asset = getAssetByID(source);

    if (!asset) {
      return null;
    }

    const type = asset.type ? `.${asset.type}` : '';

    return `${asset.httpServerLocation}/${asset.name}${type}`;
  }

  return source.uri ?? null;
}

/**
 * ================================================================
 * WEB MASK STYLES
 * ================================================================
 */

const maskStyle = {
  WebkitMaskImage: `url("${MASK_URI}")`,
  maskImage: `url("${MASK_URI}")`,
  WebkitMaskSize: '100% 100%',
  maskSize: '100% 100%',
  WebkitMaskRepeat: 'no-repeat',
  maskRepeat: 'no-repeat',
} as unknown as ViewStyle;

const reflectionMaskStyle = {
  WebkitMaskImage: `url("${REFLECTION_MASK_URI}")`,
  maskImage: `url("${REFLECTION_MASK_URI}")`,
  WebkitMaskSize: '100% 100%',
  maskSize: '100% 100%',
  WebkitMaskRepeat: 'no-repeat',
  maskRepeat: 'no-repeat',
} as unknown as ViewStyle;

/**
 * ================================================================
 * STYLES
 * ================================================================
 */

const styles = StyleSheet.create({
  screenContainer: {
    width: '100%',
    alignItems: 'center',
    overflow: 'hidden',
  },

  /**
   * Main screen.
   */
  screenPanel: {
    width: '98%',
    height: 116,
    zIndex: 2,
  },

  /**
   * Reflection.
   *
   * It overlaps the screen enough for the two curved contours
   * to physically meet.
   */
  reflectionWrap: {
    width: '98%',
    height: 92,
    marginTop: -46,
    position: 'relative',
    alignSelf: 'center',
    overflow: 'hidden',
    zIndex: 1,
  },

  /**
   * Reflection itself.
   */
  reflectionInner: {
    width: '100%',
    height: '100%',
    opacity: 0.44,
  },

  /**
   * Soft contact highlight.
   */
  reflectionHighlight: {
    position: 'absolute',
    left: '5%',
    right: '5%',
    top: 0,
    height: 30,
    opacity: 0.5,
  },
});