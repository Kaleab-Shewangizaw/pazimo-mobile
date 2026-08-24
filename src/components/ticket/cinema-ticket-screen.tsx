import { type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CinemaTicketView } from '@/components/ticket/cinema-ticket-view';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { CinemaOrder } from '@/types/api';

/**
 * `TicketScreen`'s cinema counterpart — but one card for the whole order
 * rather than a pager over one card per seat. `CinemaTicketView` already
 * folds every seat's QR and the order's snacks onto that single card, so this
 * screen is just the chrome around it: header, reveal wrapper, a Done button.
 *
 * Download/share is intentionally not here yet — closing the loop this screen
 * exists for (pay → see a scannable ticket) doesn't need it, and the event
 * side's version (`useTicketDownload`/`TicketPoster`) is real plumbing worth
 * adding on its own pass rather than folding in here.
 */

export type CinemaTicketScreenProps = {
  order: CinemaOrder;
  onDone: () => void;
  children?: (ticket: ReactNode) => ReactNode;
};

export function CinemaTicketScreen({ order, onDone, children }: CinemaTicketScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  if (!order.tickets.length) return null;

  const body = (
    <View style={styles.single}>
      <CinemaTicketView order={order} />
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Text variant="title" numberOfLines={1} style={styles.headerTitle}>
          {order.tickets.length > 1 ? 'Your tickets' : 'Your ticket'}
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {children ? children(body) : body}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
        <Button label="Done" size="lg" onPress={onDone} style={styles.done} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  headerTitle: { flex: 1, textAlign: 'center' },

  content: { paddingTop: Spacing.sm, paddingBottom: Spacing.xxxl },
  single: { paddingHorizontal: Spacing.lg },

  footer: { paddingHorizontal: Spacing.lg },
  done: { width: '100%' },
});
