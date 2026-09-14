import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ShowtimeSheet } from '@/components/cinema/showtime-sheet';
import { TrailerPlayer } from '@/components/cinema/trailer-player';
import { Button } from '@/components/ui/button';
import { GlassButton, GlassIconButton } from '@/components/ui/glass-button';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useGoBack } from '@/hooks/use-go-back';
import { useTheme } from '@/hooks/use-theme';
import { resolveImageUrl } from '@/lib/media';
import { dayKeyOf, movieChips } from '@/lib/programme';
import { parseTrailer } from '@/lib/trailer';
import { useCinemaMovie, useCinemaShowtimes } from '@/queries/cinema';
import { useCinemaBookingStore } from '@/stores/use-cinema-booking-store';
import type { CinemaShowtimeSlot } from '@/types/api';

/**
 * Floating chrome's own footprint — a `lg` Button plus its top padding, the
 * same formula `event/[id].tsx`'s `BUY_BAR_HEIGHT` uses, so the scroll pads
 * itself by exactly this much regardless of the safe-area inset (added separately).
 */
const BOOK_BAR_HEIGHT = Spacing.md + Spacing.lg * 2 + 22;

/**
 * One film: the poster, what it is, and when it plays.
 *
 * The page renders from two sources at once. Whatever the programme already
 * knew — title, poster, runtime, rating — paints immediately from the showtimes
 * cache, and the single-film fetch fills in description, trailer and the full
 * day-by-day list when it lands. That is not just a speed trick: the film page
 * is gated on `publicationStatus: "published"` while the programme is not, so a
 * film can legitimately appear in the deck and 404 here. Seeding from the cache
 * means that case still shows a real page rather than an error for something
 * the viewer was just looking at.
 */
export default function MovieScreen() {
  const { id, cinemaId, date } = useLocalSearchParams<{
    id: string;
    cinemaId?: string;
    /** `YYYY-MM-DD` — the single day picked on the cinema screen. Booking is
     * scoped to it: this page only ever offers the day the viewer already chose. */
    date?: string;
  }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const goBack = useGoBack();
  const router = useRouter();
  const theme = useTheme();

  const [playing, setPlaying] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);

  const detail = useCinemaMovie(id);
  const cached = useCinemaShowtimes(cinemaId);

  // The programme's own copy of this film, used until the detail lands and as
  // the fallback if it never does. Scoped to the picked day too, so the page
  // never flashes other days' times before the real day-grouped list arrives.
  const fallback = useMemo(
    () =>
      cached.showtimes.filter(
        (s) => s.movie?._id === id && (!date || dayKeyOf(s.startsAt) === date),
      ),
    [cached.showtimes, id, date],
  );

  const movie = detail.page?.movie ?? fallback[0]?.movie;
  const cinemaName = detail.page?.cinema?.name;
  const trailer = parseTrailer(detail.page?.movie.trailerUrl);

  const openSheet = useCallback(() => setSheetVisible(true), []);

  // Only offered once the full day-grouped list has landed: it carries real
  // showtime ids, while the cached-programme fallback fakes `_id` as the ISO
  // time string, which the checkout endpoints can't resolve.
  const onSelectSlot = useCallback(
    (slot: CinemaShowtimeSlot) => {
      if (!detail.page || !movie) return;
      useCinemaBookingStore.getState().startBooking({
        showtimeId: slot._id,
        cinemaId: detail.page.cinema._id,
        movieTitle: movie.title,
        posterUrl: movie.poster,
        // Carried over because the seat-map endpoint returns no pricing at all
        // for a capacity-only hall — this is the only place that data exists.
        ticketTypes: slot.ticketTypes ?? [],
      });
      setSheetVisible(false);
      router.push(`/cinema/${slot._id}/seats`);
    },
    [detail.page, movie, router],
  );

  const posterWidth = width - Spacing.lg * 2;
  const posterHeight = Math.round(posterWidth * 1.34);

  if (!movie) {
    return (
      <View style={[styles.screen, styles.centre]}>
        {detail.isLoading || cached.isLoading ? (
          <ActivityIndicator size="large" color="#FFFFFF" />
        ) : (
          <View style={styles.missing}>
            <Ionicons name="film-outline" size={40} color="rgba(255,255,255,0.4)" />
            <Text variant="title" style={styles.centreText}>
              This film isn&apos;t available
            </Text>
            <Text variant="small" color="textSecondary" style={styles.centreText}>
              It may not have been published yet.
            </Text>
            <GlassButton label="Go back" icon="arrow-back" onPress={goBack} />
          </View>
        )}
      </View>
    );
  }

  const poster = resolveImageUrl(movie.poster);
  const chips = movieChips(movie);
  // Scoped to the single day picked on the cinema screen — this page (the
  // "Showtimes" list and the booking sheet alike) never offers a day the
  // viewer didn't ask for. Without a `date` param (a route entered some other
  // way) it falls back to every upcoming day, same as before this existed.
  const allDays = detail.page?.days ?? [];
  const days = date ? allDays.filter((d) => d.date === date) : allDays;
  const bookable = days.length > 0;
  const allSlots = days.flatMap((d) => d.showtimes);
  const soldOut = bookable && allSlots.every((s) => s.soldOut);

  return (
    <View style={styles.screen}>
      {poster ? (
        <Image
          source={{ uri: poster }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          blurRadius={70}
          transition={260}
          cachePolicy="memory-disk"
        />
      ) : null}
      <LinearGradient
        colors={['rgba(8,8,10,0.55)', 'rgba(8,8,10,0.9)', '#08080A']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <GlassIconButton icon="arrow-back" accessibilityLabel="Go back" onPress={goBack} />
        {cinemaName ? (
          <Text variant="caption" color="textSecondary" numberOfLines={1} style={styles.headerText}>
            {cinemaName}
          </Text>
        ) : null}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + Spacing.xxl + (bookable ? BOOK_BAR_HEIGHT : 0) },
        ]}
      >
        {/* The trailer takes the poster's exact footprint, so starting it swaps
            one rectangle for another instead of reflowing the page. */}
        {playing && trailer ? (
          <TrailerPlayer trailer={trailer} width={posterWidth} height={posterHeight} />
        ) : (
          <View style={[styles.poster, { width: posterWidth, height: posterHeight }]}>
            {poster ? (
              <Image
                source={{ uri: poster }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={220}
                cachePolicy="memory-disk"
              />
            ) : (
              <View style={[StyleSheet.absoluteFill, styles.blank]}>
                <Ionicons name="film-outline" size={44} color="rgba(255,255,255,0.25)" />
              </View>
            )}

            {trailer ? (
              <View style={styles.playRow}>
                <GlassButton
                  label="Watch trailer"
                  icon="play"
                  iconTone="solid"
                  onPress={() => setPlaying(true)}
                />
              </View>
            ) : null}
          </View>
        )}

        <View style={styles.body}>
          <Text variant="heading" style={styles.title}>
            {movie.title}
          </Text>

          {chips.length ? (
            <View style={styles.chips}>
              {chips.map((chip) => (
                <View key={chip} style={styles.chip}>
                  <Text variant="caption" style={styles.chipText}>
                    {chip}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {movie.description ? (
            <Text variant="body" color="textSecondary" style={styles.blurb}>
              {movie.description}
            </Text>
          ) : null}

          <Facts
            language={movie.language}
            subtitles={movie.subtitles}
            release={detail.page?.movie.releaseDate}
          />

          <Showtimes days={days} fallbackTimes={fallback.map((s) => s.startsAt)} />
        </View>
      </ScrollView>

      {/* The only solid-white element on the screen — everything above is
          transparent or dimmed, so the action reads instantly. Mirrors the
          event page's fixed "Buy Now" bar: always there once real showtimes
          exist, opening a sheet rather than requiring an inline pick first. */}
      {bookable ? (
        <View
          style={[
            styles.bookBar,
            { paddingBottom: insets.bottom + Spacing.md, borderTopColor: theme.hairline },
          ]}>
          <Button
            label={soldOut ? 'Sold out' : 'Book Now'}
            disabled={soldOut}
            size="lg"
            style={styles.bookButton}
            onPress={openSheet}
          />
        </View>
      ) : null}

      <ShowtimeSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        days={days}
        onSelect={onSelectSlot}
      />
    </View>
  );
}

function Facts({
  language,
  subtitles,
  release,
}: {
  language?: string;
  subtitles?: string;
  release?: string | null;
}) {
  const rows = [
    language ? { label: 'Language', value: language } : null,
    subtitles ? { label: 'Subtitles', value: subtitles } : null,
    release ? { label: 'Released', value: prettyDate(release) } : null,
  ].filter((row): row is { label: string; value: string } => Boolean(row));

  if (!rows.length) return null;

  return (
    <View style={styles.facts}>
      {rows.map((row) => (
        <View key={row.label} style={styles.factRow}>
          <Text variant="small" color="textMuted" style={styles.factLabel}>
            {row.label}
          </Text>
          <Text variant="small" style={styles.factValue}>
            {row.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

/**
 * Screenings by day — informational only. Picking one to book happens in the
 * `ShowtimeSheet`, opened from the fixed bar below; this list just says when
 * the film plays, the way it did before booking existed. Falls back to the
 * bare times the programme carried when the day-grouped list isn't available
 * yet — fewer facts, but never a blank section under a heading that promises one.
 */
function Showtimes({
  days,
  fallbackTimes,
}: {
  days: { date: string; showtimes: { _id: string; startsAt: string; soldOut: boolean }[] }[];
  fallbackTimes: string[];
}) {
  const groups = days.length
    ? days
    : fallbackTimes.length
      ? [
          {
            date: '',
            showtimes: fallbackTimes.map((t) => ({ _id: t, startsAt: t, soldOut: false })),
          },
        ]
      : [];

  if (!groups.length) return null;

  return (
    <View style={styles.showtimes}>
      <Text variant="label" color="textMuted">
        SHOWTIMES
      </Text>
      {groups.map((group) => (
        <View key={group.date || 'all'} style={styles.day}>
          {/* Redundant once a single day was already chosen upstream (see
              `ShowtimeSheet`'s identical guard). */}
          {groups.length > 1 && group.date ? (
            <Text variant="small" color="textSecondary">
              {prettyDate(group.date)}
            </Text>
          ) : null}
          <View style={styles.slots}>
            {group.showtimes.map((slot) => (
              <View key={slot._id} style={[styles.slot, slot.soldOut && styles.slotOut]}>
                <Text variant="small" style={[styles.slotText, slot.soldOut && styles.slotTextOut]}>
                  {clock(slot.startsAt)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function prettyDate(value: string): string {
  const when = new Date(value);
  if (Number.isNaN(when.getTime())) return value;
  return when.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

function clock(iso: string): string {
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return '--:--';
  return when.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#08080A' },
  centre: { alignItems: 'center', justifyContent: 'center' },
  centreText: { textAlign: 'center' },
  missing: { alignItems: 'center', gap: Spacing.sm, padding: Spacing.xl },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  headerText: { flex: 1 },

  content: { paddingHorizontal: Spacing.lg, gap: Spacing.lg, paddingTop: Spacing.sm },

  poster: {
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: '#141418',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
    justifyContent: 'flex-end',
  },
  blank: { alignItems: 'center', justifyContent: 'center' },
  playRow: { alignItems: 'center', padding: Spacing.lg },

  body: { gap: Spacing.md },
  title: { color: '#FFFFFF', letterSpacing: -0.5 },
  blurb: { lineHeight: 22 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  chip: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  chipText: { color: '#FFFFFF' },

  facts: { gap: 6 },
  factRow: { flexDirection: 'row', gap: Spacing.md },
  factLabel: { width: 88 },
  factValue: { flex: 1, color: 'rgba(255,255,255,0.9)' },

  showtimes: { gap: Spacing.sm, marginTop: Spacing.xs },
  day: { gap: 6 },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  slot: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  slotOut: { backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.12)' },
  slotText: { color: '#FFFFFF' },
  slotTextOut: { color: 'rgba(255,255,255,0.35)', textDecorationLine: 'line-through' },

  bookBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    backgroundColor: '#08080A',
  },
  bookButton: { width: '100%' },
});
