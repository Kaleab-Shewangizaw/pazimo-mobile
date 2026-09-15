import { memo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Radius } from '@/constants/theme';

/**
 * The QR's white plate, framed like a viewfinder — four corner brackets
 * standing off the plate rather than a plain square. Not decoration: this is
 * the one thing on the ticket a stranger's scanner has to find fast in low
 * light, and a bracketed target reads as "aim here" the way an inset square
 * doesn't.
 */

const BRACKET = 18;
const BRACKET_OFFSET = -8;
const BRACKET_WIDTH = 2;
const BRACKET_COLOR = 'rgba(255,255,255,0.45)';

export type QrPlateProps = {
  size: number;
  children: ReactNode;
};

function QrPlateImpl({ size, children }: QrPlateProps) {
  return (
    <View style={{ width: size, height: size }}>
      <View style={[styles.plate, { width: size, height: size }]}>{children}</View>
      <View style={[styles.bracket, styles.topLeft]} />
      <View style={[styles.bracket, styles.topRight]} />
      <View style={[styles.bracket, styles.bottomLeft]} />
      <View style={[styles.bracket, styles.bottomRight]} />
    </View>
  );
}

const styles = StyleSheet.create({
  plate: {
    borderRadius: Radius.lg,
    backgroundColor: '#FFFFFF',
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
