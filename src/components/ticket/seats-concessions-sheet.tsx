import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import { formatPrice } from '@/lib/pricing';
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
  const tickets = order.tickets;
  const currency = tickets[0]?.currency ?? 'ETB';

  // Assigned seating gets one row per seat. Capacity-only halls have no
  // `seat` at all, so those group by ticket type instead — the same split
  // `cinema-ticket-view.tsx`'s `admits` line already makes.
  const seated = tickets.length > 0 && tickets.every((t) => t.seat);
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
        Seats & snacks
      </Text>

      {tickets.length ? (
        <Section label="SEATS">
          {seated
            ? tickets.map((t) => (
                <Row
                  key={t.ticketId}
                  title={`Seat ${t.seat!.row}${t.seat!.number}`}
                  subtitle={t.seat!.categoryLabel || t.ticketType}
                  value={formatPrice(t.totalAmount, t.currency)}
                />
              ))
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

const styles = StyleSheet.create({
  title: { marginBottom: Spacing.lg },
  section: { gap: Spacing.sm, marginBottom: Spacing.lg },
  rows: { gap: Spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
  rowText: { flex: 1, gap: 1 },
});
