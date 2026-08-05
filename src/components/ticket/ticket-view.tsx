import { Ionicons } from '@expo/vector-icons';
import { memo, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { PazimoQr } from '@/components/ticket/pazimo-qr';
import { TicketFrame } from '@/components/ticket/ticket-frame';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatTicketDate } from '@/lib/date';
import { formatPrice } from '@/lib/pricing';
import { ticketQrPayload } from '@/lib/qr';
import type { Ticket } from '@/types/api';

/**
 * The ticket itself — the artefact the whole purchase exists to produce.
 *
 * The QR sits on a white plate rather than on the dark card. That is not a
 * styling choice: scanners key off the light/dark contrast of the quiet zone,
 * and a code inverted onto a dark surface is markedly harder to read at an
 * angle, in the dark, through a phone screen at a door.
 */

/** Share of the plate width the symbol takes; the rest is its quiet zone. */
const QR_SHARE = 0.78;

/** Ceiling so the plate stays a square on a tablet instead of a slab. */
const MAX_PLATE = 280;

export type TicketViewProps = {
  ticket: Ticket;
  /** Width available to the card, so the QR plate can be sized against it. */
  width?: number;
};

function TicketViewImpl({ ticket, width }: TicketViewProps) {
  const theme = useTheme();
  const window = useWindowDimensions();

  const payload = useMemo(() => ticketQrPayload(ticket), [ticket]);

  const available = width ?? window.width - Spacing.lg * 2;
  const plate = Math.min(available - Spacing.xl * 2, MAX_PLATE);
  const venue =
    [ticket.event.location?.address, ticket.event.location?.city].filter(Boolean).join(', ') ||
    'Announced by the organizer';

  return (
    <TicketFrame
      stub={
        <View style={styles.stub}>
          <Text variant="heading" role="heading" style={styles.title}>
            {ticket.event.title}
          </Text>
          <Text variant="small" color="textSecondary" style={styles.centered}>
            Show this QR code at the event entrance
          </Text>
          <Text variant="caption" color="textMuted" style={styles.centered}>
            Ticket: {ticket.ticketId}
          </Text>

          <View style={[styles.plate, { width: plate, height: plate }]}>
            <PazimoQr value={payload} size={plate * QR_SHARE} />
          </View>

          {ticket.purchaseQuantity > 1 ? (
            <Text variant="small" color="textSecondary" style={styles.centered}>
              Admits {ticket.purchaseQuantity}
            </Text>
          ) : null}

          {ticket.checkedIn ? (
            <View style={[styles.stamp, { borderColor: theme.danger }]}>
              <Ionicons name="checkmark-circle" size={14} color={theme.danger} />
              <Text variant="caption" color="danger">
                Already checked in
              </Text>
            </View>
          ) : null}
        </View>
      }
      details={
        <View style={styles.details}>
          <DetailRow icon="location" label="Venue" value={venue} />
          <DetailRow
            icon="calendar-clear"
            label="Date & Time"
            value={
              formatTicketDate(ticket.event.startDate, ticket.event.startTime) || 'To be announced'
            }
          />
          <DetailRow
            icon="pricetag"
            label={ticket.ticketType ? ticket.ticketType : 'Price'}
            value={formatPrice(ticket.price, ticket.currency)}
          />
        </View>
      }
    />
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={15} color="#FFFFFF" />
      </View>
      <View style={styles.rowText}>
        <Text variant="caption" color="textMuted">
          {label}
        </Text>
        <Text variant="callout" numberOfLines={2}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stub: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    // Clears the perforation, which is drawn on this block's bottom edge.
    paddingBottom: Spacing.xl,
  },
  title: {
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 31,
    letterSpacing: -0.6,
    marginBottom: 2,
  },
  centered: { textAlign: 'center' },

  plate: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
    borderRadius: Radius.lg,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  stamp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },

  details: { gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  rowText: { flex: 1, gap: 1 },
});

export const TicketView = memo(TicketViewImpl);
