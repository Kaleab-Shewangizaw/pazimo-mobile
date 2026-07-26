import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Dimensions, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError } from '@/api/client';
import { TicketSheet } from '@/components/event/ticket-sheet';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Glass } from '@/components/ui/glass';
import { Touchable } from '@/components/ui/pressable';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/state-views';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useGoBack } from '@/hooks/use-go-back';
import { useTheme } from '@/hooks/use-theme';
import { formatDateTime } from '@/lib/date';
import { eventCoverUrl, resolveImageUrl } from '@/lib/media';
import { organizerDisplayName } from '@/lib/organizer';
import { availableCurrencies, isSoldOut } from '@/lib/pricing';
import { useEvent } from '@/queries/events';
import type { Currency } from '@/types/api';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const router = useRouter();
  const goBack = useGoBack();
  const insets = useSafeAreaInsets();

  const { data: event, isLoading, isError, error, refetch } = useEvent(id);
  const [currency, setCurrency] = useState<Currency | null>(null);
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  const currencies = useMemo(
    () => (event ? availableCurrencies(event) : (['ETB'] as Currency[])),
    [event],
  );
  const activeCurrency = currency ?? currencies[0];

  const tiers = event?.ticketTypes ?? [];
  const soldOut = event ? isSoldOut(event) : false;

  const cover = eventCoverUrl(event?.coverImages);
  const organizer = event ? organizerDisplayName(event) : null;

  const gallery = (event?.eventImages ?? [])
    .map((img) => resolveImageUrl(img.url))
    .filter((uri): uri is string => Boolean(uri));

  const venue = [event?.location?.address, event?.location?.city, event?.location?.country]
    .filter(Boolean)
    .join(', ');

  // Date leads — it's the fact people decide on — with the age gate riding
  // along so restrictions are seen before anyone reaches the buy button.
  const eyebrow = event
    ? [
        formatDateTime(event.startDate, event.startTime),
        event.ageRestriction?.hasRestriction && event.ageRestriction.minAge
          ? `${event.ageRestriction.minAge}+`
          : null,
      ]
        .filter(Boolean)
        .join(' · ')
        .toUpperCase()
    : null;

  if (isError) {
    return (
      <View style={[styles.screen, styles.centered, { backgroundColor: theme.background }]}>
        <ErrorState
          message={error instanceof ApiError ? error.message : undefined}
          onRetry={() => refetch()}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Fixed backdrop — the photo stays put behind the whole scroll, like a
          wallpaper, rather than scrolling away with the hero. */}
      <View style={StyleSheet.absoluteFill}>
        {cover ? (
          <Image
            source={{ uri: cover }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={220}
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.surfaceMuted }]} />
        )}
        {/*
          Content is anchored to the bottom of the screen below (not wherever
          it happens to end), so the darkest part of this gradient needs to
          cover that whole region — otherwise short content (no gallery, a
          one-line description) leaves a stretch of undimmed photo with
          nothing on it, which reads as broken rather than spacious.
        */}
        <LinearGradient
          colors={['rgba(2,2,3,0.30)', 'rgba(2,2,3,0.42)', 'rgba(2,2,3,0.80)', 'rgba(2,2,3,0.97)']}
          locations={[0, 0.28, 0.5, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      </View>

      {/* Floating chrome — text sits directly on the photo below, so these stay
          understated (no border, light blur) rather than reading as UI chrome. */}
      <View style={[styles.chrome, { top: insets.top + Spacing.sm }]}>
        <Glass
          variant="clear"
          intensity={20}
          bordered={false}
          radius={Radius.pill}
          style={styles.chromeButton}>
          <Touchable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={goBack}
            pressedScale={0.9}
            style={styles.chromeHit}>
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </Touchable>
        </Glass>

        <Glass
          variant="clear"
          intensity={20}
          bordered={false}
          radius={Radius.pill}
          style={styles.chromeButton}>
          <Touchable
            accessibilityRole="button"
            accessibilityLabel="Share this event"
            onPress={() => {
              if (event) {
                Share.share({ message: `${event.title} — on Pazimo` }).catch(() => {
                  // User dismissed the sheet; nothing to recover from.
                });
              }
            }}
            pressedScale={0.9}
            style={styles.chromeHit}>
            <Ionicons name="share-outline" size={20} color="#FFFFFF" />
          </Touchable>
        </Glass>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + Spacing.xxl,
            paddingBottom: insets.bottom + 120,
            minHeight: SCREEN_HEIGHT,
          },
        ]}>
        {isLoading ? (
          <View style={styles.loadingBlock}>
            <Skeleton width="40%" height={12} />
            <Skeleton width="85%" height={30} />
            <Skeleton width="55%" height={14} />
          </View>
        ) : event ? (
          <>
            {/* Identity block — when, what, where. One left rail; the type
                scale alone carries the hierarchy, no cards or icons. */}
            <View style={styles.headerBlock}>
              {eyebrow ? (
                <Text variant="label" style={styles.eyebrow}>
                  {eyebrow}
                </Text>
              ) : null}
              <Text variant="display" style={styles.title}>
                {event.title}
              </Text>
              {venue ? (
                <View style={styles.venueRow}>
                  <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.65)" />
                  <Text variant="small" style={styles.venue}>
                    {venue}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* A short rule, not a full-width divider — it marks the seam
                between identity above and narrative below without slicing
                the composition in half. */}
            <View style={styles.rule} />

            <View style={styles.bodyBlock}>
              {organizer ? (
                <Text variant="callout" style={styles.hostedBy}>
                  Hosted by {organizer}
                </Text>
              ) : null}

              {event.description ? (
                <Text variant="body" style={styles.description}>
                  {event.description}
                </Text>
              ) : null}

              {event.tags?.length ? (
                <View style={styles.tagRow}>
                  {event.tags.map((tag) => (
                    <Chip key={tag} label={tag} variant="glass" />
                  ))}
                </View>
              ) : null}
            </View>

            {gallery.length ? (
              <View style={styles.gallerySection}>
                <Text variant="label" style={styles.galleryTitle}>
                  GALLERY
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.galleryRow}>
                  {gallery.map((uri, index) => (
                    <View key={uri + index} style={styles.galleryThumbWrap}>
                      <Image
                        source={{ uri }}
                        style={styles.galleryThumb}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        transition={150}
                      />
                    </View>
                  ))}
                </ScrollView>
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>

      {/* The only solid-white element on the screen — everything above is
          transparent or dimmed, so the action reads instantly. */}
      {event && tiers.length > 0 ? (
        <View style={[styles.buyBar, { paddingBottom: insets.bottom + Spacing.md }]}>
          <Button
            label={
              soldOut
                ? 'Sold out'
                : `Buy Now `
            }
            disabled={soldOut}
            size="lg"
            style={styles.buyButton}
            onPress={() => setSheetVisible(true)}
          />
        </View>
      ) : null}

      {event ? (
        <TicketSheet
          visible={sheetVisible}
          onClose={() => setSheetVisible(false)}
          tiers={tiers}
          currency={activeCurrency}
          currencies={currencies}
          onChangeCurrency={setCurrency}
          selectedTierId={selectedTierId}
          onSelectTier={setSelectedTierId}
          onContinue={() => {
            setSheetVisible(false);
            router.push(`/checkout/${event._id}?tier=${selectedTierId}&currency=${activeCurrency}`);
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { justifyContent: 'center' },
  chrome: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    zIndex: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chromeButton: { width: 36, height: 36 },
  chromeHit: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xl,
    justifyContent: 'flex-end',
  },
  loadingBlock: { gap: Spacing.md },
  headerBlock: { gap: Spacing.sm },
  eyebrow: { color: 'rgba(255,255,255,0.72)', letterSpacing: 1.4 },
  title: { color: '#FFFFFF' },
  venueRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  venue: { color: 'rgba(255,255,255,0.65)', flexShrink: 1 },
  rule: {
    width: 32,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  bodyBlock: { gap: Spacing.sm },
  hostedBy: { color: '#FFFFFF' },
  description: { lineHeight: 23, color: 'rgba(255,255,255,0.78)' },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  gallerySection: { gap: Spacing.md },
  galleryTitle: { color: 'rgba(255,255,255,0.55)', letterSpacing: 1.4 },
  galleryRow: { gap: Spacing.sm },
  galleryThumbWrap: {
    width: 140,
    height: 100,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  galleryThumb: { width: '100%', height: '100%' },
  buyBar: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: Spacing.lg },
  buyButton: { width: '100%' },
});
