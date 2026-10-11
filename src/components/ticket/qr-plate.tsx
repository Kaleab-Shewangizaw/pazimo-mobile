import { memo, type ReactNode, useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';

import { Radius } from '@/constants/theme';

/**
 * The QR's white plate, framed like a viewfinder — four corner brackets
 * standing off the plate rather than a plain square. Not decoration: this is
 * the one thing on the ticket a stranger's scanner has to find fast in low
 * light, and a bracketed target reads as "aim here" the way an inset square
 * doesn't.
 *
 * The plate stays light — `expo-camera`'s scanners (AVFoundation / ML Kit) on
 * the organizer app don't reliably read an inverted code — but it's an
 * off-white with a soft edge rather than a hard white slab, so it sits in the
 * dark card instead of punching a hole in it.
 */

/** Fill behind every code. Exported so a QR's logo plate can match it. */
export const PLATE_COLOR = '#ECECEF';

const BRACKET = 18;
const BRACKET_OFFSET = -8;
const BRACKET_WIDTH = 2;
const BRACKET_COLOR = 'rgba(255,255,255,0.45)';

export type QrPlateProps = {
  size: number;
  /** Defaults to `size` — pass a different value to draw a rectangular plate (e.g. for a barcode) instead of a square one. */
  height?: number;
  children: ReactNode;
};

function QrPlateImpl({ size, height, children }: QrPlateProps) {
  const plateHeight = height ?? size;
  return (
    <View style={{ width: size, height: plateHeight }}>
      <View style={[styles.plate, { width: size, height: plateHeight }]}>{children}</View>
      <View style={[styles.bracket, styles.topLeft]} />
      <View style={[styles.bracket, styles.topRight]} />
      <View style={[styles.bracket, styles.bottomLeft]} />
      <View style={[styles.bracket, styles.bottomRight]} />
    </View>
  );
}

const styles = StyleSheet.create({
  slot: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  plate: {
    borderRadius: Radius.xl,
    backgroundColor: PLATE_COLOR,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bracket: {
    position: 'absolute',
    width: BRACKET,
    height: BRACKET,
    borderColor: BRACKET_COLOR,
  },
  topLeft: {
    top: BRACKET_OFFSET,
    left: BRACKET_OFFSET,
    borderTopWidth: BRACKET_WIDTH,
    borderLeftWidth: BRACKET_WIDTH,
    borderTopLeftRadius: 5,
  },
  topRight: {
    top: BRACKET_OFFSET,
    right: BRACKET_OFFSET,
    borderTopWidth: BRACKET_WIDTH,
    borderRightWidth: BRACKET_WIDTH,
    borderTopRightRadius: 5,
  },
  bottomLeft: {
    bottom: BRACKET_OFFSET,
    left: BRACKET_OFFSET,
    borderBottomWidth: BRACKET_WIDTH,
    borderLeftWidth: BRACKET_WIDTH,
    borderBottomLeftRadius: 5,
  },
  bottomRight: {
    bottom: BRACKET_OFFSET,
    right: BRACKET_OFFSET,
    borderBottomWidth: BRACKET_WIDTH,
    borderRightWidth: BRACKET_WIDTH,
    borderBottomRightRadius: 5,
  },
});

export const QrPlate = memo(QrPlateImpl);

/** Room around the plate for the brackets, which stand off it by `BRACKET_OFFSET`. */
const SLOT_GUTTER = -BRACKET_OFFSET + 4;

export type QrSlotProps = {
  /** Largest the plate may get, however much room there is. */
  max: number;
  /** Smallest the slot shrinks to before the ticket has to scroll instead. */
  min?: number;
  children: (size: number) => ReactNode;
};

/**
 * Takes whatever height the ticket has left (`flex: 1`) and hands the largest
 * square plate that fits it to `children` — so the whole ticket fits on one
 * screen, with the code as big as that screen allows, instead of a fixed-size
 * plate pushing the details off the bottom.
 */
export function QrSlot({ max, min = 150, children }: QrSlotProps) {
  const [size, setSize] = useState(0);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    const next = Math.floor(Math.min(width - SLOT_GUTTER * 2, height - SLOT_GUTTER * 2, max));
    setSize((current) => (current === next ? current : next));
  };

  return (
    <View style={[styles.slot, { minHeight: min }]} onLayout={onLayout}>
      {size > 0 ? children(size) : null}
    </View>
  );
}
