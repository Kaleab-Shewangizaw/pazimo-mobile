import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { memo, type RefObject } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { DirectionsChip } from '@/components/location/directions-chip';
import { DetailRow } from '@/components/ticket/detail-row';
import { PazimoQr } from '@/components/ticket/pazimo-qr';
import { PLATE_COLOR, QrPlate, QrSlot } from '@/components/ticket/qr-plate';
import { TicketFrame } from '@/components/ticket/ticket-frame';
import { Touchable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { isSeatedOrder, orderSeatLabels } from '@/lib/cinema-seats';
import { resolveImageUrl } from '@/lib/media';
import { formatPrice } from '@/lib/pricing';
import type { CinemaOrder } from '@/types/api';

/**
 * A whole cinema order, drawn as one ticket — not one card per seat.
 *
 * The backend still issues one `CinemaTicket` (and one QR payload) per seat,
 * because the door scans each admission individually — merging the *records*
 * would make a three-seat order look like one admission at check-in. What
 * merges here is only the presentation: every seat's code sits on the same
 * card, in a grid when there's more than one, with the showtime/cinema/price
 * shown once instead of repeated per seat, and the order's snacks listed
 * alongside rather than needing their own screen.
 *
 * The codes are drawn on the device in Pazimo's dotted style rather than
 * loaded from `qr.png`: the backend's cinema payload is the bare `ticketId`
 * (`buildCinemaQrPayload`), so encoding it here scans exactly the same.
 */

/** Share of the plate the symbol takes; the rest is its quiet zone. */
const QR_SHARE = 0.78;

const SINGLE_PLATE_MAX = 280;
const GRID_QR_SIZE = 84;

export type CinemaTicketViewProps = {
  order: CinemaOrder;
  width?: number;
  /** Stretches the card to fill its parent — the same size the loading card was. */
  fill?: boolean;
  /** Real glass instead of a flat dark fill. Needs `blurTarget` to have anything to sample on Android. */
  glass?: boolean;
  blurTarget?: RefObject<View | null>;
  /** Opens the itemized seats/snacks sheet — omitted, the "Show seats & snacks" line doesn't render. */
  onShowSeats?: () => void;
};

function CinemaTicketViewImpl({
  order,
  width,
  fill = false,
  glass = false,
  blurTarget,
  onShowSeats,
}: CinemaTicketViewProps) {
  const window = useWindowDimensions();
  const available = width ?? window.width - Spacing.lg * 2;

  const tickets = order.tickets;
  const lead = tickets[0];
  if (!lead) return null;

  const poster = resolveImageUrl(lead.movie.poster);
  const seatLabels = orderSeatLabels(tickets);
  const admits = isSeatedOrder(tickets)
    ? `Seat${seatLabels.length > 1 ? 's' : ''} ${seatLabels.join(', ')}`
    : `${lead.ticketType} × ${tickets.reduce((n, t) => n + t.quantity, 0)}`;
  const total = tickets.reduce((sum, t) => sum + t.totalAmount, 0);
  const plate = Math.min(available - Spacing.xl * 2, SINGLE_PLATE_MAX);
  // Live as long as at least one seat on the order still admits — the same
  // "this still gets you in" signal `TicketView` uses.
  const alive = tickets.some((t) => t.status === 'active');

  return (
    <TicketFrame
      fill={fill}
      glass={glass}
      glowing={alive}
      blurTarget={blurTarget}
      detailsBackground={
        poster ? (
          <>
            <Image
              source={{ uri: poster }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              blurRadius={22}
              transition={220}
              cachePolicy="memory-disk"
              recyclingKey={order.transactionId}
            />
            {/* Flat, not a lateral fade — see the same scrim in ticket-view.tsx. */}
            <View style={styles.scrim} />
          </>
        ) : null
      }
      stub={
        <View style={[styles.stub, fill && styles.stubFilled]}>
          <Text variant="label" color="textSecondary" style={styles.eyebrow}>
            {lead.ticketType}
          </Text>
          <Text variant="heading" role="heading" style={styles.title}>
            {lead.movieTitle}
          </Text>
          <Text variant="small" color="textSecondary" style={styles.centered}>
            {tickets.length > 1
              ? 'Show these QR codes at the cinema entrance'
              : 'Show this QR code at the cinema entrance'}
          </Text>

          {tickets.length === 1 && fill ? (
            <QrSlot max={plate}>
              {(size) => (
                <QrPlate size={size}>
                  <PazimoQr value={lead.ticketId} size={size * QR_SHARE} background={PLATE_COLOR} />
                </QrPlate>
              )}
            </QrSlot>
          ) : tickets.length === 1 ? (
            <View style={styles.plateWrap}>
              <QrPlate size={plate}>
                <PazimoQr value={lead.ticketId} size={plate * QR_SHARE} background={PLATE_COLOR} />
              </QrPlate>
            </View>
          ) : (
            <View style={styles.qrGrid}>
              {tickets.map((t) => (
                <View key={t.ticketId} style={styles.qrCell}>
                  <View style={styles.qrCellPlate}>
                    <PazimoQr value={t.ticketId} size={GRID_QR_SIZE * 0.84} background={PLATE_COLOR} />
                  </View>
                  <Text
                    variant="caption"
                    color="textSecondary"
                    numberOfLines={1}
                  >
                    {t.seats?.length ? orderSeatLabels([t]).join(', ') : t.ticketType}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {onShowSeats ? (
            <Touchable
              accessibilityRole="button"
              accessibilityLabel={order.concessions.length ? 'Show seats and snacks' : 'Show seats'}
              onPress={onShowSeats}
              pressedScale={0.96}
              style={styles.showSeatsButton}>
              <Ionicons name="grid-outline" size={14} color="#FFFFFF" />
              <Text variant="small" style={styles.showSeatsText}>
                {order.concessions.length ? 'Show seats & snacks' : 'Show seats'}
              </Text>
              <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.7)" />
            </Touchable>
          ) : null}
        </View>
      }
      details={
        <View style={styles.details}>
          <View style={styles.placeRow}>
            <View style={styles.placeDetail}>
              <DetailRow icon="business" label="Cinema" value={lead.cinema.name} />
            </View>
            <DirectionsChip
              place={{
                name: lead.cinema.name,
                address: lead.cinema.address,
                city: lead.cinema.city,
                locationUrl: lead.cinema.locationUrl,
              }}
            />
          </View>
          <DetailRow
            icon="calendar-clear"
            label="Showtime"
            value={formatShowtime(lead.showtimeStartsAt)}
          />
          {lead.hallName ? (
            <DetailRow icon="film-outline" label="Hall" value={lead.hallName} />
          ) : null}
          <DetailRow icon="grid-outline" label="Admits" value={admits} />
          {order.concessions.length ? (
            <DetailRow
              icon="fast-food-outline"
              label="Snacks"
              value={order.concessions
                .map((c) => `${c.beverageName} ×${c.quantity}`)
                .join(', ')}
            />
          ) : null}
          <DetailRow
            icon="pricetag"
            label="Total"
            value={formatPrice(total, lead.currency)}
          />
        </View>
      }
    />
  );
}

function formatShowtime(iso: string): string {
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return iso;
  const date = when.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const time = when.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${date} · ${time}`;
}

const styles = StyleSheet.create({
  stub: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  // The QR slot takes whatever height the text leaves, so the whole ticket
  // fits on screen; a multi-seat grid just centres in that space instead.
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

  // A real pill button, not an underlined caption — it's the way to see
  // where you're sitting, so it should look like something to tap.
  showSeatsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.sm,
    alignSelf: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  showSeatsText: { color: '#FFFFFF', fontFamily: FontFamily.bold },

  qrGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.md,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  qrCell: { alignItems: 'center', gap: 4, width: GRID_QR_SIZE },
  qrCellPlate: {
    width: GRID_QR_SIZE,
    height: GRID_QR_SIZE,
    borderRadius: Radius.md,
    backgroundColor: PLATE_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(6,6,8,0.82)',
  },

  placeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  placeDetail: { flex: 1 },
  details: {
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
});

export const CinemaTicketView = memo(CinemaTicketViewImpl);
