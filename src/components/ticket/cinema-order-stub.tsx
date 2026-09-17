import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { memo, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { Touchable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { resolveImageUrl } from '@/lib/media';
import type { CinemaOrder } from '@/types/api';

/**
 * A paid cinema order in the Movies list — `TicketStub`'s counterpart.
 *
 * One order can be several seats and a handful of snacks; the row shows the
 * screening once, not once per seat, the same "wallet, not ledger" reasoning
 * `TicketStub` documents. The snack count sits in the corner exactly where
 * `TicketStub`'s multi-ticket count does, because it answers the same
 * question at a glance: "is there more behind this row than the poster
 * shows".
 */

const ROW_HEIGHT = 132;

export type CinemaOrderStubProps = { order: CinemaOrder };

function CinemaOrderStubImpl({ order }: CinemaOrderStubProps) {
  const theme = useTheme();
  const router = useRouter();

  const open = useCallback(() => {
    router.push(`/ticket/cinema/${order.transactionId}`);
  }, [router, order.transactionId]);

  const lead = order.tickets[0];
  if (!lead) return null;

  const poster = resolveImageUrl(lead.movie.poster);
  const seated = order.tickets.every((t) => t.seat);
  const seatCount = order.tickets.reduce((n, t) => n + t.quantity, 0);
  const admits = seated
    ? `Seat${seatCount > 1 ? 's' : ''} ${order.tickets.map((t) => `${t.seat!.row}${t.seat!.number}`).join(', ')}`
    : `${lead.ticketType} × ${seatCount}`;
  const snackCount = order.concessions.reduce((n, c) => n + c.quantity, 0);
  const spent = order.tickets.every((t) => t.status !== 'active');

  return (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel={`${lead.movieTitle}. ${formatShowtime(lead.showtimeStartsAt)}. Open`}
      onPress={open}
      pressedScale={0.98}
      style={[styles.card, { borderColor: theme.hairline, opacity: spent ? 0.62 : 1 }]}>
      {poster ? (
        <Image
          source={{ uri: poster }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={180}
          cachePolicy="memory-disk"
          recyclingKey={order.transactionId}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.surfaceMuted }]} />
      )}

      <View style={[StyleSheet.absoluteFill, styles.wash]} />
      <LinearGradient
        colors={['rgba(6,6,8,0.92)', 'rgba(6,6,8,0.62)', 'rgba(6,6,8,0.86)']}
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.body}>
        <Text variant="caption" style={styles.when} numberOfLines={1}>
          {formatShowtime(lead.showtimeStartsAt)}
        </Text>
        <Text variant="callout" style={styles.title} numberOfLines={2}>
          {lead.movieTitle}
        </Text>
        <View style={styles.venueRow}>
          <Ionicons name="film-outline" size={12} color="rgba(255,255,255,0.75)" />
          <Text variant="caption" style={styles.venue} numberOfLines={1}>
            {lead.cinema.name} · {admits}
          </Text>
        </View>
      </View>

      <View style={styles.corner}>
        {snackCount > 0 ? (
          <View style={styles.badge}>
            <Ionicons name="fast-food-outline" size={11} color="#FFFFFF" />
            <Text variant="caption" style={styles.badgeText}>
              {snackCount}
            </Text>
          </View>
        ) : null}
        {spent ? (
          <View style={styles.badge}>
            <Text variant="caption" style={styles.badgeText}>
              USED
            </Text>
          </View>
        ) : seatCount > 1 ? (
          <View style={styles.badge}>
            <Ionicons name="albums-outline" size={11} color="#FFFFFF" />
            <Text variant="caption" style={styles.badgeText}>
              {seatCount}
            </Text>
          </View>
        ) : null}
      </View>
    </Touchable>
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
  card: {
    height: ROW_HEIGHT,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  wash: { backgroundColor: 'rgba(6,6,8,0.35)' },

  body: {
    paddingLeft: Spacing.lg,
    paddingRight: 64,
    gap: 3,
  },
  when: { color: 'rgba(255,255,255,0.72)' },
  title: { color: '#FFFFFF', letterSpacing: -0.3 },
  venueRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  venue: { color: 'rgba(255,255,255,0.75)', flexShrink: 1 },

  corner: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  badgeText: { color: 'rgba(255,255,255,0.92)', letterSpacing: 0.4 },
});

export const CinemaOrderStub = memo(CinemaOrderStubImpl);
