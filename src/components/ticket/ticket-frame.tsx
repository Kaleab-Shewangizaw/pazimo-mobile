import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { type ReactNode, type RefObject, memo, useEffect, useState } from 'react';
import { Animated, Easing, type LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import {
  type TicketGeometry,
  insetGeometry,
  tearLinePath,
  ticketFootPath,
  ticketPath,
} from '@/components/ticket/ticket-path';
import { Glass } from '@/components/ui/glass';
import { GLASS_TINT } from '@/components/ui/glass-button';
import { Radius } from '@/constants/theme';

/**
 * The card everything a ticket *is* gets drawn on: a real ticket silhouette,
 * torn between the stub that carries the QR and the details below it.
 *
 * The same frame serves the wait and the ticket, which is the point — the light
 * that runs its edge while a payment clears is running the outline of the thing
 * being bought, and the flip at the end turns one object over rather than
 * swapping two.
 *
 * The glow is not drawn along the path. It is an oversized gradient bar spun
 * behind the card and masked to the silhouette, with the card's own face laid
 * back on top so only a hairline escapes at the border. That keeps the whole
 * effect on one native-driver transform — no per-frame path maths — which
 * matters because this animates while a network poll is running.
 */

const SPIN_DURATION = 2600;

/** Thickness of the lit edge. */
const RING = 2.5;

/** Radius of the bite out of each side at the tear. */
const NOTCH = 15;

/** Angular thickness of the spoke, as a fraction of the sweep's diameter. */
const SPOKE_WIDTH = 0.34;

/** White core falling off to nothing either side, so the light has soft ends. */
const BEAM = [
  'rgba(255,255,255,0)',
  'rgba(255,255,255,0.28)',
  '#FFFFFF',
  'rgba(255,255,255,0.28)',
  'rgba(255,255,255,0)',
] as const;

export type TicketFrameProps = {
  /** The upper half — title and QR. Its height places the tear. */
  stub: ReactNode;
  /** The lower half, below the perforation. */
  details?: ReactNode;
  /**
   * Artwork for the lower half, masked to the torn edge so it fills the foot
   * without paving over the notches.
   */
  detailsBackground?: ReactNode;
  /** Runs the light around the edge. */
  glowing?: boolean;
  /** Stretches the card to its parent, and the stub to whatever is left over. */
  fill?: boolean;
  /**
   * Frost the face instead of filling it. Real backdrop blur, so on Android it
   * needs a `blurTarget` to have anything to sample.
   */
  glass?: boolean;
  blurTarget?: RefObject<View | null>;
  faceColor?: string;
  /** Resting border, and what the beam travels over. */
  idleColor?: string;
};

function TicketFrameImpl({
  stub,
  details,
  detailsBackground,
  glowing = false,
  fill = false,
  glass = false,
  blurTarget,
  faceColor = 'rgba(16,16,20,0.94)',
  idleColor = 'rgba(255,255,255,0.12)',
}: TicketFrameProps) {
  const [box, setBox] = useState({ width: 0, height: 0 });
  const [stubHeight, setStubHeight] = useState(0);
  const [spin] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!glowing) return;
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: SPIN_DURATION,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [glowing, spin]);

  const onBox = (e: LayoutChangeEvent) =>
    setBox({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height });

  const geometry: TicketGeometry = {
    width: box.width,
    height: box.height,
    radius: Radius.xl,
    tearY: stubHeight,
    notch: NOTCH,
  };
  const face = insetGeometry(geometry, RING);
  const shift = `translate(${RING}, ${RING})`;

  // Nothing can be drawn until the content has told us how big it is; the frame
  // is transparent for that one frame rather than flashing a wrong shape.
  const ready = box.width > 0 && box.height > 0;
  // The bar has to cover the card's diagonal at every angle, or a corner falls
  // dark as it sweeps past.
  const beamSize = Math.hypot(box.width, box.height) * 1.2;

  // Sizes are passed explicitly rather than left to `absoluteFill`: without a
  // viewBox the path's numbers are already in points, and an SVG that has to
  // infer its own box from layout is the one that renders empty on Android.
  const svgSize = { width: box.width, height: box.height };

  return (
    <View style={[styles.frame, fill && styles.filled]} onLayout={onBox}>
      {ready && glowing ? (
        <MaskedView
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
          maskElement={
            <Svg {...svgSize} style={StyleSheet.absoluteFill}>
              <Path d={ticketPath(geometry)} fill="#000000" />
            </Svg>
          }>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: idleColor }]} />
          {/* A spoke, not a bar. A gradient spanning the whole card crosses it
              and lights the rim in two places at once, which reads as two lamps
              rather than one light going round. Anchoring the bright band at the
              centre and letting it reach out in a single direction means it
              leaves the shape at exactly one point — and because the spoke is
              radial, that point tracks the outline whatever shape it is, tall
              card and notches included. */}
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
            ]}>
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
        </MaskedView>
      ) : ready ? (
        <Svg {...svgSize} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Path d={ticketPath(geometry)} fill={idleColor} />
        </Svg>
      ) : null}

      {ready && glass ? (
        <MaskedView
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
          maskElement={
            <Svg {...svgSize} style={StyleSheet.absoluteFill}>
              <Path d={ticketPath(face)} transform={shift} fill="#000000" />
            </Svg>
          }>
          {/* The same material as the floating buttons — `clear` at 28 with
              GLASS_TINT washed *into* the effect. The tint is what keeps it
              reading as glass rather than as a dark panel: blur alone only
              softens what is behind it. */}
          <Glass
            variant="clear"
            intensity={28}
            radius={0}
            bordered={false}
            blurTarget={blurTarget}
            tint={GLASS_TINT}
            style={StyleSheet.absoluteFill}
          />
        </MaskedView>
      ) : ready ? (
        <Svg {...svgSize} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Path d={ticketPath(face)} transform={shift} fill={faceColor} />
        </Svg>
      ) : null}

      {ready && detailsBackground ? (
        <MaskedView
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
          maskElement={
            <Svg {...svgSize} style={StyleSheet.absoluteFill}>
              <Path d={ticketFootPath(face)} transform={shift} fill="#000000" />
            </Svg>
          }>
          {detailsBackground}
        </MaskedView>
      ) : null}

      {ready && details ? (
        <Svg {...svgSize} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Path
            d={tearLinePath(geometry)}
            stroke="rgba(255,255,255,0.28)"
            strokeWidth={1.5}
            strokeDasharray="5 6"
            fill="none"
          />
        </Svg>
      ) : null}

      <View
        style={fill ? styles.filled : undefined}
        onLayout={(e) => setStubHeight(e.nativeEvent.layout.height)}>
        {stub}
      </View>
      {details}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { width: '100%' },
  filled: { flex: 1 },
  sweep: { position: 'absolute', left: '50%', top: '50%' },
  // Top half only: the spoke runs from the centre of the sweep to beyond the
  // card's edge, so rotating it walks one lit point around the outline.
  spoke: { position: 'absolute', left: '50%', top: 0 },
});

export const TicketFrame = memo(TicketFrameImpl);
