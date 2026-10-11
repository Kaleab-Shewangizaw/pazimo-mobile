import { type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { SeatMap } from '@/components/cinema/seat-map';
import { useScreenPreview } from '@/components/cinema/use-screen-preview';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { isSeatedOrder, orderSeatKeys } from '@/lib/cinema-seats';
import { formatPrice } from '@/lib/pricing';
import { useShowtimeSeats } from '@/queries/cinema-checkout';
import type { CinemaOrder } from '@/types/api';

export type SeatsConcessionsSheetProps = {
  visible: boolean;
  onClose: () => void;
  order: CinemaOrder;
};

/**
 * The itemized version of what `cinema-ticket-view.tsx` already shows
 * compressed into one line each (`admits`, the "Snacks" `DetailRow`) — same
 * data, `order.tickets`/`order.concessions`, just broken out per seat and
 * per snack instead of joined into a summary string.
 */
export function SeatsConcessionsSheet({ visible, onClose, order }: SeatsConcessionsSheetProps) {
  const theme = useTheme();
  const screenPreview = useScreenPreview();
  const tickets = order.tickets;
  const currency = tickets[0]?.currency ?? 'ETB';

  // Assigned seating gets one row per seat. Capacity-only halls have no
  // `seat` at all, so those group by ticket type instead — the same split
  // `cinema-ticket-view.tsx`'s `admits` line already makes.
  const seated = isSeatedOrder(tickets);
  const showtimeId = tickets.find((t) => t.showtime)?.showtime;
  const { seatMap, isLoading: mapLoading } = useShowtimeSeats(visible && seated ? showtimeId : undefined);
  const unassignedGroups = seated
    ? []
    : Object.values(
        tickets.reduce<Record<string, { ticketType: string; quantity: number; total: number }>>(
          (groups, t) => {
            const entry = groups[t.ticketType] ?? { ticketType: t.ticketType, quantity: 0, total: 0 };
            entry.quantity += t.quantity;
            entry.total += t.totalAmount;
            groups[t.ticketType] = entry;
            return groups;
          },
          {},
        ),
      );

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text variant="title" style={styles.title}>
        {order.concessions.length ? 'Seats & snacks' : 'Your seats'}
      </Text>

      {/* Where you're sitting, on the hall's own map — not just a list of
          seat numbers. Only for assigned seating, and only once the map has
          loaded (an older order without a showtime id just keeps the list). */}
      {seated && showtimeId ? (
        <View style={[styles.mapCard, { borderColor: theme.glassBorder }]}>
          {seatMap && seatMap.assignedSeating ? (
            // The booking screen's own map — same screen, seats and legend —
            // with your seats lit up and nothing tappable.
            <View style={styles.map}>
              <SeatMap
                categories={seatMap.categories}
                rows={seatMap.rows}
                selectedKeys={orderSeatKeys(tickets)}
                screenPreview={screenPreview}
                readOnly
              />
            </View>
          ) : mapLoading ? (
            <View style={styles.mapLoading}>
              <ActivityIndicator color="#FFFFFF" />
            </View>
          ) : null}
        </View>
      ) : null}

      {tickets.length ? (
        <Section label="SEATS">
          {seated
            ? tickets.flatMap((t) =>
                (t.seats ?? []).map((seat) => (
                  <Row
                    key={`${t.ticketId}-${seat.seatKey}`}
                    title={`Seat ${seat.row}${seat.number}`}
                    subtitle={seat.categoryLabel || t.ticketType}
                    value={formatPrice(t.price, t.currency)}
                  />
                )),
              )
            : unassignedGroups.map((group) => (
                <Row
                  key={group.ticketType}
                  title={`${group.ticketType} × ${group.quantity}`}
                  value={formatPrice(group.total, currency)}
                />
              ))}
        </Section>
      ) : null}

      {order.concessions.length ? (
        <Section label="SNACKS">
          {order.concessions.map((c) => (
            <Row
              key={c._id}
              title={`${c.beverageName} × ${c.quantity}`}
              subtitle={c.status === 'refunded' ? 'Refunded' : undefined}
              value={formatPrice(c.totalAmount, c.currency)}
            />
          ))}
        </Section>
      ) : null}
    </BottomSheet>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="label" color="textMuted">
        {label}
      </Text>
      <View style={styles.rows}>{children}</View>
    </View>
  );
}

function Row({ title, subtitle, value }: { title: string; subtitle?: string; value: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text variant="body" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" color="textSecondary">
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Text variant="callout">{value}</Text>
    </View>
  );
}

const MAP_HEIGHT = 520;

const styles = StyleSheet.create({
  title: { marginBottom: Spacing.lg },
  mapCard: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  // Fixed height: `SeatMap` fills its parent (`flex: 1`), and a scrolling
  // sheet has no height of its own to give it.
  map: { height: MAP_HEIGHT },
  mapLoading: { height: MAP_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  section: { gap: Spacing.sm, marginBottom: Spacing.lg },
  rows: { gap: Spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
  rowText: { flex: 1, gap: 1 },
});
