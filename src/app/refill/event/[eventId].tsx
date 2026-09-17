import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { BasketFooter } from '@/components/refill/basket-footer';
import { BeverageLine } from '@/components/refill/beverage-line';
import { CatalogHero } from '@/components/refill/catalog-hero';
import { RefillCheckoutSheet } from '@/components/refill/refill-checkout-sheet';
import { AmbientBackground } from '@/components/ui/ambient-background';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/state-views';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useGoBack } from '@/hooks/use-go-back';
import { formatTicketDate } from '@/lib/date';
import { useEventBeverageCatalog } from '@/queries/beverages';
import type { RefillBeverageItem } from '@/types/api';

const SKELETON_ROWS = [0, 1, 2];

/** The buyable line-up for one event — reached only from the Refill page's Events tab. */
export default function EventRefillScreen() {
  const { eventId, cover } = useLocalSearchParams<{ eventId: string; cover?: string }>();
  const goBack = useGoBack('/(tabs)/refill');

  const { items, event, isLoading, isError, error, refetch } = useEventBeverageCatalog(eventId);
  const [quantities, setQuantities] = useState<Map<string, number>>(() => new Map());
  const [checkoutVisible, setCheckoutVisible] = useState(false);

  const changeQuantity = (itemId: string, quantity: number) => {
    setQuantities((current) => {
      const next = new Map(current);
      if (quantity > 0) next.set(itemId, quantity);
      else next.delete(itemId);
      return next;
    });
  };

  const { itemCount, total } = useMemo(() => {
    let count = 0;
    let sum = 0;
    for (const item of items) {
      const q = quantities.get(item.id) ?? 0;
      if (q > 0) {
        count += q;
        sum += q * item.price;
      }
    }
    return { itemCount: count, total: sum };
  }, [items, quantities]);

  const basketLines = useMemo(() => {
    const byId = new Map(items.map((item) => [item.id, item]));
    return [...quantities.entries()]
      .map(([id, quantity]) => {
        const item = byId.get(id);
        return item ? { id, name: item.name, color: item.color, unitPrice: item.price, quantity } : null;
      })
      .filter((line): line is NonNullable<typeof line> => line !== null);
  }, [items, quantities]);

  return (
    <View style={styles.screen}>
      <AmbientBackground />

      <CatalogHero
        cover={cover || null}
        title={event?.title ?? 'Drinks'}
        subtitle={event?.startDate ? formatTicketDate(event.startDate) : undefined}
        onBack={goBack}
      />

      {isLoading ? (
        <View style={styles.list}>
          {SKELETON_ROWS.map((row) => (
            <LineSkeleton key={row} />
          ))}
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <ErrorState
            message={
              error instanceof ApiError
                ? error.message
                : 'We could not load the drinks for this event.'
            }
            onRetry={() => refetch()}
          />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }: { item: RefillBeverageItem }) => (
            <BeverageLine
              item={item}
              quantity={quantities.get(item.id) ?? 0}
              onChange={(q) => changeQuantity(item.id, q)}
            />
          )}
          ListHeaderComponent={
            <Text variant="label" color="textMuted" style={styles.sectionLabel}>
              MENU · {items.length} DRINK{items.length === 1 ? '' : 'S'}
            </Text>
          }
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {!isLoading && !isError ? (
        <BasketFooter
          itemCount={itemCount}
          total={total}
          currency={items[0]?.currency ?? 'ETB'}
          onCheckout={() => setCheckoutVisible(true)}
        />
      ) : null}

      {eventId ? (
        <RefillCheckoutSheet
          visible={checkoutVisible}
          onClose={() => setCheckoutVisible(false)}
          channel="event"
          ownerId={eventId}
          lines={basketLines}
          clientTotal={total}
          currency={items[0]?.currency ?? 'ETB'}
          summary={`${itemCount} item${itemCount === 1 ? '' : 's'} from ${event?.title ?? 'this event'}`}
        />
      ) : null}
    </View>
  );
}

function LineSkeleton() {
  return (
    <View style={styles.skeletonRow}>
      <Skeleton width={60} height={60} radius={Radius.md} />
      <View style={styles.skeletonText}>
        <Skeleton width="55%" height={16} />
        <Skeleton width="35%" height={12} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl },
  list: { padding: Spacing.lg, gap: Spacing.sm },
  sectionLabel: { marginBottom: Spacing.sm },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.sm },
  skeletonText: { flex: 1, gap: 6 },
});
