import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import {
  useVideoPlayer,
  VideoView,
  type VideoSource,
} from 'expo-video';
import { StyleSheet, View } from 'react-native';
import Svg, {
  Defs,
  Path,
  Stop,
  LinearGradient as SvgGradient,
} from 'react-native-svg';

/**
 * ================================================================
 * CINEMA SCREEN GEOMETRY
 * ================================================================
 */

export const SCREEN_VIEWBOX = '0 0 100 48';

/**
 * Main curved cinema screen.
 *
 * Bottom edge:
 *
 *     M 5,44 Q 50,28 95,44
 */
export const SCREEN_PATH =
  'M 0,22 Q 50,0 100,22 L 95,44 Q 50,28 5,44 Z';

/**
 * ================================================================
 * CONNECTED REFLECTION
 * ================================================================
 *
 * The reflection starts with the EXACT SAME CURVE as the bottom
 * of the screen:
 *
 *     M 5,44 Q 50,28 95,44
 *
 * Then expands outward:
 *
 *     5 → 95   at the top
 *     0 → 100  at the bottom
 *
 * So it is:
 *
 *              SCREEN
 *                 │
 *              narrow
 *                 ↓
 *               wider
 *                 ↓
 *                wide
 */
export const REFLECTION_PATH =
  'M 5,44 Q 50,28 95,44 L 100,66 Q 50,58 0,66 Z';

/**
 * IMPORTANT:
 *
 * The reflection viewport starts at Y=44.
 *
 * Therefore its first visible pixel is exactly the screen's
 * bottom contour.
 */
const REFLECTION_VIEWBOX = '0 44 100 22';

/**
 * ================================================================
 * SCREEN PANEL
 * ================================================================
 */

export function ScreenPanel({ source }: { source?: VideoSource }) {
  const player = useVideoPlayer(source ?? null, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  return (
    <View style={styles.screenContainer}>
      {/* ==========================================================
          MAIN CURVED SCREEN
      ========================================================== */}

      <View style={styles.screenPanel}>
        {source ? (
          <MaskedView
            style={StyleSheet.absoluteFill}
            maskElement={
              <Svg
                width="100%"
                height="100%"
                viewBox={SCREEN_VIEWBOX}
                preserveAspectRatio="none"
              >
                <Path
                  d={SCREEN_PATH}
                  fill="#000000"
                />
              </Svg>
            }
          >
            <VideoView
              player={player}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              nativeControls={false}
              pointerEvents="none"
            />
          </MaskedView>
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
                  stopOpacity={0.30}
                />

                <Stop
                  offset="0.4"
                  stopColor="#FFFFFF"
                  stopOpacity={0.17}
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
          CONNECTED REFLECTION

          No separate background.
          No separate highlight.
          No visual gap.
      ========================================================== */}

      <View
        style={styles.reflectionWrap}
        pointerEvents="none"
      >
        <View style={styles.reflectionInner}>
          {source ? (
            <MaskedView
              style={StyleSheet.absoluteFill}
              maskElement={
                <Svg
                  width="100%"
                  height="100%"
                  viewBox={REFLECTION_VIEWBOX}
                  preserveAspectRatio="none"
                >
                  <Path
                    d={REFLECTION_PATH}
                    fill="#000000"
                  />
                </Svg>
              }
            >
              <VideoView
                player={player}
                style={[
                  StyleSheet.absoluteFill,
                  styles.reflectedVideo,
                ]}
                contentFit="cover"
                nativeControls={false}
                pointerEvents="none"
              />
            </MaskedView>
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
                    stopOpacity={0.22}
                  />

                  <Stop
                    offset="0.25"
                    stopColor="#FFFFFF"
                    stopOpacity={0.13}
                  />

                  <Stop
                    offset="0.55"
                    stopColor="#FFFFFF"
                    stopOpacity={0.06}
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
          pointerEvents="none"
          colors={[
            'rgba(5,5,7,0)',
            'rgba(5,5,7,0.08)',
            'rgba(5,5,7,0.30)',
            'rgba(5,5,7,0.68)',
            'rgba(5,5,7,1)',
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
      </View>
    </View>
  );
}

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
   * The screen path ends at Y=44 inside a 48-unit viewBox.
   *
   * 44 / 48 * 116 ≈ 106px.
   *
   * So the reflection begins about 10px before the screen
   * container ends.
   *
   * This connects the actual visible shapes instead of the
   * rectangular containers.
   */
  reflectionWrap: {
    width: '98%',
    height: 80,
    marginTop: -46,
    position: 'relative',
    alignSelf: 'center',
    overflow: 'hidden',
    zIndex: 1,
  },

  /**
   * ONLY the reflection.
   *
   * There is no separate floor/background layer.
   */
  reflectionInner: {
    width: '100%',
    height: '100%',
    opacity: 0.44,
  },

  /**
   * Mirror the actual video vertically.
   */
  reflectedVideo: {
    transform: [
      {
        scaleY: -1,
      },
    ],
  },
});