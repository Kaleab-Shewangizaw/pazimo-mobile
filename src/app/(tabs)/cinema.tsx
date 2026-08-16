import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmbientBackground } from '@/components/ui/ambient-background';
import { GlassHeader, HEADER_CONTENT_HEIGHT } from '@/components/ui/glass-header';
import { EmptyState } from '@/components/ui/state-views';
import { tabBarClearance } from '@/constants/layout';
import { Spacing } from '@/constants/theme';

/**
 * Placeholder. The backend already carries the whole cinema domain — cinemas,
 * halls, movies, showtimes and tickets, with public reads at
 * `/cinema/public/cinemas` and `/cinema/public/:cinemaId/showtimes` — but none
 * of it has a client here yet, so this screen exists to hold the tab's place
 * rather than to pretend at a feature.
 */
export default function CinemaScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <AmbientBackground />
      <GlassHeader title="Cinema" />

      <View
        style={[
          styles.body,
          {
            paddingTop: insets.top + HEADER_CONTENT_HEIGHT + Spacing.lg,
            paddingBottom: tabBarClearance(insets.bottom),
          },
        ]}>
        <EmptyState
          icon="film-outline"
          title="Cinema is on its way"
          message="Showtimes, seats and screens will live here."
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.lg },
});
