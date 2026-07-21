import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassHeader, HEADER_CONTENT_HEIGHT } from '@/components/ui/glass-header';
import { EmptyState } from '@/components/ui/state-views';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const TAB_BAR_CLEARANCE = 56;

/**
 * Placeholder until the checkout phase lands. The data path is already known:
 * `GET /api/tickets/my-tickets` for signed-in users (bearer, unpaginated), and
 * `GET /api/tickets/public/details/:id` for guest tickets held only by their id.
 * Grouping is by `event`, and `checkedIn` — not `status` — is the "used" signal,
 * because nothing in the backend ever writes the `used` or `expired` statuses.
 */
export default function TicketsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <GlassHeader title="Tickets" subtitle="Your passes and QR codes" />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + HEADER_CONTENT_HEIGHT + Spacing.xl,
          paddingBottom: insets.bottom + TAB_BAR_CLEARANCE,
        }}>
        <EmptyState
          icon="ticket-outline"
          title="No tickets yet"
          message="Tickets you buy will appear here with their QR codes, ready to scan at the door."
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
});
