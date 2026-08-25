import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CinemaCheckoutSheet } from '@/components/cinema/cinema-checkout-sheet';
import { SeatMap } from '@/components/cinema/seat-map';
import { Button } from '@/components/ui/button';
import { GlassIconButton } from '@/components/ui/glass-button';
import { Touchable } from '@/components/ui/pressable';
import { ErrorState } from '@/components/ui/state-views';
import { Stepper } from '@/components/ui/stepper';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useGoBack } from '@/hooks/use-go-back';
import { useTheme } from '@/hooks/use-theme';
import { formatPrice } from '@/lib/pricing';
import { useShowtimeSeats } from '@/queries/cinema-checkout';
import { useCinemaBookingStore, type SelectedSeat } from '@/stores/use-cinema-booking-store';
import type { CinemaSeat } from '@/types/api';

/** The server's own cap — mirrored here for a responsive no-op, not enforced here. */
const MAX_SEATS = 10;

export default function SeatsScreen() {
  const { showtimeId } = useLocalSearchParams<{ showtimeId: string }>();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const goBack = useGoBack();

  const store = useCinemaBookingStore();
  const { seatMap, isLoading, isError, refetch } = useShowtimeSeats(showtimeId);

  const [selected, setSelected] = useState<SelectedSeat[]>([]);
  const [ticketTypeId, setTicketTypeId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [notice, setNotice] = useState<string | null>(null);
  const [checkoutVisible, setCheckoutVisible] = useState(false);

  // Covers a deep link straight into this route without going through the
  // movie page first, where the booking store would still be empty.
  const bookingReady = store.showtimeId === showtimeId;

  // Drops any local selection that got taken out from under the buyer while
  // they were on snacks/payment, whether that's discovered by a fresh fetch
  // on refocus or reported directly by a failed checkout (`onSeatConflict`).
  const syncSeatAvailability = useCallback(async () => {
    const result = await refetch();
    const map = result.data;
    if (!map || !map.assignedSeating) return;
    const stillAvailable = new Set(
      map.rows.flatMap((row) =>
        row.seats.filter((s) => s.status !== 'sold' && s.status !== 'held').map((s) => s.seatKey),
      ),
    );
    setSelected((current) => {
      const kept = current.filter((s) => stillAvailable.has(s.seatKey));
      if (kept.length !== current.length) {
        setNotice('Someone took one of your seats — pick again.');
      }
      return kept;
    });
  }, [refetch]);

  // Snacks/payment happen in a sheet over this screen, not a separate route,
  // so this only re-fires on a real navigation back onto this screen (e.g.
  // from a failed order) — a seat conflict discovered while paying is
  // synced explicitly in `onSeatConflict` below instead.
  useFocusEffect(
    useCallback(() => {
      syncSeatAvailability();
      // eslint-disable-next-line react-hooks/exhaustive-deps -- syncSeatAvailability is stable per showtimeId.
    }, [showtimeId]),
  );

  const onSeatConflict = useCallback(() => {
    setCheckoutVisible(false);
    syncSeatAvailability();
  }, [syncSeatAvailability]);

  const categoryByKey = useMemo(
    () =>
      new Map(
        seatMap && seatMap.assignedSeating ? seatMap.categories.map((c) => [c.key, c]) : [],
      ),
    [seatMap],
  );

  const onToggleSeat = useCallback(
    (seat: CinemaSeat) => {
      setNotice(null);
      setSelected((current) => {
        const already = current.find((s) => s.seatKey === seat.seatKey);
        if (already) return current.filter((s) => s.seatKey !== seat.seatKey);
        if (current.length >= MAX_SEATS) {
          setNotice(`You can pick up to ${MAX_SEATS} seats per order.`);
          return current;
        }
        const category = categoryByKey.get(seat.categoryKey);
        if (!category?.ticketTypeId || category.price == null) return current;
        return [
          ...current,
          {
            seatKey: seat.seatKey,
            row: seat.seatKey.slice(0, seat.seatKey.lastIndexOf('-')),
            number: seat.number,
            categoryKey: seat.categoryKey,
            categoryLabel: category.label,
            ticketTypeId: category.ticketTypeId,
            price: category.price,
          },
        ];
      });
    },
    [categoryByKey],
  );

  const selectedTier = store.ticketTypes.find((t) => t._id === ticketTypeId) ?? store.ticketTypes[0];

  const total =
    seatMap?.assignedSeating === false
      ? (selectedTier?.price ?? 0) * quantity
      : selected.reduce((sum, s) => sum + s.price, 0);

  const canContinue =
    seatMap?.assignedSeating === false ? Boolean(selectedTier) && quantity > 0 : selected.length > 0;

  const onContinue = useCallback(() => {
    if (!seatMap) return;
    if (seatMap.assignedSeating === false) {
      if (!selectedTier) return;
      store.setUnassignedSelection(selectedTier._id, quantity);
    } else {
      store.setSeats(selected);
    }
    setCheckoutVisible(true);
  }, [seatMap, selectedTier, quantity, selected, store]);

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <GlassIconButton icon="arrow-back" accessibilityLabel="Go back" onPress={goBack} />
        <View style={styles.headerTitles}>
          <Text variant="title" numberOfLines={1}>
            {store.movieTitle ?? 'Select seats'}
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {!bookingReady ? (
        <ErrorState
          message="This booking didn't start from the movie page. Go back and pick a showtime."
          onRetry={goBack}
        />
      ) : isLoading ? (
        <View style={styles.centre}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      ) : isError || !seatMap ? (
        <ErrorState message="We couldn't load the seat map." onRetry={() => refetch()} />
      ) : seatMap.assignedSeating === true && seatMap.needsRepricing ? (
        <ErrorState message="This screening isn't bookable online yet. Please check back later." />
      ) : (
        <>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.body}>
            {seatMap.assignedSeating === false ? (
              <UnassignedPicker
                tiers={store.ticketTypes}
                selectedId={selectedTier?._id ?? null}
                onSelectTier={setTicketTypeId}
                quantity={quantity}
                onChangeQuantity={setQuantity}
              />
            ) : (
              <SeatMap
                categories={seatMap.categories}
                rows={seatMap.rows}
                selectedKeys={selected.map((s) => s.seatKey)}
                onToggle={onToggleSeat}
              />
            )}
            {notice ? (
              <Text variant="caption" color="warning" style={styles.notice}>
                {notice}
              </Text>
            ) : null}
          </ScrollView>

          <View
            style={[
              styles.bar,
              { paddingBottom: insets.bottom + Spacing.md, borderTopColor: theme.hairline },
            ]}>
            <View style={styles.barInfo}>
              <Text variant="small" color="textSecondary">
                {seatMap.assignedSeating === false
                  ? `${quantity} × ${selectedTier?.name ?? 'ticket'}`
                  : `${selected.length} seat${selected.length === 1 ? '' : 's'}`}
              </Text>
              <Text variant="callout">{formatPrice(total, 'ETB')}</Text>
            </View>
            <Button
              label="Continue"
              size="lg"
              disabled={!canContinue}
              onPress={onContinue}
              style={styles.barButton}
            />
          </View>
        </>
      )}

      <CinemaCheckoutSheet
        visible={checkoutVisible}
        onClose={() => setCheckoutVisible(false)}
        showtimeId={showtimeId}
        onSeatConflict={onSeatConflict}
      />
    </View>
  );
}

function UnassignedPicker({
  tiers,
  selectedId,
  onSelectTier,
  quantity,
  onChangeQuantity,
}: {
  tiers: { _id: string; name: string; price: number; seatsRemaining: number }[];
  selectedId: string | null;
  onSelectTier: (id: string) => void;
  quantity: number;
  onChangeQuantity: (value: number) => void;
}) {
  const theme = useTheme();
  const activeId = selectedId ?? tiers[0]?._id ?? null;
  const selectedTier = tiers.find((t) => t._id === activeId);

  return (
    <View style={styles.unassigned}>
      <Text variant="label" color="textMuted">
        GENERAL ADMISSION
      </Text>
      <View style={styles.tierRow}>
        {tiers.map((tier) => {
          const active = tier._id === activeId;
          return (
            <Touchable
              key={tier._id}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              onPress={() => onSelectTier(tier._id)}
              haptic
              pressedScale={0.96}
              style={[
                styles.tierChip,
                {
                  backgroundColor: active ? theme.brand : 'rgba(255,255,255,0.06)',
                  borderColor: active ? theme.brand : theme.hairline,
                },
              ]}>
              <Text
                variant="small"
                style={{ color: active ? theme.onBrand : theme.text }}>
                {tier.name} · {formatPrice(tier.price, 'ETB')}
              </Text>
            </Touchable>
          );
        })}
      </View>
      {selectedTier ? (
        <View style={styles.qtyRow}>
          <Text variant="small" color="textSecondary">
            Tickets
          </Text>
          <Stepper
            value={quantity}
            min={1}
            max={Math.max(1, selectedTier.seatsRemaining)}
            onChange={onChangeQuantity}
            accessibilityLabel="ticket"
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  headerTitles: { flex: 1 },
  headerSpacer: { width: 38 },

  body: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.xxxl, gap: Spacing.lg },
  notice: { textAlign: 'center' },

  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  barInfo: { flex: 1, gap: 2 },
  barButton: { minWidth: 160 },

  unassigned: { gap: Spacing.md },
  tierRow: { gap: Spacing.sm },
  tierChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
});
