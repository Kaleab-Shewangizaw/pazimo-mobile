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
import { formatPrice } from '@/lib/pricing';
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
  const pickedGroups = useMemo(
    () => groupPicks(rows, categoryByKey, selected),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `categoryByKey`/`selected` are rebuilt fresh every render from `categories`/`selectedKeys`, so depending on the latter is equivalent and is what actually lets this skip recomputing when neither has changed.
    [rows, categories, selectedKeys],
  );

  return (
    <View style={styles.container}>
      <ScreenPanel source={screenPreview} />
      {/* Established up front, before anyone starts tapping — the seat dots
          alone don't explain themselves. */}
      <CategoryLegend categories={categories} />
      <ZoomableGrid rows={rows} categoryByKey={categoryByKey} selected={selected} onToggle={onToggle} />
      {/* Below the whole chart, never layered over it — a floating per-row
          label here used to sit on top of the seats themselves. */}
      <SelectionSummary groups={pickedGroups} />
    </View>
  );
}

/** One category's seats the buyer has picked, e.g. every VIP seat together. */
type PickedGroup = {
  category: CinemaSeatCategory;
  seats: { rowLabel: string; number: string }[];
};

function groupPicks(
  rows: CinemaSeatRow[],
  categoryByKey: Map<string, CinemaSeatCategory>,
  selected: Set<string>,
): PickedGroup[] {
  const byCategory = new Map<string, PickedGroup>();
  for (const row of rows) {
    for (const seat of row.seats) {
      // Same allowlist reasoning as `syncSeatAvailability` in the seats
      // screen: a gap can carry a stale seatKey that coincides with a real
      // seat's, so `seat.exists` is what actually gates membership here.
      if (!seat.exists || !selected.has(seat.seatKey)) continue;
      const category = categoryByKey.get(seat.categoryKey);
      if (!category) continue;
      const group = byCategory.get(category.key) ?? { category, seats: [] };
      group.seats.push({ rowLabel: row.label, number: seat.number });
      byCategory.set(category.key, group);
    }
  }
  return [...byCategory.values()];
}

/** What each seat colour means — shown once, not per selection. */
function CategoryLegend({ categories }: { categories: CinemaSeatCategory[] }) {
  const priced = categories.filter((c) => c.ticketTypeId && c.price != null);
  if (!priced.length) return null;

  return (
    <View style={styles.legend}>
      {priced.map((category) => (
        <View key={category.key} style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: category.color }]} />
          <Text variant="caption" style={styles.legendText}>
            {category.label} · {formatPrice(category.price!, 'ETB')}
          </Text>
        </View>
      ))}
    </View>
  );
}

/**
 * The running receipt of what's been picked so far.
 *
 * Always rendered, and capped to one line of picks — its height must never
 * change with the selection. It used to only mount once something was
 * picked, which shrank the grid's *own* available space at that exact
 * moment: `ZoomableGrid` re-fits to whatever height it's actually given, so
 * that shrink re-scaled it and clipped rows that no longer fit — the seats
 * a buyer had just picked would appear to vanish under where this card now
 * sat. A constant footprint from the very first layout keeps the grid's
 * size independent of anything picked here.
 */
function SelectionSummary({ groups }: { groups: PickedGroup[] }) {
  const totalCount = groups.reduce((sum, g) => sum + g.seats.length, 0);
  const totalPrice = groups.reduce(
    (sum, g) => sum + (g.category.price ?? 0) * g.seats.length,
    0,
  );
  const picksLine = groups
    .map((g) => `${g.category.label} ${g.seats.map((s) => `${s.rowLabel}${s.number}`).join(',')}`)
    .join('   ·   ');

  return (
    <View style={styles.summary}>
      <View style={styles.summaryHeader}>
        <Text variant="label" style={styles.summaryHeaderLabel}>
          YOUR SEATS
        </Text>
        <Text variant="small" style={styles.summaryHeaderCount}>
          {totalCount > 0
            ? `${totalCount} ${totalCount === 1 ? 'seat' : 'seats'} · ${formatPrice(totalPrice, 'ETB')}`
            : 'None yet'}
        </Text>
      </View>
      <Text variant="small" style={styles.summaryLine} numberOfLines={1}>
        {totalCount > 0 ? picksLine : 'Tap a seat below to select it'}
      </Text>
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
          {rows.map((row, rowIndex) => (
            <SeatRow
              // Not row.label: a row with no existing seats is a blank space
              // between blocks of seating and carries no label at all, so more
              // than one of those in the same map would collide on the label.
              key={rowIndex}
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

  return (
    <View style={[styles.row, { marginLeft: row.offset * OFFSET_SCALE }]}>
      {row.seats.map((seat, i) => {
        const t = center === 0 ? 0 : (i - center) / center;
        const translateY = -row.curve * CURVE_SCALE * (1 - t * t);
        return (
          <SeatCell
            // Not seat.seatKey: a gap keeps whatever number it had before a
            // neighboring seat was removed, so its seatKey can coincide with a
            // real seat's after renumbering. Position in the row is always unique.
            key={i}
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
  container: { flex: 1, gap: 0, overflow: 'hidden' },

  viewport: {
    flex: 1,
    // Load-bearing on web: the grid inside is shrunk purely with a CSS
    // `transform: scale()` (see `fitScale`/`animatedStyle`), which never
    // changes its actual layout box — the unscaled seat grid can be far
    // taller than the viewport. Without `overflow: hidden` here,
    // react-native-web's flexbox refuses to shrink this `flex: 1` box below
    // that content's natural size (a `min-height: auto` default), which
    // inflates every ancestor up to the screen and left a blank gap at the
    // bottom once the page grew taller than the viewport.
    overflow: 'hidden',
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 0,
    backgroundColor: 'transparent',
  },
  grid: { gap: SEAT_GAP, alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: SEAT_GAP, position: 'relative' },

  resetButton: { position: 'absolute', right: Spacing.sm, bottom: Spacing.sm },

  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 9, height: 9, borderRadius: 4.5 },
  legendText: { color: 'rgba(255,255,255,0.68)' },

  summary: {
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryHeaderLabel: { color: 'rgba(255,255,255,0.5)' },
  summaryHeaderCount: { color: '#FFFFFF', fontWeight: '700' },
  summaryLine: { color: 'rgba(255,255,255,0.75)', marginTop: 4 },

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
