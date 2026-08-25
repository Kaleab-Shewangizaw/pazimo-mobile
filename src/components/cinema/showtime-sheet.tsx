import { Ionicons } from '@expo/vector-icons';
import { memo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Touchable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatPrice } from '@/lib/pricing';
import type { CinemaMovieDay, CinemaShowtimeSlot } from '@/types/api';

/**
 * Picking a showtime, in one sheet — the cinema counterpart of `CheckoutSheet`'s
 * tier step. Choosing when to go is one decision, the same way choosing a
 * ticket tier is, so it stays a sheet rather than a route; only once a
 * showtime is picked does the flow move to a real screen (seat selection).
 */

export type ShowtimeSheetProps = {
  visible: boolean;
  onClose: () => void;
  days: CinemaMovieDay[];
  onSelect: (slot: CinemaShowtimeSlot) => void;
};

function ShowtimeSheetImpl({ visible, onClose, days, onSelect }: ShowtimeSheetProps) {
  const theme = useTheme();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = days.flatMap((d) => d.showtimes).find((s) => s._id === selectedId) ?? null;

  const confirm = () => {
    if (!selected) return;
    onSelect(selected);
    setSelectedId(null);
  };

  const close = () => {
    onClose();
    setSelectedId(null);
  };

  return (
    <BottomSheet visible={visible} onClose={close}>
      <View style={styles.header}>
        <Text variant="title" style={styles.headerTitle}>
          Select a showtime
        </Text>
        <Touchable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={close}
          pressedScale={0.9}
          style={[styles.headerButton, { backgroundColor: theme.surfaceMuted }]}>
          <Ionicons name="close" size={18} color={theme.text} />
        </Touchable>
      </View>

      <View style={styles.days}>
        {days.map((day) => (
          <View key={day.date} style={styles.day}>
            {day.date ? (
              <Text variant="small" color="textSecondary">
                {prettyDate(day.date)}
              </Text>
            ) : null}
            <View style={styles.rows}>
              {day.showtimes.map((slot) => (
                <ShowtimeRow
                  key={slot._id}
                  slot={slot}
                  selected={slot._id === selectedId}
                  onSelect={() => setSelectedId(slot._id)}
                />
              ))}
            </View>
          </View>
        ))}
      </View>

      <Button
        label={selected ? `Continue · ${clock(selected.startsAt)}` : 'Select a showtime'}
        disabled={!selected}
        size="lg"
        onPress={confirm}
        style={styles.continue}
      />
    </BottomSheet>
  );
}

function ShowtimeRow({
  slot,
  selected,
  onSelect,
}: {
  slot: CinemaShowtimeSlot;
  selected: boolean;
  onSelect: () => void;
}) {
  const theme = useTheme();
  const prices = slot.ticketTypes.map((t) => t.price);
  const fromPrice = prices.length ? Math.min(...prices) : null;
  const disabled = slot.soldOut;

  return (
    <Touchable
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onSelect}
      haptic
      pressedScale={0.98}
      style={[
        styles.row,
        {
          backgroundColor: selected ? theme.brandTint : theme.surface,
          borderColor: selected ? 'rgba(255,255,255,0.85)' : theme.hairline,
          borderWidth: selected ? 1.5 : StyleSheet.hairlineWidth,
          opacity: disabled ? 0.5 : 1,
        },
      ]}>
      <View style={styles.rowMain}>
        <Text variant="callout">{clock(slot.startsAt)}</Text>
        {slot.hall?.screenType ? (
          <Text variant="caption" color="textMuted">
            {slot.hall.screenType}
          </Text>
        ) : null}
        {disabled ? (
          <Text variant="caption" color="danger">
            Sold out
          </Text>
        ) : null}
      </View>

      <View style={styles.rowRight}>
        {fromPrice != null ? (
          <Text variant="callout">{formatPrice(fromPrice, 'ETB')}</Text>
        ) : null}
        <Ionicons
          name={selected ? 'checkmark-circle' : 'ellipse-outline'}
          size={22}
          color={selected ? theme.brand : theme.textMuted}
        />
      </View>
    </Touchable>
  );
}

function prettyDate(value: string): string {
  const when = new Date(value);
  if (Number.isNaN(when.getTime())) return value;
  return when.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

function clock(iso: string): string {
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return '--:--';
  return when.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  headerTitle: { flex: 1 },
  headerButton: {
    width: 32,
    height: 32,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },

  days: { gap: Spacing.lg, marginBottom: Spacing.lg },
  day: { gap: Spacing.sm },
  rows: { gap: Spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
  },
  rowMain: { gap: 2 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },

  continue: { width: '100%' },
});

export const ShowtimeSheet = memo(ShowtimeSheetImpl);
