import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useDeferredValue, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  type LayoutChangeEvent,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CinemaRow } from '@/components/cinema/cinema-picker';
import { ComingSoonSheet } from '@/components/cinema/coming-soon-sheet';
import { DayRail } from '@/components/cinema/day-rail';
import { PosterDeck } from '@/components/cinema/poster-deck';
import { Surface } from '@/components/ui/glass';
import { GlassIconButton } from '@/components/ui/glass-button';
import { GlassHeader, HEADER_CONTENT_HEIGHT } from '@/components/ui/glass-header';
import { Touchable } from '@/components/ui/pressable';
import { PageRefreshControl } from '@/components/ui/refresh-control';
import { EmptyState, ErrorState } from '@/components/ui/state-views';
import { Text } from '@/components/ui/text';
import { tabBarClearance } from '@/constants/layout';
import { Radius, Spacing } from '@/constants/theme';
import { useRefresh } from '@/hooks/use-refresh';
import { resolveImageUrl } from '@/lib/media';
import { type DayKey, buildSchedule, headlineDate, todayKey, tomorrowKey } from '@/lib/programme';
import { useCinemaShowtimes, useCinemas } from '@/queries/cinema';
import type { Cinema } from '@/types/api';

/** Matches the glass search field's furniture on Discover. */
const PLACEHOLDER = 'rgba(255,255,255,0.55)';

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
  const router = useRouter();
  // Set when someone taps a cinema from Discover's search rather than picking
  // one here directly — see the pre-select effect below.
  const params = useLocalSearchParams<{ cinemaId?: string }>();
  const [chosen, setChosen] = useState<Cinema | null>(null);
  const [day, setDay] = useState<DayKey>('today');
  /** Which "coming soon" date is picked, once the user has picked one. */
  const [laterDate, setLaterDate] = useState<string | null>(null);
  const [laterSheetVisible, setLaterSheetVisible] = useState(false);
  const [card, setCard] = useState(0);
  const [stage, setStage] = useState({ width: 0, height: 0 });
  const [cinemaQuery, setCinemaQuery] = useState('');
  // The search field starts hidden behind a button in the header — a picker
  // that's mostly "recognise the poster/photo and tap it" doesn't need a
  // field taking up space before anyone's asked to search.
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchAnim] = useState(() => new Animated.Value(0));
  // Which `cinemaId` param this screen has already acted on, so re-tapping the
  // same Discover result (or the param simply persisting across renders)
  // doesn't fight someone who has since picked a different cinema by hand.
  const [appliedCinemaId, setAppliedCinemaId] = useState<string | undefined>();

  // Keeps typing smooth: the list re-searches at a lower priority than the input.
  const deferredCinemaQuery = useDeferredValue(cinemaQuery);

  useEffect(() => {
    if (!searchOpen) return;
    searchAnim.setValue(0);
    Animated.timing(searchAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [searchOpen, searchAnim]);

  // Closing clears the query too — same "Cancel" semantics as a standard
  // search reveal, so a hidden field never leaves the list invisibly filtered.
  const toggleSearch = useCallback(() => {
    setSearchOpen((open) => {
      const next = !open;
      if (!next) setCinemaQuery('');
      return next;
    });
  }, []);

  const cinemas = useCinemas({ search: deferredCinemaQuery });
  const showtimes = useCinemaShowtimes(chosen?._id);

  const refetch = chosen ? showtimes.refetch : cinemas.refetch;
  const { refreshing, onRefresh } = useRefresh(refetch);

  // Tabs stay mounted when you switch away in Expo Router, so nothing else
  // re-fetches this on its own when you come back — the "Today" bucket would
  // otherwise still reflect whatever wall-clock day it was when this cinema
  // was first opened, hours or a tab-switch ago.
  useFocusEffect(
    useCallback(() => {
      if (chosen) showtimes.refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch is stable per query key; only a newly chosen cinema should re-arm this.
    }, [chosen]),
  );

  // Arriving here with a `cinemaId` (from a Discover search result) re-syncs
  // `chosen` during render, same trick `discover.tsx` uses for its category
  // param — it just also has to wait for the list to actually contain the
  // match, which it does for free: react-query re-renders this component
  // itself once the fetch resolves, and this check runs again then.
  if (params.cinemaId && params.cinemaId !== appliedCinemaId) {
    const match = cinemas.cinemas.find((c) => c._id === params.cinemaId);
    if (match) {
      setAppliedCinemaId(params.cinemaId);
      setChosen(match);
      setDay('today');
      setLaterDate(null);
      setCard(0);
    }
  }

  // Not memoized on `showtimes.showtimes`: react-query's structural sharing
  // keeps that array's identity unchanged across a refetch that returned the
  // same data, which would freeze "today" at whichever day it was computed on
  // — memoizing here would silently undo the two fixes above. `buildSchedule`
  // is a single cheap pass, so recomputing it every render just keeps the
  // today/tomorrow boundary honest against the actual current time.
  const schedule = buildSchedule(showtimes.showtimes);
  const laterDay = laterDate ? schedule.laterDays.find((d) => d.date === laterDate) : undefined;
  const entries =
    day === 'today' ? schedule.today : day === 'tomorrow' ? schedule.tomorrow : (laterDay?.entries ?? []);
  const visible = entries[Math.min(card, Math.max(entries.length - 1, 0))];

  // The date this window's showtimes actually fall on, so opening a film
  // carries it forward — the booking sheet only ever offers this one day.
  const selectedDate = day === 'today' ? todayKey() : day === 'tomorrow' ? tomorrowKey() : laterDate;

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

  const pickLaterDate = useCallback((date: string) => {
    setLaterDate(date);
    setDay('later');
    setCard(0);
    setLaterSheetVisible(false);
  }, []);

  const renderCinema = useCallback(
    ({ item }: { item: Cinema }) => (
      <CinemaRow
        cinema={item}
        selected={item._id === chosen?._id}
        onPress={(next) => {
          setChosen(next);
          setDay('today');
          setLaterDate(null);
          setCard(0);
        }}
      />
    ),
    [chosen?._id],
  );

  const topPadding = insets.top + Spacing.sm;
  const bottomPadding = tabBarClearance(insets.bottom);
  // The picker's `GlassHeader` floats over the list (see its own
  // `position: absolute`), so content here has to clear its full height —
  // `topPadding` alone left the search bar and the first row rendering
  // underneath it.
  const pickerContentTop = insets.top + HEADER_CONTENT_HEIGHT + Spacing.md;

  // ── cinema picker ────────────────────────────────────────────────────────
  if (!chosen) {
    return (
      <View style={styles.screen}>
        <Backdrop />
        <GlassHeader
          title="Cinema"
          right={
            <GlassIconButton
              icon={searchOpen ? 'close' : 'search'}
              accessibilityLabel={searchOpen ? 'Close search' : 'Search cinemas'}
              onPress={toggleSearch}
            />
          }
        />
        {cinemas.isLoading ? (
          <View style={[styles.centre, { paddingTop: pickerContentTop }]}>
            <ActivityIndicator size="large" color="#FFFFFF" />
          </View>
        ) : (
          <FlatList
            data={cinemas.cinemas}
            keyExtractor={(cinema) => cinema._id}
            renderItem={renderCinema}
            contentContainerStyle={[
              styles.list,
              { paddingTop: pickerContentTop, paddingBottom: bottomPadding },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshControl={<PageRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListHeaderComponent={
              searchOpen ? (
                <Animated.View style={[styles.pickerHead, { opacity: searchAnim }]}>
                  <Surface radius={Radius.pill} tone="muted" style={styles.searchBar}>
                    <Ionicons name="search" size={18} color={PLACEHOLDER} />
                    <TextInput
                      autoFocus
                      value={cinemaQuery}
                      onChangeText={setCinemaQuery}
                      placeholder="Search cinemas, cities"
                      placeholderTextColor={PLACEHOLDER}
                      style={styles.searchInput}
                      returnKeyType="search"
                      autoCorrect={false}
                      clearButtonMode="while-editing"
                    />
                    {cinemaQuery.length > 0 ? (
                      <Touchable
                        accessibilityRole="button"
                        accessibilityLabel="Clear search"
                        onPress={() => setCinemaQuery('')}
                        pressedScale={0.9}>
                        <Ionicons name="close-circle" size={18} color={PLACEHOLDER} />
                      </Touchable>
                    ) : null}
                  </Surface>
                </Animated.View>
              ) : null
            }
            ListEmptyComponent={
              cinemas.isError ? (
                <ErrorState message={cinemas.error?.message} onRetry={() => cinemas.refetch()} />
              ) : cinemaQuery ? (
                <EmptyState
                  icon="search-outline"
                  title="No cinemas found"
                  message={`Nothing matches "${cinemaQuery}". Try a different search.`}
                />
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
  const dayLabel = day === 'today' ? 'TODAY' : day === 'tomorrow' ? 'TOMORROW' : (laterDay?.label ?? 'COMING SOON');

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

        <DayRail
          active={day}
          todayCount={schedule.today.length}
          tomorrowCount={schedule.tomorrow.length}
          laterLabel={laterDay?.label ?? 'Coming Soon'}
          laterCount={laterDay?.entries.length ?? 0}
          onSelectToday={() => pickDay('today')}
          onSelectTomorrow={() => pickDay('tomorrow')}
          onOpenLater={() => setLaterSheetVisible(true)}
        />

        <Text variant="display" style={styles.headline} numberOfLines={1}>
          {headlineDate(visible?.startsAt) || dayLabel}
        </Text>
        {/* Bottom hairline divider so the card-area has a clear floor */}
      </View>

      {/* The stage measures its own height so we can give the deck an exact
          pixel budget that ends above the floating tab bar. */}
      <View style={[styles.stage, { paddingBottom: bottomPadding }]} onLayout={onStage}>
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
            // The card sizes itself off its own 2:3 poster aspect ratio; this
            // just keeps it from overflowing a short screen.
            maxHeight={stage.height}
            onIndexChange={setCard}
            onOpen={(entry) =>
              router.push({
                pathname: '/movie/[id]',
                params: { id: entry.movie._id, cinemaId: chosen._id, date: selectedDate ?? '' },
              })
            }
          />
        ) : null}
      </View>

      {/* Showtime list is now overlaid on the poster card itself via chips */}

      <ComingSoonSheet
        visible={laterSheetVisible}
        onClose={() => setLaterSheetVisible(false)}
        days={schedule.laterDays}
        selectedDate={laterDate}
        onSelect={pickLaterDate}
      />
    </View>
  );
}

/**
 * Full-bleed blurred poster wash behind all content.
 *
 * The gradient has a light touch in the middle of the screen so the poster's
 * own colours show through clearly — exactly the effect in the reference image.
 * The top and bottom fade darker so the chrome and stage floor stay legible.
 */
function Backdrop({ poster }: { poster?: string | null }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Near-black ground — visible before the image loads and at the edges */}
      <View style={styles.ground} />
      {poster ? (
        <Image
          source={{ uri: poster }}
          style={[StyleSheet.absoluteFill, styles.wash]}
          contentFit="cover"
          blurRadius={30}
          transition={400}
          cachePolicy="memory-disk"
        />
      ) : null}
      {/* Single gradient: dark at the very top (status bar legibility) →
          nearly transparent in the mid section (poster colour shows through) →
          solid dark at the very bottom (stage floor). */}
      <LinearGradient
        colors={[
          'rgba(8,8,10,0.70)',  // top — status bar
          'rgba(8,8,10,0.10)',  // upper-mid — poster shows
          'rgba(8,8,10,0.10)',  // lower-mid — poster shows
          'rgba(8,8,10,0.88)',  // bottom — blends into stage
          '#08080A',            // floor
        ]}
        locations={[0, 0.22, 0.6, 0.82, 1]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

function emptyTitle(day: DayKey): string {
  if (day === 'today') return 'Nothing on today';
  if (day === 'tomorrow') return 'Nothing on tomorrow';
  return 'Nothing announced yet';
}


const styles = StyleSheet.create({
  screen: { flex: 1 },
  ground: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#08080A',
  },
  // The blurred poster image — full screen, slightly dimmed.
  // Lower opacity means the poster colour bleeds through more vibrantly.
  wash: { opacity: 0.85 },

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
    fontSize: 44,
    lineHeight: 48,
    letterSpacing: -1.6,
    paddingHorizontal: Spacing.lg,
    textAlign: 'center',
    fontWeight: '800',
  },

  // Horizontal padding shrinks the stage on both sides so the deck floats
  // off the screen edges. Centered rather than stretched: the deck sizes
  // itself off the poster's own aspect ratio, so this is what gives it the
  // generous dark space above and below that a stretched card wouldn't have.
  stage: { flex: 1, paddingHorizontal: Spacing.lg, justifyContent: 'center', alignItems: 'center' },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  list: { paddingHorizontal: Spacing.lg, gap: Spacing.md },
  pickerHead: { paddingBottom: Spacing.md },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    height: 42,
  },
  searchInput: { flex: 1, fontSize: 15, padding: 0, color: '#FFFFFF' },
});
