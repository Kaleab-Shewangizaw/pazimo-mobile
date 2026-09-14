import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { memo, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { GlassChip } from '@/components/ui/glass-button';
import { Touchable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { AspectRatio, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { resolveImageUrl } from '@/lib/media';
import type { RsvpForm } from '@/types/api';

export type RsvpCardProps = {
  form: RsvpForm;
  /** `rail` is the fixed-width horizontal variant, matching `EventCard`. */
  layout?: 'feed' | 'rail';
};

/**
 * `EventCard`'s lighter sibling — same geometry and card language (poster
 * ratio, corner radius, bottom scrim + centered title) so it reads as the same
 * family in a rail, but without `EventCard`'s masked progressive-blur panel:
 * this is a secondary surface, and that layer isn't worth its cost here.
 */
function RsvpCardImpl({ form, layout = 'rail' }: RsvpCardProps) {
  const theme = useTheme();
  const router = useRouter();
  const cover = resolveImageUrl(form.coverImage);
  const compact = layout === 'rail';
  const facts = [form.date, form.startTime?.trim()].filter(Boolean).join(' · ');

  const onPress = useCallback(() => {
    router.push(`/rsvp/${form.publicId}`);
  }, [form.publicId, router]);

  return (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel={`${form.title}. RSVP${facts ? `, ${facts}` : ''}`}
      onPress={onPress}
      style={[styles.card, compact ? styles.rail : styles.feed, { borderColor: theme.hairline }]}>
      {cover ? (
        <Image
          source={{ uri: cover }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={180}
          cachePolicy="memory-disk"
          recyclingKey={form._id}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.surfaceMuted }]} />
      )}

      <View style={styles.topRow}>
        <GlassChip label="RSVP" />
      </View>

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.9)']}
        locations={[0, 0.5, 1]}
        style={styles.panel}
        pointerEvents="none"
      />

      <View style={[styles.body, compact && styles.bodyCompact]}>
        <Text variant="heading" numberOfLines={2} style={styles.title}>
          {form.title}
        </Text>
        {facts ? (
          <View style={styles.infoRow}>
            <Ionicons name="calendar-clear" size={compact ? 12 : 13} color="#FFFFFF" />
            <Text variant="small" numberOfLines={1} style={styles.infoText}>
              {facts}
            </Text>
          </View>
        ) : null}
      </View>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.xl, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  feed: { width: '100%', aspectRatio: AspectRatio.poster },
  rail: { width: 280, aspectRatio: AspectRatio.poster },

  topRow: { position: 'absolute', top: Spacing.md, left: Spacing.md, zIndex: 2 },

  panel: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '54%' },
  body: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.sm,
    alignItems: 'center',
  },
  bodyCompact: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, gap: Spacing.xs },
  title: {
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 30,
    letterSpacing: -1,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  infoText: {
    color: '#FFFFFF',
    flexShrink: 1,
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
});

export const RsvpCard = memo(RsvpCardImpl);
