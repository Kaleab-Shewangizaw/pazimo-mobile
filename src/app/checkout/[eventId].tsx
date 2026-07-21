import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Surface } from '@/components/ui/glass';
import { Touchable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { EmptyState } from '@/components/ui/state-views';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatPrice, tierUnitPrice } from '@/lib/pricing';
import { useEvent } from '@/queries/events';
import type { Currency } from '@/types/api';

/**
 * Checkout scaffold. The purchase itself is the next phase — the contract is
 * mapped but deliberately not half-implemented, because a partially wired
 * payment path can take real money without issuing a ticket.
 *
 * When building it out:
 *  - ETB goes to `POST /api/tickets/ticket/initiate` (SantimPay, ETB-only,
 *    pushes a prompt to the payer's phone and returns no redirect URL).
 *    USD must go to `POST /api/tickets/ticket/initiate/chapa` with
 *    `method: "visa"`, which returns a `checkoutUrl` to open.
 *  - Do NOT send `amount`. The server recomputes it, and a mismatch calls
 *    `flagTamperAttempt`, which can permanently ban the payer's phone number.
 *  - Pass `successUrl` as a `pazimomobile://` deep link and open `checkoutUrl`
 *    with `WebBrowser.openAuthSessionAsync` so control returns to the app.
 *  - Then poll `GET /api/payments/status?txn=<transactionId>`. That poll is what
 *    actually mints the ticket when the webhook does not land. Direct charges
 *    auto-cancel after 3 minutes, so stop polling then.
 *  - A guest response carries `token` + `user`; persist them to sign the buyer in.
 */
export default function CheckoutScreen() {
  const { eventId, tier, currency } = useLocalSearchParams<{
    eventId: string;
    tier?: string;
    currency?: Currency;
  }>();
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: event } = useEvent(eventId);
  const selected = event?.ticketTypes.find((t) => t._id === tier);
  const code: Currency = currency ?? 'ETB';

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Touchable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          pressedScale={0.9}
          style={[styles.backButton, { backgroundColor: theme.surfaceMuted }]}>
          <Ionicons name="chevron-back" size={22} color={theme.text} />
        </Touchable>
        <Text variant="title">Checkout</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {selected && event ? (
          <Surface tone="muted" style={styles.summary}>
            <Text variant="caption" color="textMuted">
              YOUR ORDER
            </Text>
            <Text variant="callout">{event.title}</Text>
            <View style={styles.summaryRow}>
              <Text variant="small" color="textSecondary">
                {selected.name}
              </Text>
              <Text variant="callout" color="brand">
                {formatPrice(tierUnitPrice(selected, code), code)}
              </Text>
            </View>
          </Surface>
        ) : null}

        <EmptyState
          icon="card-outline"
          title="Payment is not wired up yet"
          message="Ticket selection works end to end. The payment step is the next phase — see the notes at the top of this file for the exact provider contract."
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: Spacing.lg, gap: Spacing.lg },
  summary: { padding: Spacing.lg, gap: Spacing.sm },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
});
