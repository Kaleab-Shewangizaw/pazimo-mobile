import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { memo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Touchable } from '@/components/ui/pressable';
import { Radius, Spacing } from '@/constants/theme';
import { formatPrice } from '@/lib/pricing';
import type { CinemaSeat, CinemaSeatCategory, CinemaSeatRow } from '@/types/api';

/**
 * The auditorium, drawn to scale of nothing but its own logic.
 *
 * `row.curve`/`row.offset` are arbitrary renderer-scaled units set by whoever
 * built the hall's map — 0 is a straight, centred row. Curve bows a row toward
 * the screen at its middle seat (a parabola peaking at the row's centre);
 * offset nudges the whole row sideways, letting a short row centre itself
 * against longer ones around it. Both are purely presentational: they change
 * where a seat is DRAWN, never which seat it is.
 */

const SEAT_SIZE = 30;
const SEAT_GAP = 7;
const ROW_LABEL_WIDTH = 22;
const OFFSET_SCALE = 0.6;
const CURVE_SCALE = 0.35;

export type SeatMapProps = {
  categories: CinemaSeatCategory[];
  rows: CinemaSeatRow[];
  selectedKeys: string[];
  onToggle: (seat: CinemaSeat) => void;
};

function SeatMapImpl({ categories, rows, selectedKeys, onToggle }: SeatMapProps) {
  const categoryByKey = new Map(categories.map((c) => [c.key, c]));
  const selected = new Set(selectedKeys);

  return (
    <View style={styles.container}>
      <ScreenIndicator />

      <View style={styles.legend}>
        {categories.map((category) => (
          <View key={category.key} style={styles.legendItem}>
            <View style={[styles.legendDot, { borderColor: category.color }]} />
            <Text variant="caption" color="textSecondary">
              {category.label}
              {category.price != null ? ` · ${formatPrice(category.price, 'ETB')}` : ''}
            </Text>
          </View>
        ))}
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.legendDotTaken]} />
          <Text variant="caption" color="textSecondary">
            Taken
          </Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.gridScroll}>
        <View style={styles.grid}>
          {rows.map((row) => (
            <SeatRow
              key={row.label}
              row={row}
              categoryByKey={categoryByKey}
              selected={selected}
              onToggle={onToggle}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function ScreenIndicator() {
  return (
    <View style={styles.screenWrap}>
      <LinearGradient
        colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.85)', 'rgba(255,255,255,0.05)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.screenBar}
      />
      <Text variant="label" color="textMuted" style={styles.screenLabel}>
        SCREEN
      </Text>
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
      <View style={styles.rowLabel}>
        <Text variant="caption" color="textMuted">
          {row.label}
        </Text>
      </View>
      {row.seats.map((seat, i) => {
        // Bows toward the screen at the row's middle seat; flat at the ends.
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

  const taken = seat.status === 'sold' || seat.status === 'held';
  const blocked = seat.status === 'blocked';
  const disabled = taken || blocked;
  const color = category?.color ?? '#9CA3AF';

  return (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel={`Seat ${seat.number}${category ? `, ${category.label}` : ''}`}
      accessibilityState={{ selected: isSelected, disabled }}
      disabled={disabled}
      onPress={() => onToggle(seat)}
      pressedScale={disabled ? 1 : 0.9}
      style={[
        styles.cell,
        { transform: [{ translateY }] },
        taken ? styles.cellTaken : blocked ? styles.cellBlocked : null,
        !disabled && !isSelected ? { borderColor: color, borderWidth: 1.5 } : null,
        isSelected ? { backgroundColor: color, borderColor: color } : null,
      ]}>
      {isSelected ? (
        <Ionicons name="checkmark" size={14} color="#0A0A0B" />
      ) : !disabled ? (
        <Text variant="caption" style={{ color }}>
          {seat.number}
        </Text>
      ) : null}
    </Touchable>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.lg },

  screenWrap: { alignItems: 'center', gap: 6, paddingHorizontal: Spacing.xxl },
  screenBar: { width: '70%', height: 5, borderRadius: Radius.pill },
  screenLabel: { letterSpacing: 3 },

  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
  },
  legendDotTaken: { borderColor: 'transparent', backgroundColor: 'rgba(255,255,255,0.12)' },

  gridScroll: { minWidth: '100%', alignItems: 'center', paddingVertical: Spacing.sm },
  grid: { gap: SEAT_GAP },
  row: { flexDirection: 'row', alignItems: 'center', gap: SEAT_GAP },
  rowLabel: { width: ROW_LABEL_WIDTH, alignItems: 'center' },

  cell: {
    width: SEAT_SIZE,
    height: SEAT_SIZE,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  cellSpacer: { width: SEAT_SIZE, height: SEAT_SIZE },
  cellTaken: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 0,
  },
  cellBlocked: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 0,
    opacity: 0.4,
  },
});

export const SeatMap = memo(SeatMapImpl);
