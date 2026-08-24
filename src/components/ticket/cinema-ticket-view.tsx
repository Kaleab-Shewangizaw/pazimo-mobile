import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { memo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { cinemaTicketQrUrl } from '@/api/cinema-checkout';
import { TicketFrame } from '@/components/ticket/ticket-frame';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
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
 */

const SINGLE_PLATE_MAX = 280;
const GRID_QR_SIZE = 84;

export type CinemaTicketViewProps = {
  order: CinemaOrder;
  width?: number;
};

function CinemaTicketViewImpl({ order, width }: CinemaTicketViewProps) {
  const window = useWindowDimensions();
  const available = width ?? window.width - Spacing.lg * 2;

  const tickets = order.tickets;
  const lead = tickets[0];
  if (!lead) return null;

  const poster = resolveImageUrl(lead.movie.poster);
  const seated = tickets.every((t) => t.seat);
  const admits = seated
    ? `Seat${tickets.length > 1 ? 's' : ''} ${tickets.map((t) => `${t.seat!.row}${t.seat!.number}`).join(', ')}`
    : `${lead.ticketType} × ${tickets.reduce((n, t) => n + t.quantity, 0)}`;
  const total = tickets.reduce((sum, t) => sum + t.totalAmount, 0);
  const plate = Math.min(available - Spacing.xl * 2, SINGLE_PLATE_MAX);

  return (
    <TicketFrame
      detailsBackground={
        poster ? (
          <>
            <Image
              source={{ uri: poster }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              blurRadius={18}
              transition={220}
              cachePolicy="memory-disk"
              recyclingKey={order.transactionId}
            />
            <LinearGradient
              colors={['rgba(10,10,12,0.9)', 'rgba(10,10,12,0.7)', 'rgba(10,10,12,0.42)']}
              locations={[0, 0.6, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0.4 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.sheen} />
          </>
        ) : null
      }
      stub={
        <View style={styles.stub}>
          <Text variant="heading" role="heading" style={styles.title}>
            {lead.movieTitle}
          </Text>
          <Text variant="small" color="textSecondary" style={styles.centered}>
            {tickets.length > 1
              ? 'Show these QR codes at the cinema entrance'
              : 'Show this QR code at the cinema entrance'}
          </Text>

          {tickets.length === 1 ? (
            <View style={[styles.plate, { width: plate, height: plate }]}>
              <Image
                source={{ uri: cinemaTicketQrUrl(lead.ticketId) }}
                style={{ width: plate * 0.78, height: plate * 0.78 }}
                contentFit="contain"
              />
            </View>
          ) : (
            <View style={styles.qrGrid}>
              {tickets.map((t) => (
                <View key={t.ticketId} style={styles.qrCell}>
                  <View style={styles.qrCellPlate}>
                    <Image
                      source={{ uri: cinemaTicketQrUrl(t.ticketId) }}
                      style={styles.qrCellImage}
                      contentFit="contain"
                    />
                  </View>
                  <Text variant="caption" color="textSecondary" numberOfLines={1}>
                    {t.seat ? `${t.seat.row}${t.seat.number}` : t.ticketType}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <Text variant="small" color="textSecondary" style={styles.centered}>
            {admits}
          </Text>
        </View>
      }
      details={
        <View style={styles.details}>
          <DetailRow icon="business" label="Cinema" value={lead.cinema.name} />
          <DetailRow icon="calendar-clear" label="Showtime" value={formatShowtime(lead.showtimeStartsAt)} />
          {lead.hallName ? <DetailRow icon="film-outline" label="Hall" value={lead.hallName} /> : null}
          {order.concessions.length ? (
            <DetailRow
              icon="fast-food-outline"
              label="Snacks"
              value={order.concessions.map((c) => `${c.name} ×${c.quantity}`).join(', ')}
            />
          ) : null}
          <DetailRow icon="pricetag" label="Total" value={formatPrice(total, lead.currency)} />
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
        <Text variant="callout" numberOfLines={3}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function formatShowtime(iso: string): string {
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return iso;
  const date = when.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const time = when.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${date} · ${time}`;
}

const styles = StyleSheet.create({
  stub: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  title: { color: '#FFFFFF', textAlign: 'center', lineHeight: 31, letterSpacing: -0.6, marginBottom: 2 },
  centered: { textAlign: 'center' },

  plate: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
    borderRadius: Radius.lg,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

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
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrCellImage: { width: GRID_QR_SIZE * 0.8, height: GRID_QR_SIZE * 0.8 },

  sheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.06)',
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

export const CinemaTicketView = memo(CinemaTicketViewImpl);
