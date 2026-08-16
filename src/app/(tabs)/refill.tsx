import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmbientBackground } from '@/components/ui/ambient-background';
import { GlassHeader, HEADER_CONTENT_HEIGHT } from '@/components/ui/glass-header';
import { EmptyState } from '@/components/ui/state-views';
import { tabBarClearance } from '@/constants/layout';
import { Spacing } from '@/constants/theme';

/**
 * Placeholder behind the raised centre button.
 *
 * Worth knowing before this gets built: the backend models concessions
 * (`Beverage`, `EventBeverage`, `VenueBeverage`, `CinemaBeverage` and their
 * sale ledgers) but sales are recorded *by the operator* — `POST
 * /cinema/me/concession-sales` is behind cinema-staff auth. The only public
 * surface is the read-only lineup at `/cinema/public/:cinemaId/concessions`.
 * A buyer-facing refill therefore needs a new public order + payment endpoint
 * first; there is nothing here for a client to pay through yet.
 */
export default function RefillScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <AmbientBackground />
      <GlassHeader title="Refill" />

      <View
        style={[
          styles.body,
          {
            paddingTop: insets.top + HEADER_CONTENT_HEIGHT + Spacing.lg,
            paddingBottom: tabBarClearance(insets.bottom),
          },
        ]}>
        <EmptyState
          icon="beer-outline"
          title="Refills are coming"
          message="Order a drink from your seat and skip the queue at the counter."
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.lg },
});
