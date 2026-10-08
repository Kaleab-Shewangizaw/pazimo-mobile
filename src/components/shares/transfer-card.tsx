import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatLongDate, relativeTimeLabel } from '@/lib/date';
import { eventCoverUrl } from '@/lib/media';
import type { ShareItemViewModel, ShareKind } from '@/lib/share-item-view-model';
import { useEvent } from '@/queries/events';
import type { ShareStatus } from '@/types/api';

type TransferKind = Exclude<ShareKind, 'MESSAGE'>;

/** Same wording as the compose sheet's kind picker (`kind-picker-step.tsx`). */
const KIND_LABEL: Record<TransferKind, string> = {
  TICKET: 'Event ticket',
  BEVERAGE: 'Drink',
  CINEMA_TICKET: 'Cinema ticket',
  CINEMA_CONCESSION: 'Cinema snack',
};

const KIND_ICON: Record<TransferKind, keyof typeof Ionicons.glyphMap> = {
  TICKET: 'ticket',
  BEVERAGE: 'wine',
  CINEMA_TICKET: 'film',
  CINEMA_CONCESSION: 'fast-food',
};

const STATUS_LABEL: Record<ShareStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  declined: 'Declined',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

/** Translucent wash of each status color, same 12%-alpha convention as the danger icon fills in `chat-menu-sheet.tsx`. */
const STATUS_TINT: Record<ShareStatus, string> = {
  pending: 'rgba(255, 255, 255, 0.12)',
  accepted: 'rgba(52, 211, 153, 0.14)',
  declined: 'rgba(251, 113, 133, 0.14)',
  cancelled: 'rgba(251, 113, 133, 0.14)',
  expired: 'rgba(107, 107, 118, 0.14)',
};

/** Tickets and screenings get a poster-like band; drinks and snacks a shorter swatch. */
const ART_HEIGHT: Record<TransferKind, number> = {
  TICKET: 140,
  CINEMA_TICKET: 140,
  BEVERAGE: 104,
  CINEMA_CONCESSION: 104,
};

const NOTCH = 14;

const time = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });

function startsAtLabel(kind: TransferKind, value?: string | null): string | null {
  const day = formatLongDate(value);
  if (!day || !value) return null;
  // An event's `startDate` is a calendar day (its time lives in a separate
  // free-form field the share payload doesn't carry); a screening's is an
  // exact instant, so only that one gets a clock time.
  return kind === 'CINEMA_TICKET' ? `${day} · ${time.format(new Date(value))}` : day;
}

export type TransferCardProps = {
  share: ShareItemViewModel;
  sent: boolean;
  title: string;
  detail: string;
};

/**
 * A ticket/seat/drink/snack transfer in the chat — drawn as a stub rather than
 * a text bubble: artwork (cover, poster, or the drink's own color) over the
 * item's name, a perforated tear line, then when/where and the transfer's
 * status. Purely presentational; `ShareRow` owns the press handling.
 */
export function TransferCard({ share, sent, title, detail }: TransferCardProps) {
  const theme = useTheme();
  const kind = share.kind as TransferKind;
  const art = share.art;

  // An event ticket's payload has no cover — fetched by id, cached and shared
  // with every other screen that shows this event.
  const { data: event } = useEvent(kind === 'TICKET' ? art?.eventId : undefined);
  const imageUrl = art?.imageUrl ?? (kind === 'TICKET' ? eventCoverUrl(event?.coverImages) : null);
  const accent = art?.accentColor || null;

  const when = startsAtLabel(kind, art?.startsAt);
  const place = art?.place;
  const count = share.lines.reduce((sum, line) => sum + line.quantity, 0);

  const incomingPending = !sent && share.status === 'pending';
  const statusColor =
    share.status === 'pending'
      ? theme.brand
      : share.status === 'accepted'
        ? theme.success
        : share.status === 'expired'
          ? theme.textMuted
          : theme.danger;

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.glassBorder }]}>
      <View style={[styles.art, { height: ART_HEIGHT[kind] }]}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
        ) : (
          <LinearGradient
            colors={[accent ?? theme.surfaceMuted, theme.backgroundElevated]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, styles.artFallback]}>
            <Ionicons name={KIND_ICON[kind]} size={44} color="rgba(255,255,255,0.28)" />
          </LinearGradient>
        )}
        <LinearGradient
          colors={['rgba(0,0,0,0.35)', 'transparent', theme.scrim]}
          locations={[0, 0.35, 1]}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.artTop}>
          <View style={[styles.kindChip, { backgroundColor: theme.glassStrong }]}>
            <Ionicons name={KIND_ICON[kind]} size={12} color={theme.text} />
            <Text variant="label" style={styles.kindLabel}>
              {KIND_LABEL[kind].toUpperCase()}
            </Text>
          </View>
          {count > 1 ? (
            <View style={[styles.countChip, { backgroundColor: theme.brand }]}>
              <Text variant="label" style={{ color: theme.onBrand }}>
                ×{count}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.artBottom}>
          <Text variant="callout" numberOfLines={2} style={styles.title}>
            {title}
          </Text>
          {detail ? (
            <Text variant="small" numberOfLines={1} style={styles.detailOnArt}>
              {detail}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.perforation}>
        <View style={[styles.notch, styles.notchLeft, { backgroundColor: theme.background, borderColor: theme.glassBorder }]} />
        <View style={[styles.dashes, { borderColor: theme.glassBorder }]} />
        <View style={[styles.notch, styles.notchRight, { backgroundColor: theme.background, borderColor: theme.glassBorder }]} />
      </View>

      <View style={styles.body}>
        {when ? <InfoLine icon="calendar-outline" text={when} /> : null}
        {place ? <InfoLine icon="location-outline" text={place} /> : null}

        {share.message ? (
          <View style={[styles.note, { borderLeftColor: theme.glassBorder }]}>
            <Text variant="small" color="textSecondary" numberOfLines={3}>
              “{share.message}”
            </Text>
          </View>
        ) : null}

        <View style={styles.footer}>
          <View style={[styles.statusChip, { backgroundColor: STATUS_TINT[share.status] }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text variant="caption" style={{ color: statusColor }}>
              {STATUS_LABEL[share.status]}
            </Text>
          </View>
          <Text variant="caption" color="textMuted">
            {relativeTimeLabel(share.createdAt)}
          </Text>
        </View>

        {incomingPending ? (
          <View style={[styles.cta, { backgroundColor: theme.brand }]}>
            <Text variant="small" style={[styles.ctaText, { color: theme.onBrand }]}>
              Tap to accept or decline
            </Text>
            <Ionicons name="arrow-forward" size={14} color={theme.onBrand} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

function InfoLine({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  const theme = useTheme();
  return (
    <View style={styles.infoLine}>
      <Ionicons name={icon} size={14} color={theme.textSecondary} />
      <Text variant="small" color="textSecondary" numberOfLines={1} style={styles.infoText}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },

  art: { justifyContent: 'space-between' },
  artFallback: { alignItems: 'center', justifyContent: 'center' },
  artTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.sm,
  },
  kindChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  kindLabel: { fontSize: 10 },
  countChip: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Radius.pill },
  artBottom: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, gap: 2 },
  title: { color: '#FFFFFF' },
  detailOnArt: { color: 'rgba(255,255,255,0.78)' },

  // The tear line: a dashed rule with a half-circle bitten out of each edge,
  // the same stub silhouette the full-screen tickets use.
  perforation: { height: NOTCH, justifyContent: 'center' },
  dashes: {
    marginHorizontal: NOTCH,
    borderTopWidth: 1,
    borderStyle: 'dashed',
  },
  notch: {
    position: 'absolute',
    width: NOTCH,
    height: NOTCH,
    borderRadius: NOTCH / 2,
    borderWidth: StyleSheet.hairlineWidth,
  },
  notchLeft: { left: -NOTCH / 2 },
  notchRight: { right: -NOTCH / 2 },

  body: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, paddingTop: 2, gap: 6 },
  infoLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { flex: 1 },
  note: { borderLeftWidth: 2, paddingLeft: Spacing.sm, marginTop: 2 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
  },
  ctaText: { fontFamily: FontFamily.bold },
});
