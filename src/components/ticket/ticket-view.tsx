import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, type RefObject, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { DetailRow } from '@/components/ticket/detail-row';
import { PazimoQr } from '@/components/ticket/pazimo-qr';
import { QrPlate } from '@/components/ticket/qr-plate';
import { TicketFrame } from '@/components/ticket/ticket-frame';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatTicketDate } from '@/lib/date';
import { eventCoverUrl } from '@/lib/media';
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
  /** Stretches the card to fill its parent — the same size the loading card was. */
  fill?: boolean;
  /** Real glass instead of a flat dark fill. Needs `blurTarget` to have anything to sample on Android. */
  glass?: boolean;
  blurTarget?: RefObject<View | null>;
};

function TicketViewImpl({
  ticket,
  width,
  fill = false,
  glass = false,
  blurTarget,
}: TicketViewProps) {
  const theme = useTheme();
  const window = useWindowDimensions();

  const payload = useMemo(() => ticketQrPayload(ticket), [ticket]);

  const available = width ?? window.width - Spacing.lg * 2;
  const plate = Math.min(available - Spacing.xl * 2, MAX_PLATE);
  const venue =
    [ticket.event.location?.address, ticket.event.location?.city]
      .filter(Boolean)
      .join(', ') || 'Announced by the organizer';
  const cover = eventCoverUrl(ticket.event.coverImages);
  // The edge light reads as "this admits you" — it goes quiet the moment the
  // ticket stops being that, rather than glowing on a stub someone already used.
  const alive = ticket.status === 'active' && !ticket.checkedIn;

  return (
    <TicketFrame
      fill={fill}
      glass={glass}
      glowing={alive}
      blurTarget={blurTarget}
      detailsBackground={
        cover ? (
          <>
            {/* Frosted at decode rather than by a BlurView. The artwork never
                moves, so there is nothing for a live backdrop blur to track —
                and the pager mounts every ticket in the group at once, which is
                exactly where real blur views start costing frames. Lighter than
                before: the point of `glass` is that the artwork still reads
                through it, and a heavier blur just flattened it to mush. */}
            <Image
              source={{ uri: cover }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              blurRadius={8}
              transition={220}
              cachePolicy="memory-disk"
              recyclingKey={ticket._id}
            />
            {/* Darkest under the text column and clearing toward the right, so
                the artwork stays legible as artwork where nothing is read over it. */}
            <LinearGradient
              colors={[
                'rgba(10,10,12,0.78)',
                'rgba(10,10,12,0.55)',
                'rgba(10,10,12,0.3)',
              ]}
              locations={[0, 0.6, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0.4 }}
              style={StyleSheet.absoluteFill}
            />
            {/* The specular lift that separates glass from a dark scrim. */}
            <View style={styles.sheen} />
          </>
        ) : null
      }
      stub={
        <View style={[styles.stub, fill && styles.stubFilled]}>
          {ticket.ticketType ? (
            <Text variant="label" color="textSecondary" style={styles.eyebrow}>
              {ticket.ticketType}
            </Text>
          ) : null}
          <Text variant="heading" role="heading" style={styles.title}>
            {ticket.event.title}
          </Text>
          <Text variant="small" color="textSecondary" style={styles.centered}>
            Show this QR code at the event entrance
          </Text>

          <View style={styles.plateWrap}>
            <QrPlate size={plate}>
              <PazimoQr value={payload} size={plate * QR_SHARE} />
            </QrPlate>
          </View>

          {ticket.purchaseQuantity > 1 ? (
            <Text variant="small" color="textSecondary" style={styles.centered}>
              Admits {ticket.purchaseQuantity}
            </Text>
          ) : null}

          {ticket.checkedIn ? (
            <View style={[styles.stamp, { borderColor: theme.danger }]}>
              <Ionicons
                name="checkmark-circle"
                size={14}
                color={theme.danger}
              />
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
              formatTicketDate(
                ticket.event.startDate,
                ticket.event.startTime,
              ) || 'To be announced'
            }
          />
          <DetailRow
            icon="pricetag"
            label="Price"
            value={formatPrice(ticket.price, ticket.currency)}
          />
        </View>
      }
    />
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
  // When the card fills the screen, its content has to fill that space too —
  // otherwise the title and QR cluster at the top and leave a dead gap above
  // the tear line.
  stubFilled: { flex: 1, justifyContent: 'center' },
  eyebrow: { textAlign: 'center', marginBottom: 2 },
  title: {
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 31,
    letterSpacing: -0.6,
    marginBottom: 2,
  },
  centered: { textAlign: 'center' },

  plateWrap: { marginTop: Spacing.lg, marginBottom: Spacing.md },

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

  sheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },

  details: {
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
});

export const TicketView = memo(TicketViewImpl);
