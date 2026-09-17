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
import Svg, { Path } from 'react-native-svg';

import {
  type TicketGeometry,
  insetGeometry,
  tearLinePath,
  ticketFootPath,
  ticketHeadPath,
  ticketPath,
} from '@/components/ticket/ticket-path';
import { Glass } from '@/components/ui/glass';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/* -------------------------------------------------------------------------- */
/*                                   MASKING                                  */
/* -------------------------------------------------------------------------- */

/**
 * Web cannot use the native MaskedView implementation in the same way.
 * We generate the exact same SVG silhouette and use it as a CSS mask.
 *
 * `strokeWidth`, when given, masks to the *outline* of `d` rather than its
 * fill — the shape that admits, so nothing has to rely on another layer
 * painted on top to hide what a fill-mask would otherwise show everywhere
 * inside it too.
 */
function svgMaskUri(
  d: string,
  size: { width: number; height: number },
  transform?: string,
  strokeWidth?: number,
): string {
  const paint = strokeWidth
    ? `fill="none" stroke="#000" stroke-width="${strokeWidth}"`
    : `fill="#000"`;
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg"`,
    ` width="${size.width}"`,
    ` height="${size.height}"`,
    ` viewBox="0 0 ${size.width} ${size.height}">`,
    `<path d="${d}"`,
    transform ? ` transform="${transform}"` : '',
    ` ${paint}/>`,
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
  /** Masks to the outline of `d` instead of its fill — see `svgMaskUri`. */
  strokeWidth?: number;
  style?: ViewStyle | ViewStyle[];
  children: ReactNode;
};

function ShapeMask({ d, transform, size, strokeWidth, style, children }: ShapeMaskProps) {
  if (Platform.OS === 'web') {
    const uri = svgMaskUri(d, size, transform, strokeWidth);

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
          <Path
            d={d}
            transform={transform}
            fill={strokeWidth ? 'none' : '#000000'}
            stroke={strokeWidth ? '#000000' : undefined}
            strokeWidth={strokeWidth}
          />
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

/**
 * Width of the ring left visible around the face — this is both the acrylic
 * edge glass sits inside of, and, when `glowing`, the only part of the
 * rotating light the face doesn't cover.
 */
const RING = 3;

/**
 * Radius of each side notch.
 */
const NOTCH = 15;

/* -------------------------------------------------------------------------- */
/*                                    GLOW                                    */
/* -------------------------------------------------------------------------- */

const SPIN_DURATION = 2600;

/** Angular thickness of the spoke, as a fraction of the sweep's diameter. */
const SPOKE_WIDTH = 0.34;

/** Resting ring color, and what the beam sweeps over. */
const IDLE_COLOR = 'rgba(255,255,255,0.12)';

/** White core falling off to nothing either side, so the light has soft ends. */
const BEAM = [
  'rgba(255,255,255,0)',
  'rgba(255,255,255,0.28)',
  '#FFFFFF',
  'rgba(255,255,255,0.28)',
  'rgba(255,255,255,0)',
] as const;

/* -------------------------------------------------------------------------- */
/*                                    GLASS                                   */
/* -------------------------------------------------------------------------- */

/**
 * A dark, smoked tint rather than the frosted-white glass buttons elsewhere use.
 * Those sit over a photo and want to read as bright glass; this sits behind
 * white title/body text that has to stay legible over *whatever* backdrop the
 * page happens to have, so it tints toward black instead of brightening
 * toward gray.
 */
const TICKET_GLASS_TINT = 'rgba(6,7,10,0.55)';
const GLASS_TOP = 'rgba(255,255,255,0.05)';
const GLASS_BOTTOM = 'rgba(0,0,0,0.22)';

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
   * Keeps the light circling indefinitely — for an open-ended wait, like a
   * payment still clearing. Left `false`, `glowing` plays one lap and settles,
   * which reads as "here's your ticket" rather than an ongoing process.
   */
  spinForever?: boolean;

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
  spinForever = false,
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

  // A single lit point travelling the ticket's own outline — the visible sign
  // that this ticket is live. Runs only while `glowing`, so an idle ticket
  // screen never pays for an animation loop nobody is looking at.
  //
  // Animated.Value, not a Reanimated shared value — see the note in
  // `components/ui/pressable.tsx` about the React Compiler. `useState` rather
  // than `useRef` for the same reason: the compiler flags `.current` reads on
  // a ref during render.
  const [spin] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!glowing) return;

    // Not `Animated.loop` — it restarts each pass from wherever `spin`
    // already sits rather than resetting it, so the second lap has nowhere
    // left to travel and the light parks at the end of the first one. Setting
    // it back to 0 by hand before every lap is what actually keeps it moving.
    let cancelled = false;
    const lap = () => {
      spin.setValue(0);
      Animated.timing(spin, {
        toValue: 1,
        duration: SPIN_DURATION,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished && !cancelled && spinForever) lap();
      });
    };
    lap();

    return () => {
      cancelled = true;
      spin.stopAnimation();
    };
  }, [glowing, spinForever, spin]);

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

  const face = insetGeometry(geometry, RING);

  const faceTransform = `translate(${RING}, ${RING})`;

  // The line the ring mask strokes: centred exactly between the outer edge
  // and the face, so a `RING`-wide stroke on it spans precisely that gap.
  const ringLine = insetGeometry(geometry, RING / 2);

  const ringTransform = `translate(${RING / 2}, ${RING / 2})`;

  const svgSize = {
    width: box.width,
    height: box.height,
  };

  // The sweep has to cover the card's diagonal at every angle, or a corner
  // falls dark as the beam passes it.
  const beamSize = Math.hypot(box.width, box.height) * 1.2;

  const sizing = [styles.frame, fill && styles.filled];

  /* ---------------------------------------------------------------------- */
  /*                                  RENDER                                */
  /* ---------------------------------------------------------------------- */

  return (
    <View style={sizing}>
      <View style={sizing} onLayout={onBox}>
        {/* ---------------------------------------------------------------- */}
        {/* OUTER TICKET SILHOUETTE / EDGE LIGHT                             */}
        {/* ---------------------------------------------------------------- */}

        {/* The glow is not drawn along the path. It is an oversized gradient
            spoke spun behind the card and masked to the OUTLINE of the
            silhouette — a `RING`-wide stroke, not a fill — so the light
            physically exists only in that band. Nothing has to cover the
            interior to hide it, which matters on web: `Glass`'s backdrop-filter
            there genuinely blurs whatever a fill-mask would have left showing
            through the middle. One rotate transform on the native driver, no
            per-frame path maths, which matters because this animates for as
            long as the ticket stays on screen. */}
        {ready && glowing ? (
          <ShapeMask
            d={ticketPath(ringLine)}
            transform={ringTransform}
            strokeWidth={RING}
            size={svgSize}
            style={StyleSheet.absoluteFill}
          >
            <View style={[StyleSheet.absoluteFill, { backgroundColor: IDLE_COLOR }]} />
            <Animated.View
              style={[
                styles.sweep,
                {
                  width: beamSize,
                  height: beamSize,
                  marginLeft: -beamSize / 2,
                  marginTop: -beamSize / 2,
                  transform: [
                    {
                      rotate: spin.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg'],
                      }),
                    },
                  ],
                },
              ]}
            >
              <LinearGradient
                colors={BEAM}
                locations={[0, 0.34, 0.5, 0.66, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.spoke,
                  {
                    width: beamSize * SPOKE_WIDTH,
                    height: beamSize / 2,
                    marginLeft: (-beamSize * SPOKE_WIDTH) / 2,
                  },
                ]}
              />
            </Animated.View>
          </ShapeMask>
        ) : ready ? (
          <Svg {...svgSize} style={StyleSheet.absoluteFill} pointerEvents="none">
            <Path
              d={ticketPath(ringLine)}
              transform={ringTransform}
              fill="none"
              stroke={IDLE_COLOR}
              strokeWidth={RING}
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
              // A real dark fill under the glass, not a near-invisible one —
              // `Glass`'s blur only repaints what it can actually sample
              // (native reads `blurTarget`, not this fill), so without this
              // the face falls back to whatever gray the backdrop happens to
              // blur to instead of a consistently dark, legible surface.
              fill={glass ? 'rgba(8,8,11,0.6)' : faceColor}
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

        {/* Head only, not the whole face — the foot already has its own
            artwork and scrim (LOWER ARTWORK, above), and frosting it a
            second time here only re-blurs that photo and washes out the
            detail text sitting on top of it. */}
        {ready && glass ? (
          <ShapeMask
            d={ticketHeadPath(face)}
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
                tint={TICKET_GLASS_TINT}
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

  sweep: { position: 'absolute', left: '50%', top: '50%' },
  // Top half only: the spoke runs from the centre of the sweep to beyond the
  // card's edge, so rotating it walks one lit point around the outline.
  spoke: { position: 'absolute', left: '50%', top: 0 },

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
