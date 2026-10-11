import type { VideoSource } from 'expo-video';
import { memo, useMemo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, runOnUI, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
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
/** Each tap of + / − multiplies (or divides) the zoom by this. */
const ZOOM_STEP = 1.5;

/** Breathing room kept around the whole room at fit-to-screen — no seat ever touches (or is cut by) the edge. */
const MAP_PADDING = Spacing.lg;
const ZOOM_BUTTON = 34;
/** A strip under the seats reserved for the zoom buttons, so they never sit on top of a seat at fit-to-screen. */
const CONTROLS_SPACE = ZOOM_BUTTON + Spacing.sm * 2;

export type SeatMapProps = {
  categories: CinemaSeatCategory[];
  rows: CinemaSeatRow[];
  /** Lit up in white — what's being bought, sent, or (read-only) what you hold. */
  selectedKeys: string[];
  onToggle?: (seat: CinemaSeat) => void;
  /** A looping, muted clip for the auditorium's screen. */
  screenPreview?: VideoSource;
  /**
   * Picking which of YOUR seats to send: only these can be tapped, every
   * other chair in the room is shown taken. Omitted, it's the booking map —
   * any available seat can be picked.
   */
  selectableKeys?: string[];
  /** Showing seats already bought — the same room, nothing tappable. */
  readOnly?: boolean;
  /** The summary card's prompt while nothing is selected. */
  emptyHint?: string;
};

/**
 * The auditorium: the screen, what each seat color means, the seats
 * themselves (pinch or + / − to zoom, drag once zoomed), and a running
 * summary of what's selected. One component for all three places a seat
 * map appears — booking, choosing which seats to send a friend, and seeing
 * where you're sitting — so they all look exactly the same.
 */
function SeatMapImpl({
  categories,
  rows,
  selectedKeys,
  onToggle,
  screenPreview,
  selectableKeys,
  readOnly = false,
  emptyHint = 'Tap a seat below to select it',
}: SeatMapProps) {
  const selectable = selectableKeys ? new Set(selectableKeys) : undefined;
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
      <ZoomableGrid
        rows={rows}
        categoryByKey={categoryByKey}
        selected={selected}
        onToggle={onToggle}
        selectable={selectable}
        readOnly={readOnly}
      />
      {/* Below the whole chart, never layered over it — a floating per-row
          label here used to sit on top of the seats themselves. */}
      <SelectionSummary groups={pickedGroups} emptyHint={emptyHint} />
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
function SelectionSummary({ groups, emptyHint }: { groups: PickedGroup[]; emptyHint: string }) {
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
        {totalCount > 0 ? picksLine : emptyHint}
      </Text>
    </View>
  );
}

function ZoomableGrid({
  rows,
  categoryByKey,
  selected,
  onToggle,
  selectable,
  readOnly,
}: {
  rows: CinemaSeatRow[];
  categoryByKey: Map<string, CinemaSeatCategory>;
  selected: Set<string>;
  onToggle?: (seat: CinemaSeat) => void;
  selectable?: Set<string>;
  readOnly: boolean;
}) {
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [contentSize, setContentSize] = useState({ width: 0, height: 0 });
  // Mirrors `scale` on the JS side — drives the buttons' enabled state and
  // whether one-finger panning is on. Updated whenever a zoom settles.
  const [zoom, setZoom] = useState(MIN_ZOOM);

  const fitScale = useMemo(() => {
    if (!containerSize.width || !containerSize.height || !contentSize.width || !contentSize.height) {
      return 1;
    }
    // Fit the WHOLE room inside the padded area — no lower bound: a big hall
    // on a small phone shrinks as far as it has to rather than spilling out
    // of the viewport (it used to stop at 0.5× and cut the back rows off).
    // Pinch or + to look closer.
    const fit = Math.min(
      (containerSize.width - MAP_PADDING * 2) / contentSize.width,
      (containerSize.height - CONTROLS_SPACE - MAP_PADDING * 2) / contentSize.height,
    );
    return Math.min(Math.max(fit, 0.1), 1.6);
  }, [containerSize, contentSize]);

  // The area the room is centered in: the viewport minus the zoom strip.
  const containerW = containerSize.width;
  const containerH = Math.max(0, containerSize.height - CONTROLS_SPACE);

  // A curved row lifts its middle seats above the row's own box (see
  // `SeatRow`'s translateY) — padded in so the front row's lift is part of
  // the measured room, not drawn outside it.
  const curveLift = rows.reduce((max, row) => Math.max(max, row.curve * CURVE_SCALE), 0);
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
    // Zoomed in, drag far enough to bring every edge seat clear of the
    // viewport edge (by the same padding as at fit-to-screen).
    const maxX = Math.max(0, (scaledW - containerW) / 2 + MAP_PADDING);
    const maxY = Math.max(0, (scaledH - containerH) / 2 + MAP_PADDING);
    return { x: Math.min(Math.max(x, -maxX), maxX), y: Math.min(Math.max(y, -maxY), maxY) };
  };

  /** Animates to `next` zoom, keeping the view inside the grid's edges. */
  const settleZoom = (next: number) => {
    'worklet';
    const target = Math.min(Math.max(next, MIN_ZOOM), MAX_ZOOM);
    // Scale the current offset with the zoom, so the part of the room in
    // the middle of the view stays in the middle instead of drifting.
    const ratio = savedScale.value > 0 ? target / savedScale.value : 1;
    const clamped = clampPan(savedTranslateX.value * ratio, savedTranslateY.value * ratio, fitScale * target);
    scale.value = withTiming(target);
    translateX.value = withTiming(clamped.x);
    translateY.value = withTiming(clamped.y);
    savedScale.value = target;
    savedTranslateX.value = clamped.x;
    savedTranslateY.value = clamped.y;
    runOnJS(setZoom)(target);
  };

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.min(Math.max(savedScale.value * e.scale, MIN_ZOOM), MAX_ZOOM);
    })
    .onEnd(() => {
      const ended = scale.value;
      savedScale.value = ended;
      const clamped = clampPan(translateX.value, translateY.value, fitScale * ended);
      translateX.value = withTiming(clamped.x);
      translateY.value = withTiming(clamped.y);
      savedTranslateX.value = clamped.x;
      savedTranslateY.value = clamped.y;
      runOnJS(setZoom)(ended);
    });

  // One finger drags the room around once it's zoomed in — at fit-to-screen
  // there's nowhere to drag to, and leaving it off then keeps a parent
  // scroll view (and plain seat taps) working normally. A small activation
  // distance means a tap on a seat is still a tap, not a drag.
  const pan = Gesture.Pan()
    .enabled(zoom > MIN_ZOOM)
    .minDistance(6)
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

  const zoomBy = (factor: number) => runOnUI(settleZoom)(zoom * factor);
  const resetZoom = () => runOnUI(settleZoom)(MIN_ZOOM);

  const canZoomIn = zoom < MAX_ZOOM - 0.01;
  const canZoomOut = zoom > MIN_ZOOM + 0.01;

  return (
    <View
      style={styles.viewport}
      onLayout={(e: LayoutChangeEvent) =>
        setContainerSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })
      }>
      <GestureDetector gesture={composed}>
        <Animated.View
          style={[styles.grid, { paddingTop: curveLift }, animatedStyle]}
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
              selectable={selectable}
              readOnly={readOnly}
            />
          ))}
        </Animated.View>
      </GestureDetector>

      <View style={styles.zoomControls}>
        <GlassIconButton
          icon="add"
          accessibilityLabel="Zoom in"
          size={ZOOM_BUTTON}
          onPress={() => zoomBy(ZOOM_STEP)}
          disabled={!canZoomIn}
          style={!canZoomIn && styles.zoomDisabled}
        />
        <GlassIconButton
          icon="remove"
          accessibilityLabel="Zoom out"
          size={ZOOM_BUTTON}
          onPress={() => zoomBy(1 / ZOOM_STEP)}
          disabled={!canZoomOut}
          style={!canZoomOut && styles.zoomDisabled}
        />
        {canZoomOut ? (
          <GlassIconButton icon="contract-outline" accessibilityLabel="Reset zoom" size={ZOOM_BUTTON} onPress={resetZoom} />
        ) : null}
      </View>
    </View>
  );
}

function SeatRow({
  row,
  categoryByKey,
  selected,
  onToggle,
  selectable,
  readOnly,
}: {
  row: CinemaSeatRow;
  categoryByKey: Map<string, CinemaSeatCategory>;
  selected: Set<string>;
  onToggle?: (seat: CinemaSeat) => void;
  selectable?: Set<string>;
  readOnly: boolean;
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
            selectable={selectable ? selectable.has(seat.seatKey) : undefined}
            readOnly={readOnly}
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
  selectable,
  readOnly,
}: {
  seat: CinemaSeat;
  category: CinemaSeatCategory | undefined;
  isSelected: boolean;
  translateY: number;
  onToggle?: (seat: CinemaSeat) => void;
  /** Defined only when picking from your own seats: whether this is one of them. */
  selectable?: boolean;
  readOnly: boolean;
}) {
  if (!seat.exists) {
    return <View style={styles.cellSpacer} />;
  }

  const taken = seat.status === 'sold' || seat.status === 'held' || seat.status === 'blocked';

  if (readOnly) {
    // Drawn exactly as the booking map would draw it — just not tappable.
    return (
      <View
        accessibilityLabel={isSelected ? `Your seat ${seat.number}` : undefined}
        style={[styles.cell, { transform: [{ translateY }] }]}>
        <SeatGlyph isSelected={isSelected} disabled={taken && !isSelected} categoryColor={category?.color} />
      </View>
    );
  }

  // Sending seats: yours are the only "available" chairs in the room.
  const disabled = selectable === undefined ? taken : !selectable;

  return (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel={`Seat ${seat.number}${category ? `, ${category.label}` : ''}`}
      accessibilityState={{ selected: isSelected, disabled }}
      disabled={disabled}
      onPress={() => onToggle?.(seat)}
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
    // Centered, not top-aligned: the room is shrunk with a transform around
    // its own center, so a top-aligned room taller than the viewport slid
    // DOWN as it scaled and its back rows were cut off at the bottom.
    // Centered, the shrunk room lands squarely in the middle of the area.
    justifyContent: 'center',
    paddingBottom: CONTROLS_SPACE,
    backgroundColor: 'transparent',
  },
  grid: { gap: SEAT_GAP, alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: SEAT_GAP, position: 'relative' },

  // A row in the reserved strip under the room, not a column over it.
  zoomControls: {
    position: 'absolute',
    right: Spacing.sm,
    bottom: Spacing.sm,
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  zoomDisabled: { opacity: 0.4 },

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
