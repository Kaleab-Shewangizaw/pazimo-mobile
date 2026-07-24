import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, Share, StyleSheet, View } from 'react-native';
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
import { useTheme } from '@/hooks/use-theme';
import { formatDateTime } from '@/lib/date';
import { eventCoverUrl, resolveImageUrl } from '@/lib/media';
import { organizerDisplayName } from '@/lib/organizer';
import { availableCurrencies, formatPrice, isSoldOut, tierUnitPrice } from '@/lib/pricing';
import { useEvent } from '@/queries/events';
import type { Currency } from '@/types/api';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const router = useRouter();
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
        <LinearGradient
          colors={['rgba(2,2,3,0.20)', 'rgba(2,2,3,0.55)', 'rgba(2,2,3,0.94)']}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      </View>

      {/* Floating chrome — glass is cheap here, these never recycle. */}
      <View style={[styles.chrome, { top: insets.top + Spacing.sm }]}>
        <Glass variant="clear" intensity={40} radius={Radius.pill} style={styles.chromeButton}>
          <Touchable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            pressedScale={0.9}
            style={styles.chromeHit}>
            <Ionicons name="chevron-back" size={22} color={theme.text} />
          </Touchable>
        </Glass>

        <Glass variant="clear" intensity={40} radius={Radius.pill} style={styles.chromeButton}>
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
            <Ionicons name="share-outline" size={20} color={theme.text} />
          </Touchable>
        </Glass>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + Spacing.xxl + Spacing.xl, paddingBottom: insets.bottom + 140 },
        ]}>
        {isLoading ? (
          <Glass variant="regular" intensity={50} radius={Radius.xl} style={styles.card}>
            <View style={styles.loadingBlock}>
              <Skeleton width="85%" height={26} />
              <Skeleton width="55%" height={14} />
              <Skeleton width="70%" height={14} />
            </View>
          </Glass>
        ) : event ? (
          <>
            <Glass variant="regular" intensity={50} radius={Radius.xl} style={styles.card}>
              <Text variant="heading">{event.title}</Text>
              {organizer ? (
                <Text variant="small" color="textSecondary">
                  Hosted by {organizer}
                </Text>
              ) : null}

              <View style={styles.factsBlock}>
                <Fact
                  icon="calendar-outline"
                  label={formatDateTime(event.startDate, event.startTime)}
                />
                {venue ? <Fact icon="location-outline" label={venue} /> : null}
                {event.ageRestriction?.hasRestriction && event.ageRestriction.minAge ? (
                  <Fact
                    icon="alert-circle-outline"
                    label={`${event.ageRestriction.minAge}+ only`}
                  />
                ) : null}
              </View>
            </Glass>

            {event.description || event.tags?.length ? (
              <Glass variant="regular" intensity={50} radius={Radius.xl} style={styles.card}>
                <Text variant="title">About</Text>
                {event.description ? (
                  <Text variant="body" color="textSecondary" style={styles.description}>
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
              </Glass>
            ) : null}

            {gallery.length ? (
              <View style={styles.gallerySection}>
                <Text variant="title" style={styles.galleryTitle}>
                  Gallery
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

      {/* Buy bar — always opens the ticket sheet; tier selection lives there. */}
      {event && tiers.length > 0 ? (
        <Glass
          variant="regular"
          intensity={70}
          radius={0}
          style={[styles.buyBar, { paddingBottom: insets.bottom + Spacing.md }]}>
          <View style={styles.buyInner}>
            <View style={styles.buyPrice}>
              <Text variant="caption" color="textMuted">
                From
              </Text>
              <Text variant="title">
                {formatPrice(
                  Math.min(...tiers.map((t) => tierUnitPrice(t, activeCurrency))),
                  activeCurrency,
                )}
              </Text>
            </View>
            <Button
              label={soldOut ? 'Sold out' : 'Buy Ticket'}
              disabled={soldOut}
              size="lg"
              style={styles.buyButton}
              onPress={() => setSheetVisible(true)}
            />
          </View>
        </Glass>
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

function Fact({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  const theme = useTheme();
  return (
    <View style={styles.fact}>
      <Ionicons name={icon} size={17} color={theme.brand} />
      <Text variant="small" color="textSecondary" style={styles.factText}>
        {label}
      </Text>
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
  chromeButton: { width: 40, height: 40 },
  chromeHit: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingHorizontal: Spacing.lg, gap: Spacing.lg },
  card: { padding: Spacing.lg, gap: Spacing.sm },
  loadingBlock: { gap: Spacing.md },
  factsBlock: { gap: Spacing.sm, marginTop: Spacing.sm },
  fact: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  factText: { flex: 1 },
  description: { lineHeight: 22, marginTop: 2 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginTop: Spacing.sm },
  gallerySection: { gap: Spacing.sm },
  galleryTitle: { paddingHorizontal: Spacing.xs },
  galleryRow: { gap: Spacing.sm, paddingHorizontal: Spacing.xs },
  galleryThumbWrap: {
    width: 140,
    height: 100,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  galleryThumb: { width: '100%', height: '100%' },
  buyBar: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  buyInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  buyPrice: { flex: 1 },
  buyButton: { flexGrow: 1, maxWidth: 200 },
});
