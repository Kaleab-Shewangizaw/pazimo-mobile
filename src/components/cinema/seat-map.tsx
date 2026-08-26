import type { VideoSource } from 'expo-video';
import { memo, useMemo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnUI, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Rect } from 'react-native-svg';

import { ScreenPanel } from '@/components/cinema/screen-panel';
import { GlassIconButton } from '@/components/ui/glass-button';
import { Touchable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import type { CinemaSeat, CinemaSeatCategory, CinemaSeatRow } from '@/types/api';

/** Pure white accent for selected seats — matching the reference design and Continue button. */
export const SEAT_ACCENT = '#FFFFFF';

const SEAT_SIZE = 32;
const SEAT_GAP = 5;
const OFFSET_SCALE = 0.6;
const CURVE_SCALE = 0.45;

/** Relative to fit-to-screen — 1 is "zoomed all the way back out". */
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

export type SeatMapProps = {
  categories: CinemaSeatCategory[];
  rows: CinemaSeatRow[];
  selectedKeys: string[];
  onToggle: (seat: CinemaSeat) => void;
  /** A looping, muted clip for the auditorium's screen. */
  screenPreview?: VideoSource;
};

function SeatMapImpl({ categories, rows, selectedKeys, onToggle, screenPreview }: SeatMapProps) {
  const categoryByKey = new Map(categories.map((c) => [c.key, c]));
  const selected = new Set(selectedKeys);

  return (
    <View style={styles.container}>
      <ScreenPanel source={screenPreview} />
      <ZoomableGrid rows={rows} categoryByKey={categoryByKey} selected={selected} onToggle={onToggle} />
    </View>
  );
}

function ZoomableGrid({
  rows,
  categoryByKey,
  selected,
  onToggle,
}: {
  rows: CinemaSeatRow[];
  categoryByKey: Map<string, CinemaSeatCategory>;
  selected: Set<string>;
  onToggle: (seat: CinemaSeat) => void;
}) {
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [contentSize, setContentSize] = useState({ width: 0, height: 0 });

  const fitScale = useMemo(() => {
    if (!containerSize.width || !containerSize.height || !contentSize.width || !contentSize.height) {
      return 1;
    }
    const fit = Math.min(containerSize.width / contentSize.width, containerSize.height / contentSize.height);
    return Math.min(Math.max(fit, 0.5), 1.6);
  }, [containerSize, contentSize]);

  const containerW = containerSize.width;
  const containerH = containerSize.height;
  const contentW = contentSize.width;
  const contentH = contentSize.height;

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const clampPan = (x: number, y: number, totalScale: number) => {
    'worklet';
    const scaledW = contentW * totalScale;
    const scaledH = contentH * totalScale;
    const maxX = Math.max(0, (scaledW - containerW) / 2);
    const maxY = Math.max(0, (scaledH - containerH) / 2);
    return { x: Math.min(Math.max(x, -maxX), maxX), y: Math.min(Math.max(y, -maxY), maxY) };
  };

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.min(Math.max(savedScale.value * e.scale, MIN_ZOOM), MAX_ZOOM);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      const clamped = clampPan(translateX.value, translateY.value, fitScale * scale.value);
      translateX.value = withTiming(clamped.x);
      translateY.value = withTiming(clamped.y);
      savedTranslateX.value = clamped.x;
      savedTranslateY.value = clamped.y;
    });

  const pan = Gesture.Pan()
    .minPointers(2)
    .onUpdate((e) => {
      const clamped = clampPan(
        savedTranslateX.value + e.translationX,
        savedTranslateY.value + e.translationY,
        fitScale * scale.value,
      );
      translateX.value = clamped.x;
      translateY.value = clamped.y;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const composed = Gesture.Simultaneous(pinch, pan);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: fitScale * scale.value },
    ],
  }));

  const resetZoom = () => {
    runOnUI(() => {
      'worklet';
      scale.value = withTiming(1);
      translateX.value = withTiming(0);
      translateY.value = withTiming(0);
      savedScale.value = 1;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    })();
  };

  return (
    <View
      style={styles.viewport}
      onLayout={(e: LayoutChangeEvent) =>
        setContainerSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })
      }>
      <GestureDetector gesture={composed}>
        <Animated.View
          style={[styles.grid, animatedStyle]}
          onLayout={(e: LayoutChangeEvent) =>
            setContentSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })
          }>
          {rows.map((row) => (
            <SeatRow
              key={row.label}
              row={row}
              categoryByKey={categoryByKey}
              selected={selected}
              onToggle={onToggle}
            />
          ))}
        </Animated.View>
      </GestureDetector>

      <GlassIconButton
        icon="contract-outline"
        accessibilityLabel="Reset zoom"
        size={34}
        onPress={resetZoom}
        style={styles.resetButton}
      />
    </View>
  );
}

function SeatRow({
  row,
  categoryByKey,
  selected,
  onToggle,
}: {
  row: CinemaSeatRow;
  categoryByKey: Map<string, CinemaSeatCategory>;
  selected: Set<string>;
  onToggle: (seat: CinemaSeat) => void;
}) {
  const count = row.seats.length;
  const center = (count - 1) / 2;
  const pickedSeats = row.seats.filter((s) => selected.has(s.seatKey));
  const pickedHere = pickedSeats.length;

  const firstPickedCategory = pickedSeats.length > 0 ? categoryByKey.get(pickedSeats[0].categoryKey) : null;
  const categoryLabel = firstPickedCategory?.label;
  const categoryColor = firstPickedCategory?.color;

  return (
    <View style={[styles.row, { marginLeft: row.offset * OFFSET_SCALE }]}>
      {pickedHere > 0 ? (
        <View style={styles.rowTooltip}>
          {categoryColor ? (
            <View style={[styles.rowTooltipDot, { backgroundColor: categoryColor }]} />
          ) : null}
          <Text variant="caption" style={styles.rowTooltipText}>
            Row {row.label} · {pickedHere} {pickedHere === 1 ? 'Seat' : 'Seats'}
            {categoryLabel ? ` (${categoryLabel})` : ''}
          </Text>
        </View>
      ) : null}
      {row.seats.map((seat, i) => {
        const t = center === 0 ? 0 : (i - center) / center;
        const translateY = -row.curve * CURVE_SCALE * (1 - t * t);
        return (
          <SeatCell
            key={seat.seatKey || `${row.label}-gap-${i}`}
            seat={seat}
            category={categoryByKey.get(seat.categoryKey)}
            isSelected={selected.has(seat.seatKey)}
            translateY={translateY}
            onToggle={onToggle}
          />
        );
      })}
    </View>
  );
}

function SeatCell({
  seat,
  category,
  isSelected,
  translateY,
  onToggle,
}: {
  seat: CinemaSeat;
  category: CinemaSeatCategory | undefined;
  isSelected: boolean;
  translateY: number;
  onToggle: (seat: CinemaSeat) => void;
}) {
  if (!seat.exists) {
    return <View style={styles.cellSpacer} />;
  }

  const disabled = seat.status === 'sold' || seat.status === 'held' || seat.status === 'blocked';

  return (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel={`Seat ${seat.number}${category ? `, ${category.label}` : ''}`}
      accessibilityState={{ selected: isSelected, disabled }}
      disabled={disabled}
      onPress={() => onToggle(seat)}
      pressedScale={disabled ? 1 : 0.88}
      style={[styles.cell, { transform: [{ translateY }] }]}>
      <SeatGlyph isSelected={isSelected} disabled={disabled} categoryColor={category?.color} />
    </Touchable>
  );
}

/** Custom Cinema Armchair vector glyph matching the reference mockup seat design exactly. */
function SeatGlyph({
  isSelected,
  disabled,
  categoryColor,
}: {
  isSelected: boolean;
  disabled: boolean;
  categoryColor?: string;
}) {
  // Color palette tuned for high legibility and soft indicator accents
  const fillColor = isSelected
    ? '#FFFFFF'
    : disabled
      ? 'rgba(255, 255, 255, 0.08)'
      : '#4A4A52'; // Noticeable light gray

  const strokeColor = isSelected
    ? '#FFFFFF'
    : disabled
      ? 'rgba(255, 255, 255, 0.12)'
      : '#6E6E78'; // Soft stroke definition

  const notchFill = isSelected ? '#121215' : disabled ? '#08080A' : '#141418';

  return (
    <View style={styles.glyphContainer}>
      <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
        {/* Backrest top bar */}
        <Rect x="4.5" y="2" width="15" height="4.5" rx="2" fill={fillColor} stroke={strokeColor} strokeWidth="1" />
        {/* Left Armrest */}
        <Rect x="2" y="5.5" width="4" height="14.5" rx="2" fill={fillColor} stroke={strokeColor} strokeWidth="1" />
        {/* Right Armrest */}
        <Rect x="18" y="5.5" width="4" height="14.5" rx="2" fill={fillColor} stroke={strokeColor} strokeWidth="1" />
        {/* Seat Cushion */}
        <Rect x="4.5" y="9.5" width="15" height="10.5" rx="2.5" fill={fillColor} stroke={strokeColor} strokeWidth="1" />
        {/* Cushion Notch Cutout */}
        <Rect x="6.5" y="7" width="11" height="5" rx="1.5" fill={notchFill} />
      </Svg>
      {!disabled && !isSelected && categoryColor ? (
        <View style={[styles.seatDot, { backgroundColor: categoryColor }]} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: 0 },

  viewport: {
    flex: 1,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 0,
    backgroundColor: 'transparent',
  },
  grid: { gap: SEAT_GAP, alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: SEAT_GAP, position: 'relative' },
  rowTooltip: {
    position: 'absolute',
    top: -30,
    zIndex: 20,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(28,28,34,0.95)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  rowTooltipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  rowTooltipText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },

  resetButton: { position: 'absolute', right: Spacing.sm, bottom: Spacing.sm },

  cell: {
    width: SEAT_SIZE,
    height: SEAT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellSpacer: { width: SEAT_SIZE, height: SEAT_SIZE },
  glyphContainer: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  seatDot: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    opacity: 0.85,
  },
});

export const SeatMap = memo(SeatMapImpl);
