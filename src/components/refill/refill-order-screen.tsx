import { Ionicons } from '@expo/vector-icons';
import { type ReactNode, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RefillOrderView } from '@/components/refill/refill-order-view';
import { ShareItemSheet } from '@/components/shares/share-item-sheet';
import { Button } from '@/components/ui/button';
import { Touchable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { RefillOrder } from '@/types/api';

/** `CinemaTicketScreen`'s refill counterpart — chrome around `RefillOrderView`. */

export type RefillOrderScreenProps = {
  order: RefillOrder;
  onDone: () => void;
  children?: (card: ReactNode) => ReactNode;
};

export function RefillOrderScreen({ order, onDone, children }: RefillOrderScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [shareVisible, setShareVisible] = useState(false);

  const nothingToSend = useMemo(
    () => order.sales.every((sale) => sale.status === 'refunded' || sale.redeemedAt),
    [order.sales],
  );

  if (!order.sales.length) return null;

  const body = (
    <View style={styles.single}>
      <RefillOrderView order={order} />
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.headerSpacer} />
        <Text variant="title" numberOfLines={1} style={styles.headerTitle}>
          {order.sales.length > 1 ? 'Your drinks' : 'Your drink'}
        </Text>
        <Touchable
          accessibilityRole="button"
          accessibilityLabel="Send to a friend"
          accessibilityState={{ disabled: nothingToSend }}
          disabled={nothingToSend}
          onPress={() => setShareVisible(true)}
          pressedScale={0.9}
          style={[styles.headerButton, nothingToSend ? styles.headerButtonDisabled : null]}>
          <Ionicons name="paper-plane-outline" size={20} color="#FFFFFF" />
        </Touchable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {children ? children(body) : body}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
        <Button label="Done" size="lg" onPress={onDone} style={styles.done} />
      </View>

      <ShareItemSheet visible={shareVisible} onClose={() => setShareVisible(false)} forcedKind="BEVERAGE" />
    </View>
  );
}

const HEADER_BUTTON = 36;

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  headerSpacer: { width: HEADER_BUTTON },
  headerTitle: { flex: 1, textAlign: 'center' },
  headerButton: {
    width: HEADER_BUTTON,
    height: HEADER_BUTTON,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonDisabled: { opacity: 0.35 },

  content: { paddingTop: Spacing.sm, paddingBottom: Spacing.xxxl },
  single: { paddingHorizontal: Spacing.lg },

  footer: { paddingHorizontal: Spacing.lg },
  done: { width: '100%' },
});
