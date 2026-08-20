import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  type LayoutChangeEvent,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CinemaRow } from '@/components/cinema/cinema-picker';
import { DayRail } from '@/components/cinema/day-rail';
import { PosterDeck } from '@/components/cinema/poster-deck';
import { GlassIconButton } from '@/components/ui/glass-button';
import { PageRefreshControl } from '@/components/ui/refresh-control';
import { EmptyState, ErrorState } from '@/components/ui/state-views';
import { Text } from '@/components/ui/text';
import { tabBarClearance } from '@/constants/layout';
import { Spacing } from '@/constants/theme';
import { useRefresh } from '@/hooks/use-refresh';
import { resolveImageUrl } from '@/lib/media';
import { type DayKey, groupByDay, headlineDate } from '@/lib/programme';
import { useCinemaShowtimes, useCinemas } from '@/queries/cinema';
import type { Cinema } from '@/types/api';

/**
 * Pick a cinema, then swipe its programme as a deck of posters.
 *
 * The page is built around the artwork rather than around a list: the poster is
 * the only thing a distributor made to sell the film, so it gets the screen, the
 * page takes its colour from it, and the text is reduced to the two facts you
 * cannot read off the art — what day it plays and how long it runs.
 *
 * Both states live in one route. A cinema is a filter on what you are looking
 * at, not a place you travel to, so swapping it is a change of mind rather than
 * a navigation act with a back stack behind it.
 */
export default function CinemaScreen() {
  const insets = useSafeAreaInsets();
  const [chosen, setChosen] = useState<Cinema | null>(null);
  const [day, setDay] = useState<DayKey>('now');
  const [card, setCard] = useState(0);
  const [stage, setStage] = useState({ width: 0, height: 0 });

  const cinemas = useCinemas();
  const showtimes = useCinemaShowtimes(chosen?._id);

  const refetch = chosen ? showtimes.refetch : cinemas.refetch;
  const { refreshing, onRefresh } = useRefresh(refetch);

  const segments = useMemo(() => groupByDay(showtimes.showtimes), [showtimes.showtimes]);
  const segment = segments.find((s) => s.key === day) ?? segments[0];
  const entries = segment?.entries ?? [];
  const visible = entries[Math.min(card, Math.max(entries.length - 1, 0))];

  const onStage = useCallback(
    (e: LayoutChangeEvent) =>
      setStage({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height }),
    [],
  );

  const pickDay = useCallback((key: DayKey) => {
    setDay(key);
    // A day's deck is its own sequence; keeping the old position would land on
    // an unrelated film, or past the end of a shorter day.
    setCard(0);
  }, []);

  const renderCinema = useCallback(
    ({ item }: { item: Cinema }) => (
      <CinemaRow
        cinema={item}
        selected={item._id === chosen?._id}
        onPress={(next) => {
          setChosen(next);
          setDay('now');
          setCard(0);
        }}
      />
    ),
    [chosen?._id],
  );

  const topPadding = insets.top + Spacing.sm;
  const bottomPadding = tabBarClearance(insets.bottom);

  // ── cinema picker ────────────────────────────────────────────────────────
  if (!chosen) {
    return (
      <View style={styles.screen}>
        <Backdrop />
        {cinemas.isLoading ? (
          <View style={[styles.centre, { paddingTop: topPadding }]}>
            <ActivityIndicator size="large" color="#FFFFFF" />
          </View>
        ) : (
          <FlatList
            data={cinemas.cinemas}
            keyExtractor={(cinema) => cinema._id}
            renderItem={renderCinema}
            contentContainerStyle={[
              styles.list,
              { paddingTop: topPadding + Spacing.xl, paddingBottom: bottomPadding },
            ]}
            showsVerticalScrollIndicator={false}
            refreshControl={<PageRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListHeaderComponent={
              <View style={styles.pickerHead}>
                <Text variant="display" style={styles.headline}>
                  CINEMA
                </Text>
                <Text variant="small" color="textSecondary">
                  {`Pick a cinema to see what's on`}
                </Text>
              </View>
            }
            ListEmptyComponent={
              cinemas.isError ? (
                <ErrorState message={cinemas.error?.message} onRetry={() => cinemas.refetch()} />
              ) : (
                <EmptyState
                  icon="business-outline"
                  title="No cinemas yet"
                  message="Cinemas appear here as soon as they start listing screenings."
                />
              )
            }
          />
        )}
      </View>
    );
  }

  // ── programme ────────────────────────────────────────────────────────────
  const poster = resolveImageUrl(visible?.movie.poster);

  return (
    <View style={styles.screen}>
      {/* The page wears the current poster: blurred hard, bled to the top edge
          and under the status bar, so each film brings its own colour. */}
      <Backdrop poster={poster} />

      <View style={[styles.chrome, { paddingTop: topPadding }]}>
        <View style={styles.bar}>
          <View style={styles.barText}>
            <Text variant="caption" color="textSecondary" numberOfLines={1}>
              {chosen.city ? `${chosen.name} · ${chosen.city}` : chosen.name}
            </Text>
          </View>
          <GlassIconButton
            icon="swap-horizontal"
            accessibilityLabel="Choose a different cinema"
            onPress={() => setChosen(null)}
          />
        </View>

        <DayRail segments={segments} active={day} onSelect={pickDay} />

        <Text variant="display" style={styles.headline} numberOfLines={1}>
          {headlineDate(visible?.startsAt) || segment?.label.toUpperCase()}
        </Text>
      </View>

      <View style={styles.stage} onLayout={onStage}>
        {showtimes.isLoading ? (
          <View style={styles.centre}>
            <ActivityIndicator size="large" color="#FFFFFF" />
          </View>
        ) : showtimes.isError ? (
          <View style={styles.centre}>
            <ErrorState message={showtimes.error?.message} onRetry={() => showtimes.refetch()} />
          </View>
        ) : entries.length === 0 ? (
          <View style={styles.centre}>
            <EmptyState
              icon="film-outline"
              title={emptyTitle(day)}
              message={`${chosen.name} has nothing listed for this window yet.`}
            />
          </View>
        ) : stage.width > 0 ? (
          <PosterDeck
            entries={entries}
            width={stage.width - Spacing.lg * 2}
            height={stage.height}
            onIndexChange={setCard}
          />
        ) : null}
      </View>

      {visible ? (
        <View style={[styles.foot, { paddingBottom: bottomPadding }]}>
          <Ionicons name="time-outline" size={15} color="rgba(255,255,255,0.75)" />
          <Text variant="small" style={styles.footText} numberOfLines={1}>
            {timesLabel(visible.showtimes.map((s) => s.startsAt))}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/** The page's ground: the poster if there is one, a flat dark field if not. */
function Backdrop({ poster }: { poster?: string | null }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={styles.ground} />
      {poster ? (
        <Image
          source={{ uri: poster }}
          style={[StyleSheet.absoluteFill, styles.wash]}
          contentFit="cover"
          blurRadius={60}
          transition={320}
          cachePolicy="memory-disk"
        />
      ) : null}
      <LinearGradient
        colors={['rgba(8,8,10,0.35)', 'rgba(8,8,10,0.82)', '#08080A']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

function emptyTitle(day: DayKey): string {
  if (day === 'now') return 'Nothing on today';
  if (day === 'tomorrow') return 'Nothing on tomorrow';
  return 'Nothing announced yet';
}

/** "20:00 · 22:30" — every screening of the visible film, in order. */
function timesLabel(isos: string[]): string {
  const times = isos
    .map((iso) => new Date(iso))
    .filter((d) => !Number.isNaN(d.getTime()))
    .map((d) => d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }));
  return times.length ? times.join('  ·  ') : 'Times at the cinema';
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  ground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#08080A',
  },
  wash: { opacity: 0.9 },

  chrome: { gap: Spacing.md, paddingBottom: Spacing.md },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  barText: { flex: 1 },

  // Condensed, tight and loud — the one piece of type that competes with a
  // poster for attention, which is why it is a date and nothing else.
  headline: {
    color: '#FFFFFF',
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -1.4,
    paddingHorizontal: Spacing.lg,
  },

  stage: { flex: 1, paddingHorizontal: Spacing.lg },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  foot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  footText: { color: 'rgba(255,255,255,0.85)' },

  list: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  pickerHead: { gap: 2, paddingBottom: Spacing.md },
});
