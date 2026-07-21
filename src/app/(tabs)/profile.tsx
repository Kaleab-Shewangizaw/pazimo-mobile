import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassHeader, HEADER_CONTENT_HEIGHT } from '@/components/ui/glass-header';
import { EmptyState } from '@/components/ui/state-views';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const TAB_BAR_CLEARANCE = 56;

/**
 * Placeholder until the auth phase lands. Pazimo is guest-first — this screen
 * must never gate browsing or checkout behind a sign-in.
 */
export default function ProfileScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <GlassHeader title="Profile" />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + HEADER_CONTENT_HEIGHT + Spacing.xl,
          paddingBottom: insets.bottom + TAB_BAR_CLEARANCE,
        }}>
        <EmptyState
          icon="person-circle-outline"
          title="You're browsing as a guest"
          message="Sign in to sync your wishlist and see every ticket you've bought in one place."
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
});
