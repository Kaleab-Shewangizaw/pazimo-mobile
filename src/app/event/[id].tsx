import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Glass, Surface } from '@/components/ui/glass';
import { Touchable } from '@/components/ui/pressable';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/state-views';
import { Text } from '@/components/ui/text';
import { AspectRatio, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDateTime } from '@/lib/date';
import { eventCoverUrl } from '@/lib/media';
import {
  availableCurrencies,
  formatPrice,
  isSoldOut,
  isTierBuyable,
  tierUnitPrice,
} from '@/lib/pricing';
import { useEvent } from '@/queries/events';
import type { Currency, TicketTier } from '@/types/api';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: event, isLoading, isError, error, refetch } = useEvent(id);
  const [currency, setCurrency] = useState<Currency | null>(null);
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);

  const currencies = useMemo(
    () => (event ? availableCurrencies(event) : (['ETB'] as Currency[])),
    [event],
  );
  const activeCurrency = currency ?? currencies[0];

  const tiers = event?.ticketTypes ?? [];
  const soldOut = event ? isSoldOut(event) : false;
  const selectedTier = tiers.find((t) => t._id === selectedTierId) ?? null;

  const cover = eventCoverUrl(event?.coverImages);
  const organizer =
    typeof event?.organizer === 'object' && event.organizer
      ? (event.organizer.organizerProfile?.organization ??
        event.organizer.fullName ??
        [event.organizer.firstName, event.organizer.lastName].filter(Boolean).join(' '))
      : null;

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
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
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
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}>
        <View style={styles.heroWrap}>
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
            colors={['transparent', theme.background]}
            style={styles.heroFade}
            pointerEvents="none"
          />
        </View>

        <View style={styles.body}>
          {isLoading ? (
            <View style={styles.loadingBlock}>
              <Skeleton width="85%" height={26} />
              <Skeleton width="55%" height={14} />
              <Skeleton width="70%" height={14} />
              <Skeleton height={90} radius={Radius.lg} />
            </View>
          ) : event ? (
            <>
              <Text variant="heading">{event.title}</Text>

              {organizer ? (
                <Text variant="small" color="textSecondary">
                  by {organizer}
                </Text>
              ) : null}

              <Surface tone="muted" style={styles.factSheet}>
                <Fact
                  icon="calendar-outline"
                  label={formatDateTime(event.startDate, event.startTime)}
                />
                {venue ? <Fact icon="location-outline" label={venue} /> : null}
                {event.ageRestriction?.hasRestriction && event.ageRestriction.minAge ? (
                  <Fact icon="alert-circle-outline" label={`${event.ageRestriction.minAge}+ only`} />
                ) : null}
              </Surface>

              {event.description ? (
                <View style={styles.block}>
                  <Text variant="title">About</Text>
                  <Text variant="body" color="textSecondary" style={styles.description}>
                    {event.description}
                  </Text>
                </View>
              ) : null}

              <View style={styles.block}>
                <View style={styles.ticketsHeader}>
                  <Text variant="title">Tickets</Text>
                  {currencies.length > 1 ? (
                    <View style={[styles.currencyToggle, { backgroundColor: theme.surfaceMuted }]}>
                      {currencies.map((code) => {
                        const active = code === activeCurrency;
                        return (
                          <Touchable
                            key={code}
                            accessibilityRole="button"
                            accessibilityState={{ selected: active }}
                            onPress={() => setCurrency(code)}
                            pressedScale={0.95}
                            style={[
                              styles.currencyOption,
                              active && { backgroundColor: theme.brand },
                            ]}>
                            <Text
                              variant="caption"
                              style={{ color: active ? theme.onBrand : theme.textSecondary }}>
                              {code}
                            </Text>
                          </Touchable>
                        );
                      })}
                    </View>
                  ) : null}
                </View>

                {tiers.length === 0 ? (
                  <Text variant="small" color="textMuted">
                    No tickets have been published for this event yet.
                  </Text>
                ) : (
                  tiers.map((tier) => (
                    <TierRow
                      key={tier._id}
                      tier={tier}
                      currency={activeCurrency}
                      selected={tier._id === selectedTierId}
                      onSelect={() => setSelectedTierId(tier._id)}
                    />
                  ))
                )}
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>

      {/* Sticky purchase bar */}
      {event && tiers.length > 0 ? (
        <Glass
          variant="regular"
          intensity={70}
          radius={0}
          style={[styles.buyBar, { paddingBottom: insets.bottom + Spacing.md }]}>
          <View style={styles.buyInner}>
            <View style={styles.buyPrice}>
              <Text variant="caption" color="textMuted">
                {selectedTier ? selectedTier.name : 'From'}
              </Text>
              <Text variant="title">
                {selectedTier
                  ? formatPrice(tierUnitPrice(selectedTier, activeCurrency), activeCurrency)
                  : formatPrice(
                      Math.min(...tiers.map((t) => tierUnitPrice(t, activeCurrency))),
                      activeCurrency,
                    )}
              </Text>
            </View>
            <Button
              label={soldOut ? 'Sold out' : selectedTier ? 'Continue' : 'Select a ticket'}
              disabled={soldOut || !selectedTier}
              size="lg"
              style={styles.buyButton}
              onPress={() => {
                // Checkout is the next phase; the tier and currency are the
                // only state it needs carried across.
                router.push(
                  `/checkout/${event._id}?tier=${selectedTier?._id}&currency=${activeCurrency}`,
                );
              }}
            />
          </View>
        </Glass>
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

function TierRow({
  tier,
  currency,
  selected,
  onSelect,
}: {
  tier: TicketTier;
  currency: Currency;
  selected: boolean;
  onSelect: () => void;
}) {
  const theme = useTheme();
  const buyable = isTierBuyable(tier);
  // `quantity` is remaining stock — there is no separate sold/remaining field.
  const scarce = buyable && tier.quantity <= 10;

  return (
    <Touchable
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled: !buyable }}
      disabled={!buyable}
      onPress={onSelect}
      haptic
      style={[
        styles.tier,
        {
          backgroundColor: theme.surface,
          borderColor: selected ? theme.brand : theme.hairline,
          borderWidth: selected ? 1.5 : StyleSheet.hairlineWidth,
          opacity: buyable ? 1 : 0.55,
        },
      ]}>
      <View style={styles.tierMain}>
        <Text variant="callout" numberOfLines={1}>
          {tier.name}
        </Text>
        {tier.description ? (
          <Text variant="caption" color="textMuted" numberOfLines={2}>
            {tier.description}
          </Text>
        ) : null}
        {!buyable ? (
          <Text variant="caption" color="danger">
            Unavailable
          </Text>
        ) : scarce ? (
          <Text variant="caption" color="warning">
            Only {tier.quantity} left
          </Text>
        ) : null}
      </View>

      <View style={styles.tierRight}>
        <Text variant="callout" color="brand">
          {formatPrice(tierUnitPrice(tier, currency), currency)}
        </Text>
        <Ionicons
          name={selected ? 'radio-button-on' : 'radio-button-off'}
          size={20}
          color={selected ? theme.brand : theme.textMuted}
        />
      </View>
    </Touchable>
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
  heroWrap: { width: '100%', aspectRatio: AspectRatio.hero },
  heroFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 96 },
  body: { paddingHorizontal: Spacing.lg, marginTop: -Spacing.xl, gap: Spacing.sm },
  loadingBlock: { gap: Spacing.md },
  factSheet: { padding: Spacing.md, gap: Spacing.sm, marginTop: Spacing.md },
  fact: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  factText: { flex: 1 },
  block: { marginTop: Spacing.xl, gap: Spacing.md },
  description: { lineHeight: 22 },
  ticketsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  currencyToggle: { flexDirection: 'row', borderRadius: Radius.pill, padding: 3, gap: 2 },
  currencyOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
  },
  tier: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
  },
  tierMain: { flex: 1, gap: 2 },
  tierRight: { alignItems: 'flex-end', gap: Spacing.xs },
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
