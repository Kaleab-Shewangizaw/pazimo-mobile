import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { DrinkArt } from '@/components/refill/drink-art';
import {
  insetGeometry,
  ticketEdgePath,
  ticketPath,
  type TicketGeometry,
} from '@/components/ticket/ticket-path';
import { Text } from '@/components/ui/text';
import { FontFamily, Radius, Spacing, type ThemeColor } from '@/constants/theme';
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

/** Tickets and screenings get a poster-like band; drinks and snacks room for the whole product shot. */
const ART_HEIGHT: Record<TransferKind, number> = {
  TICKET: 140,
  CINEMA_TICKET: 140,
  // Tall enough to show the whole drink above its name.
  BEVERAGE: 168,
  CINEMA_CONCESSION: 168,
};

/** The tear row's height — and the diameter of each half-circle bite in it. */
const NOTCH = 14;
/** Border thickness of the silhouette's edge. */
const EDGE = 1;

/** Kept clear under a drink's image for the title and detail lines. */
const DRINK_TITLE_SPACE = 48;

/** Theme token per kind — see `transfer*` in constants/theme. */
const KIND_ACCENT: Record<TransferKind, ThemeColor> = {
  TICKET: 'transferTicket',
  BEVERAGE: 'transferBeverage',
  CINEMA_TICKET: 'transferCinemaTicket',
  CINEMA_CONCESSION: 'transferCinemaConcession',
};

/** `#RRGGBB` + alpha (0–1) → `#RRGGBBAA`. */
function withAlpha(hex: string, alpha: number): string {
  return `${hex}${Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0')}`;
}

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
 * status. Monochrome like the rest of the app: a plain dark stub with a
 * hairline edge, its kind marked only by a quiet accent on its label and
 * note (see `transfer*` in constants/theme). A drink sits on a clear
 * background — its own cutout, nothing painted behind it. Purely
 * presentational; `ShareRow` owns the press handling.
 */
export function TransferCard({ share, sent, title, detail }: TransferCardProps) {
  const theme = useTheme();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const kind = share.kind as TransferKind;
  const art = share.art;

  // An event ticket's payload has no cover — fetched by id, cached and shared
  // with every other screen that shows this event.
  const { data: event } = useEvent(kind === 'TICKET' ? art?.eventId : undefined);
  const imageUrl = art?.imageUrl ?? (kind === 'TICKET' ? eventCoverUrl(event?.coverImages) : null);
  const kindColor = theme[KIND_ACCENT[kind]];
  const isDrink = kind === 'BEVERAGE' || kind === 'CINEMA_CONCESSION';

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

  // The stub's silhouette — its paper, its border, and two real half-circle
  // bites at the tear line — drawn as one SVG shape rather than a bordered
  // View with background-colored circles laid over its edges. Those circles
  // only *pretended* to be holes: on Android the View's border is painted on
  // top of its children, so the border ran straight across every "bite".
  // Here the bites are cut out of the shape itself (whatever is behind the
  // card shows through), and the border stops where each bite begins.
  const artHeight = ART_HEIGHT[kind];
  const geometry: TicketGeometry = {
    width: size.width,
    height: size.height,
    radius: Radius.lg,
    tearY: artHeight + NOTCH / 2,
    notch: NOTCH / 2,
  };
  const edge = insetGeometry(geometry, EDGE / 2);

  return (
    <View
      style={styles.card}
      onLayout={(e) => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}>
      {size.width > 0 ? (
        <Svg width={size.width} height={size.height} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Path d={ticketPath(geometry)} fill={theme.surface} />
          <Path
            d={ticketEdgePath(edge)}
            transform={`translate(${EDGE / 2}, ${EDGE / 2})`}
            fill="none"
            stroke={theme.glassBorder}
            strokeWidth={EDGE}
          />
        </Svg>
      ) : null}
      <View style={[styles.art, { height: artHeight }]}>
        {isDrink ? (
          // A drink's own (usually background-removed) image, whole and
          // floating in the space above the title — not cropped to fill.
          <DrinkArt
            imageUrl={art?.productImageUrl}
            height={ART_HEIGHT[kind] - DRINK_TITLE_SPACE}
            fallbackIcon={KIND_ICON[kind]}
            style={styles.drinkArt}
          />
        ) : imageUrl ? (
          <>
            <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
            {/* Only over real photos — legibility for the chip and title. */}
            <LinearGradient
              colors={['rgba(0,0,0,0.35)', 'transparent', theme.scrim]}
              locations={[0, 0.35, 1]}
              style={StyleSheet.absoluteFill}
            />
          </>
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.artFallback, { backgroundColor: theme.surfaceMuted }]}>
            <Ionicons name={KIND_ICON[kind]} size={40} color={withAlpha(kindColor, 0.6)} />
          </View>
        )}

        <View style={styles.artTop}>
          <View style={[styles.chip, { backgroundColor: theme.glassStrong, borderColor: theme.glassBorder }]}>
            <Ionicons name={KIND_ICON[kind]} size={12} color={kindColor} />
            <Text variant="label" style={styles.kindLabel}>
              {KIND_LABEL[kind].toUpperCase()}
            </Text>
          </View>
          {count > 1 ? (
            <View style={[styles.chip, { backgroundColor: theme.glassStrong, borderColor: theme.glassBorder }]}>
              <Text variant="label" style={styles.kindLabel}>
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
        <View style={[styles.dashes, { borderColor: theme.glassBorder }]} />
      </View>

      <View style={styles.body}>
        {when ? <InfoLine icon="calendar-outline" text={when} /> : null}
        {place ? <InfoLine icon="location-outline" text={place} /> : null}

        {share.message ? (
          <View style={[styles.note, { borderLeftColor: kindColor }]}>
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
          // The app's one primary button style — white, dark text.
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
  // No background, border or clipping here — the SVG silhouette is the
  // card's paper and edge (see `TransferCard`).
  card: {},

  // Rounded on top only, to sit inside the silhouette's top corners.
  art: {
    justifyContent: 'space-between',
    overflow: 'hidden',
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
  },
  artFallback: { alignItems: 'center', justifyContent: 'center' },
  drinkArt: { position: 'absolute', top: 0, left: 0, right: 0 },
  artTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.sm,
  },
  // Smoked glass with a hairline — the kind shows in its icon's tint only.
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  kindLabel: { fontSize: 10, color: '#FFFFFF' },
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
