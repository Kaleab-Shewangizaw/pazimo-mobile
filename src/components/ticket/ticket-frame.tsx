import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import {
  type ReactNode,
  type RefObject,
  memo,
  useEffect,
  useState,
} from 'react';
import {
  Animated,
  Easing,
  type LayoutChangeEvent,
  Platform,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import Svg, {
  Defs,
  Path,
  Stop,
  LinearGradient as SvgGradient,
} from 'react-native-svg';

import {
  type TicketGeometry,
  insetGeometry,
  tearLinePath,
  ticketFootPath,
  ticketPath,
} from '@/components/ticket/ticket-path';
import { Glass } from '@/components/ui/glass';
import { GLASS_SHADOW, GLASS_TINT } from '@/components/ui/glass-button';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/* -------------------------------------------------------------------------- */
/*                                   MASKING                                  */
/* -------------------------------------------------------------------------- */

/**
 * Web cannot use the native MaskedView implementation in the same way.
 * We generate the exact same SVG silhouette and use it as a CSS mask.
 */
function svgMaskUri(
  d: string,
  size: { width: number; height: number },
  transform?: string,
): string {
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg"`,
    ` width="${size.width}"`,
    ` height="${size.height}"`,
    ` viewBox="0 0 ${size.width} ${size.height}">`,
    `<path d="${d}"`,
    transform ? ` transform="${transform}"` : '',
    ` fill="#000"/>`,
    `</svg>`,
  ].join('');

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

type ShapeMaskProps = {
  d: string;
  transform?: string;
  size: {
    width: number;
    height: number;
  };
  style?: ViewStyle | ViewStyle[];
  children: ReactNode;
};

function ShapeMask({ d, transform, size, style, children }: ShapeMaskProps) {
  if (Platform.OS === 'web') {
    const uri = svgMaskUri(d, size, transform);

    return (
      <View
        pointerEvents="none"
        style={[
          style,
          {
            WebkitMaskImage: `url("${uri}")`,
            maskImage: `url("${uri}")`,
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat',
            WebkitMaskSize: '100% 100%',
            maskSize: '100% 100%',
          } as ViewStyle,
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <MaskedView
      style={style}
      pointerEvents="none"
      maskElement={
        <Svg
          width={size.width}
          height={size.height}
          style={StyleSheet.absoluteFill}
        >
          <Path d={d} transform={transform} fill="#000000" />
        </Svg>
      }
    >
      {children}
    </MaskedView>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  GEOMETRY                                  */
/* -------------------------------------------------------------------------- */

/** The face sits above this lower shell, creating a visible acrylic edge. */
const DEPTH = 4;

/** Small inset that leaves the ticket silhouette visible around the face. */
const GLASS_INSET = 5;

/**
 * Radius of each side notch.
 */
const NOTCH = 15;

const OUTER_EDGE_WIDTH = 1;

/* -------------------------------------------------------------------------- */
/*                                    GLASS                                   */
/* -------------------------------------------------------------------------- */

/** The event page's glass language: white translucency over the dark surface. */
const GLASS_TOP = 'rgba(255,255,255,0.07)';
const GLASS_BOTTOM = 'rgba(0,0,0,0.14)';

/**
 * Perforation.
 */
const TEAR_COLOR = 'rgba(255,255,255,0.16)';

/* -------------------------------------------------------------------------- */
/*                                    PROPS                                   */
/* -------------------------------------------------------------------------- */

export type TicketFrameProps = {
  /**
   * Upper ticket section.
   */
  stub: ReactNode;

  /**
   * Lower ticket section.
   */
  details?: ReactNode;

  /**
   * Optional artwork/background for the lower section.
   */
  detailsBackground?: ReactNode;

  /**
   * Runs the physical light around the ticket edge.
   */
  glowing?: boolean;

  /**
   * Makes the ticket fill its available vertical space.
   */
  fill?: boolean;

  /**
   * Enables liquid-glass material.
   */
  glass?: boolean;

  /**
   * Android/iOS blur source.
   */
  blurTarget?: RefObject<View | null>;

  /**
   * Non-glass fallback color.
   */
  faceColor?: string;
};

/* -------------------------------------------------------------------------- */
/*                                COMPONENT                                   */
/* -------------------------------------------------------------------------- */

function TicketFrameImpl({
  stub,
  details,
  detailsBackground,
  glowing = false,
  fill = false,
  glass = false,
  blurTarget,
  faceColor = 'rgba(12,15,22,0.94)',
}: TicketFrameProps) {
  const theme = useTheme();
  const [box, setBox] = useState({
    width: 0,
    height: 0,
  });

  const [stubHeight, setStubHeight] = useState(0);

  /* ---------------------------------------------------------------------- */
  /*                                  GLOW                                  */
  /* ---------------------------------------------------------------------- */

  // A slow breathing light along the inner edge of the glass — the visible
  // sign that this ticket is live. Runs only while `glowing`, so an idle
  // ticket screen never pays for an animation loop nobody is looking at.
  //
  // Animated.Value, not a Reanimated shared value — see the note in
  // `components/ui/pressable.tsx` about the React Compiler. `useState` rather
  // than `useRef` for the same reason: the compiler flags `.current` reads
  // on a ref during render, which `AnimatedPath`'s `opacity` prop below does.
  const [glow] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!glowing) return;

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [glowing, glow]);

  /* ---------------------------------------------------------------------- */
  /*                                LAYOUT                                  */
  /* ---------------------------------------------------------------------- */

  const onBox = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;

    const height = event.nativeEvent.layout.height;

    setBox({
      width,
      height,
    });
  };

  /* ---------------------------------------------------------------------- */
  /*                               GEOMETRY                                 */
  /* ---------------------------------------------------------------------- */

  const geometry: TicketGeometry = {
    width: box.width,
    height: box.height,
    radius: Radius.xl,
    tearY: stubHeight,
    notch: NOTCH,
  };

  const ready = box.width > 0 && box.height > 0;

  const face = insetGeometry(geometry, GLASS_INSET);

  const faceTransform = `translate(${GLASS_INSET}, ${GLASS_INSET})`;

  const svgSize = {
    width: box.width,
    height: box.height,
  };

  const sizing = [styles.frame, fill && styles.filled];

  /* ---------------------------------------------------------------------- */
  /*                                  RENDER                                */
  /* ---------------------------------------------------------------------- */

  return (
    <View style={[sizing, glass && GLASS_SHADOW]}>
      <View style={sizing} onLayout={onBox}>
        {/* ---------------------------------------------------------------- */}
        {/* OUTER TICKET SILHOUETTE                                          */}
        {/* ---------------------------------------------------------------- */}

        {ready ? (
          <Svg
            {...svgSize}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          >
            <Defs>
              <SvgGradient id="ticketBody" x1="0" y1="0" x2="0.9" y2="1">
                <Stop offset="0" stopColor="rgba(255,255,255,0.12)" />
                <Stop offset="0.44" stopColor="rgba(255,255,255,0.055)" />
                <Stop offset="1" stopColor="rgba(255,255,255,0.018)" />
              </SvgGradient>

            </Defs>

            {/* Lower shell: the offset edge is what makes the ticket feel raised. */}
            <Path
              d={ticketPath(geometry)}
              transform={`translate(0 ${DEPTH})`}
              fill="rgba(0,0,0,0.58)"
            />
            <Path d={ticketPath(geometry)} fill="url(#ticketBody)" />
            <Path
              d={ticketPath(geometry)}
              fill="none"
              stroke={theme.glassBorder}
              strokeWidth={OUTER_EDGE_WIDTH}
              strokeLinejoin="round"
            />
          </Svg>
        ) : null}

        {/* ---------------------------------------------------------------- */}
        {/* BASE TICKET FACE + ARTWORK                                       */}
        {/* ---------------------------------------------------------------- */}

        {ready ? (
          <Svg
            {...svgSize}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          >
            <Path
              d={ticketPath(face)}
              transform={faceTransform}
              fill={glass ? 'rgba(255,255,255,0.025)' : faceColor}
            />
          </Svg>
        ) : null}

        {/* ---------------------------------------------------------------- */}
        {/* LOWER ARTWORK                                                     */}
        {/* ---------------------------------------------------------------- */}

        {ready && detailsBackground ? (
          <ShapeMask
            d={ticketFootPath(face)}
            transform={faceTransform}
            size={svgSize}
            style={StyleSheet.absoluteFill}
          >
            {detailsBackground}
          </ShapeMask>
        ) : null}

        {/* ---------------------------------------------------------------- */}
        {/* LIQUID GLASS                                                      */}
        {/* ---------------------------------------------------------------- */}

        {ready && glass ? (
          <ShapeMask
            d={ticketPath(face)}
            transform={faceTransform}
            size={svgSize}
            style={StyleSheet.absoluteFill}
          >
            <View style={StyleSheet.absoluteFill}>
              {/* Backdrop blur */}
              <Glass
                variant="clear"
                intensity={18}
                radius={0}
                bordered={false}
                blurTarget={blurTarget}
                tint={GLASS_TINT}
                style={StyleSheet.absoluteFill}
              />

              {/* Quiet upper glass tint */}
              <LinearGradient
                colors={[
                  GLASS_TOP,
                  'rgba(255,255,255,0.015)',
                  'rgba(255,255,255,0)',
                ]}
                locations={[0, 0.35, 0.72]}
                start={{
                  x: 0.15,
                  y: 0,
                }}
                end={{
                  x: 0.82,
                  y: 1,
                }}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />

              {/* Bottom depth */}
              <LinearGradient
                colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.08)', GLASS_BOTTOM]}
                locations={[0, 0.55, 1]}
                start={{
                  x: 0,
                  y: 0,
                }}
                end={{
                  x: 0,
                  y: 1,
                }}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />

              <View
                pointerEvents="none"
                style={[styles.faceHighlight, { backgroundColor: theme.glassBorder }]}
              />
            </View>
          </ShapeMask>
        ) : null}

        {/* ---------------------------------------------------------------- */}
        {/* EDGE LIGHT                                                        */}
        {/* ---------------------------------------------------------------- */}

        {/* Three stacked strokes on the same silhouette fake a soft glow —
            react-native-svg has no cheap cross-platform blur filter, so width
            does the softening instead of a real gaussian blur. Drawn on top
            of the glass rather than behind it, so the light reads as coming
            off the ticket's own edge instead of muffled under frosted glass. */}
        {ready && glowing ? (
          <Svg {...svgSize} style={StyleSheet.absoluteFill} pointerEvents="none">
            <AnimatedPath
              d={ticketPath(face)}
              transform={faceTransform}
              fill="none"
              stroke="#FFFFFF"
              strokeWidth={8}
              strokeLinejoin="round"
              opacity={glow.interpolate({ inputRange: [0, 1], outputRange: [0.04, 0.14] })}
            />
            <AnimatedPath
              d={ticketPath(face)}
              transform={faceTransform}
              fill="none"
              stroke="#FFFFFF"
              strokeWidth={3.5}
              strokeLinejoin="round"
              opacity={glow.interpolate({ inputRange: [0, 1], outputRange: [0.10, 0.32] })}
            />
            <AnimatedPath
              d={ticketPath(face)}
              transform={faceTransform}
              fill="none"
              stroke="#FFFFFF"
              strokeWidth={1.25}
              strokeLinejoin="round"
              opacity={glow.interpolate({ inputRange: [0, 1], outputRange: [0.32, 0.85] })}
            />
          </Svg>
        ) : null}

        {/* ---------------------------------------------------------------- */}
        {/* TEAR / PERFORATION                                               */}
        {/* ---------------------------------------------------------------- */}

        {ready && details ? (
          <Svg
            {...svgSize}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          >
            <Path
              d={tearLinePath(geometry)}
              stroke={TEAR_COLOR}
              strokeWidth={1}
              strokeDasharray="4 5"
              strokeLinecap="round"
              fill="none"
            />
          </Svg>
        ) : null}

        {/* ---------------------------------------------------------------- */}
        {/* CONTENT                                                          */}
        {/* ---------------------------------------------------------------- */}

        <View
          style={fill ? styles.filled : undefined}
          onLayout={(event) => {
            setStubHeight(event.nativeEvent.layout.height);
          }}
        >
          {stub}
        </View>

        {details}
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   STYLES                                   */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  frame: {
    width: '100%',
  },

  filled: {
    flex: 1,
  },

  faceHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
});

/* -------------------------------------------------------------------------- */
/*                                   EXPORT                                   */
/* -------------------------------------------------------------------------- */

export const TicketFrame = memo(TicketFrameImpl);
