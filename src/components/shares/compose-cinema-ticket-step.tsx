import { Ionicons } from '@expo/vector-icons';
import { memo, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { SeatMap } from '@/components/cinema/seat-map';
import { useScreenPreview } from '@/components/cinema/use-screen-preview';
import { PickableItemRow } from '@/components/shares/pickable-item-row';
import { Touchable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatTicketDate } from '@/lib/date';
import { useShowtimeSeats } from '@/queries/cinema-checkout';
import type { CinemaSeat, TransferableCinemaTicket } from '@/types/api';

/** Seats picked to send — always within one screening (seat keys only mean something per showtime). */
export type CinemaSeatPick = { showtimeId: string; seatKeys: string[] };

export type ComposeCinemaTicketStepProps = {
  tickets: TransferableCinemaTicket[];
  loading: boolean;
  /** Tickets without assigned seats, sent whole — ticket _id -> selected. */
  selected: Set<string>;
  onToggle: (ticketId: string) => void;
  /** Assigned seating: exactly which of your seats go. */
  seatPick: CinemaSeatPick | null;
  onChangeSeatPick: (pick: CinemaSeatPick | null) => void;
};

type Screening = {
  showtimeId: string;
  tickets: TransferableCinemaTicket[];
  /** Your seats at this screening that can still be sent (not yet walked in on). */
  seatKeys: string[];
};

/** Assigned seating: seats can go one by one. Otherwise the ticket goes whole. */
function isSeated(ticket: TransferableCinemaTicket): ticket is TransferableCinemaTicket & { showtime: string } {
  return Boolean(ticket.showtime && ticket.seats?.length);
}

/**
 * Which movie seats to send. Your tickets are grouped by screening; opening
 * one shows the hall exactly as it looks when booking — the screen, the
 * seats, the legend — where only your own seats can be tapped, so you choose
 * precisely which chairs your friend gets (and which you keep). Tickets for
 * halls without assigned seating can't be split, so those stay a simple
 * checkbox and go whole.
 */
function ComposeCinemaTicketStepImpl({
  tickets,
  loading,
  selected,
  onToggle,
  seatPick,
  onChangeSeatPick,
}: ComposeCinemaTicketStepProps) {
  const theme = useTheme();

  const { screenings, unseated } = useMemo(() => {
    const byShowtime = new Map<string, Screening>();
    const whole: TransferableCinemaTicket[] = [];
    for (const ticket of tickets) {
      if (!isSeated(ticket)) {
        whole.push(ticket);
        continue;
      }
      const screening = byShowtime.get(ticket.showtime) ?? { showtimeId: ticket.showtime, tickets: [], seatKeys: [] };
      screening.tickets.push(ticket);
      for (const seat of ticket.seats ?? []) {
        if (!seat.admittedAt) screening.seatKeys.push(seat.seatKey);
      }
      byShowtime.set(ticket.showtime, screening);
    }
    return { screenings: [...byShowtime.values()].filter((s) => s.seatKeys.length), unseated: whole };
  }, [tickets]);

  // One screening and nothing else to choose from — straight to its seats.
  const onlyScreening = screenings.length === 1 && unseated.length === 0 ? screenings[0].showtimeId : null;
  const [openShowtime, setOpenShowtime] = useState<string | null>(seatPick?.showtimeId ?? null);
  const shownShowtime = openShowtime ?? onlyScreening;
  const open = screenings.find((s) => s.showtimeId === shownShowtime);

  if (loading) return <ActivityIndicator color="#FFFFFF" style={styles.spinner} />;

  if (!screenings.length && !unseated.length) {
    return (
      <Text variant="small" color="textMuted" style={styles.empty}>
        Nothing here is available to send right now.
      </Text>
    );
  }

  if (open) {
    return (
      <SeatPicker
        screening={open}
        pickedKeys={seatPick?.showtimeId === open.showtimeId ? seatPick.seatKeys : []}
        onChange={(seatKeys) => onChangeSeatPick(seatKeys.length ? { showtimeId: open.showtimeId, seatKeys } : null)}
        onBack={onlyScreening ? undefined : () => setOpenShowtime(null)}
      />
    );
  }

  return (
    <View style={styles.list}>
      {screenings.map((screening) => {
        const lead = screening.tickets[0];
        const picked = seatPick?.showtimeId === screening.showtimeId ? seatPick.seatKeys.length : 0;
        return (
          <Touchable
            key={screening.showtimeId}
            accessibilityRole="button"
            accessibilityLabel={`Choose seats for ${lead.movieTitle}`}
            onPress={() => setOpenShowtime(screening.showtimeId)}
            pressedScale={0.98}
            style={[
              styles.screening,
              { borderColor: picked ? theme.brand : theme.glassBorder, backgroundColor: theme.surfaceMuted },
            ]}>
            <View style={styles.screeningText}>
              <Text variant="body" numberOfLines={1}>
                {lead.movieTitle}
              </Text>
              <Text variant="caption" color="textSecondary" numberOfLines={1}>
                {[lead.cinema?.name, formatTicketDate(lead.showtimeStartsAt)].filter(Boolean).join(' · ')}
              </Text>
              <Text variant="caption" color={picked ? 'text' : 'textMuted'}>
                {picked
                  ? `Sending ${picked} of ${screening.seatKeys.length} seats`
                  : `${screening.seatKeys.length} seat${screening.seatKeys.length > 1 ? 's' : ''} · tap to choose`}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
          </Touchable>
        );
      })}

      {unseated.map((ticket) => (
        <PickableItemRow
          key={ticket._id}
          title={`${ticket.movieTitle} · ${ticket.ticketType}`}
          subtitle={[
            ticket.cinema?.name,
            formatTicketDate(ticket.showtimeStartsAt),
            `${ticket.quantity} seat${ticket.quantity > 1 ? 's' : ''}`,
          ]
            .filter(Boolean)
            .join(' · ')}
          selected={selected.has(ticket._id)}
          onToggle={() => onToggle(ticket._id)}
        />
      ))}
    </View>
  );
}

function SeatPicker({
  screening,
  pickedKeys,
  onChange,
  onBack,
}: {
  screening: Screening;
  pickedKeys: string[];
  onChange: (seatKeys: string[]) => void;
  onBack?: () => void;
}) {
  const theme = useTheme();
  const screenPreview = useScreenPreview();
  const { seatMap, isLoading } = useShowtimeSeats(screening.showtimeId);
  const lead = screening.tickets[0];

  const toggle = (seat: CinemaSeat) => {
    onChange(
      pickedKeys.includes(seat.seatKey)
        ? pickedKeys.filter((key) => key !== seat.seatKey)
        : [...pickedKeys, seat.seatKey],
    );
  };

  const allPicked = pickedKeys.length === screening.seatKeys.length;

  return (
    <View style={styles.picker}>
      {onBack ? (
        <Touchable
          accessibilityRole="button"
          accessibilityLabel="All your tickets"
          onPress={onBack}
          pressedScale={0.96}
          style={styles.backRow}>
          <Ionicons name="chevron-back" size={16} color={theme.textSecondary} />
          <Text variant="small" color="textSecondary">
            All your tickets
          </Text>
        </Touchable>
      ) : null}

      <View style={styles.pickerHeader}>
        <View style={styles.screeningText}>
          <Text variant="callout" numberOfLines={1}>
            {lead.movieTitle}
          </Text>
          <Text variant="caption" color="textSecondary" numberOfLines={1}>
            {[lead.cinema?.name, formatTicketDate(lead.showtimeStartsAt)].filter(Boolean).join(' · ')}
          </Text>
        </View>
        <Touchable
          accessibilityRole="button"
          accessibilityLabel={allPicked ? 'Clear selection' : 'Select all your seats'}
          onPress={() => onChange(allPicked ? [] : screening.seatKeys)}
          pressedScale={0.94}
          style={[styles.allButton, { borderColor: theme.glassBorder }]}>
          <Text variant="small">{allPicked ? 'Clear' : 'All'}</Text>
        </Touchable>
      </View>

      <View style={styles.map}>
        {seatMap && seatMap.assignedSeating ? (
          <SeatMap
            categories={seatMap.categories}
            rows={seatMap.rows}
            selectedKeys={pickedKeys}
            selectableKeys={screening.seatKeys}
            onToggle={toggle}
            screenPreview={screenPreview}
            emptyHint="Tap your seats to choose which ones to send"
          />
        ) : isLoading ? (
          <ActivityIndicator color="#FFFFFF" style={styles.spinner} />
        ) : (
          <Text variant="small" color="textMuted" style={styles.empty}>
            Couldn&apos;t load this hall&apos;s seat map.
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.sm },
  spinner: { marginVertical: Spacing.lg },
  empty: { textAlign: 'center', paddingVertical: Spacing.lg },
  screening: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  screeningText: { flex: 1, gap: 2 },
  picker: { gap: Spacing.md },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start' },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  allButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  // Fixed: `SeatMap` fills its parent, and the sheet's scroll view has no
  // height of its own to give it.
  map: { height: 520 },
});

export const ComposeCinemaTicketStep = memo(ComposeCinemaTicketStepImpl);
