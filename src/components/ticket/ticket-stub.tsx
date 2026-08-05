import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { memo, useCallback } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Touchable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatTicketDate } from '@/lib/date';
import type { TicketGroup } from '@/queries/tickets';
import type { Ticket } from '@/types/api';

/**
 * An event in the tickets list, carrying however many admissions were bought
 * for it: the event's own artwork with the details over it, a count when there
 * is more than one, and the download shortcut in the corner.
 *
 * The artwork is dimmed hard rather than cropped into a thumbnail — at this row
 * height a thumbnail is too small to recognise an event by, while a full-bleed
 * wash still reads as *that* event at a glance, which is how someone finds the
 * right ticket in a queue.
 */

const ROW_HEIGHT = 132;

export type TicketStubProps = {
  group: TicketGroup;
  /** Downloads the newest ticket in the group; the rest are a swipe away. */
  onDownload: (ticket: Ticket) => void;
  downloading?: boolean;
};

function TicketStubImpl({ group, onDownload, downloading = false }: TicketStubProps) {
  const theme = useTheme();
  const router = useRouter();

  const { event, cover, tickets } = group;
  const lead = tickets[0];
  const count = tickets.length;

  const venue = [event.location?.address, event.location?.city].filter(Boolean).join(', ');
  const when = formatTicketDate(event.startDate, event.startTime);
  // Only worth dimming when the whole group is done with — one used ticket out
  // of three still leaves two to get in on.
  const spent = tickets.every((t) => t.checkedIn || t.status === 'cancelled');

  const open = useCallback(() => {
    router.push(`/ticket/${lead.ticketId}`);
  }, [router, lead.ticketId]);

  return (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel={
        count > 1
          ? `${event.title}. ${when}. ${count} tickets. Open`
          : `${event.title}. ${when}. Open ticket`
      }
      onPress={open}
      pressedScale={0.98}
      style={[styles.card, { borderColor: theme.hairline, opacity: spent ? 0.62 : 1 }]}>
      {cover ? (
        <Image
          source={{ uri: cover }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={180}
          cachePolicy="memory-disk"
          recyclingKey={group.key}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.surfaceMuted }]} />
      )}

      {/* Two passes: a flat wash for a contrast floor over any photo, then a
          left-heavy ramp so the text column is darkest where the words are. */}
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
          {when}
        </Text>
        <Text variant="callout" style={styles.title} numberOfLines={2}>
          {event.title}
        </Text>
        {venue ? (
          <View style={styles.venueRow}>
            <Ionicons name="location-sharp" size={12} color="rgba(255,255,255,0.75)" />
            <Text variant="caption" style={styles.venue} numberOfLines={1}>
              {venue}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.corner}>
        <Touchable
          accessibilityRole="button"
          accessibilityLabel={`Download ticket for ${event.title}`}
          onPress={() => onDownload(lead)}
          disabled={downloading}
          haptic
          pressedScale={0.86}
          style={styles.downloadButton}>
          {downloading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="download-outline" size={17} color="#FFFFFF" />
          )}
        </Touchable>

        {count > 1 ? (
          <View style={styles.badge}>
            <Ionicons name="albums-outline" size={11} color="#FFFFFF" />
            <Text variant="caption" style={styles.badgeText}>
              {count}
            </Text>
          </View>
        ) : spent ? (
          <View style={styles.badge}>
            <Text variant="caption" style={styles.badgeText}>
              USED
            </Text>
          </View>
        ) : null}
      </View>
    </Touchable>
  );
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
    // Clear of the corner controls, so a long title never runs under them.
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
    alignItems: 'center',
    gap: Spacing.xs,
  },
  downloadButton: {
    width: 34,
    height: 34,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.28)',
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

export const TicketStub = memo(TicketStubImpl);
