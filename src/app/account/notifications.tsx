import { ActivityIndicator, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmbientBackground } from '@/components/ui/ambient-background';
import { GlassHeader, HEADER_CONTENT_HEIGHT } from '@/components/ui/glass-header';
import { HeaderBackButton } from '@/components/ui/header-back-button';
import { ListCard } from '@/components/ui/list-row';
import { Text } from '@/components/ui/text';
import { tabBarClearance } from '@/constants/layout';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useNotificationPreferences, useUpdateNotificationPreferences } from '@/queries/account';
import type { NotificationPreferences } from '@/types/api';

const TOGGLES: { key: keyof NotificationPreferences; label: string; hint: string }[] = [
  {
    key: 'ticketUpdates',
    label: 'Ticket & order updates',
    hint: 'Purchase confirmations, transfers, and event changes.',
  },
  { key: 'chatMessages', label: 'Chat messages', hint: 'New messages and ticket-share requests.' },
  { key: 'promotions', label: 'Promotions', hint: 'Occasional offers and things happening nearby.' },
];

/** Stored preferences only for now — see the backend's comment on why these don't gate delivery yet. */
export default function NotificationSettingsScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { preferences, isLoading } = useNotificationPreferences();
  const { set } = useUpdateNotificationPreferences();

  const topPadding = insets.top + HEADER_CONTENT_HEIGHT + Spacing.xl;

  return (
    <View style={styles.screen}>
      <AmbientBackground />
      <GlassHeader title="Notifications" left={<HeaderBackButton />} />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPadding, paddingBottom: tabBarClearance(insets.bottom) },
        ]}
        showsVerticalScrollIndicator={false}>
        {isLoading || !preferences ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#FFFFFF" />
          </View>
        ) : (
          <ListCard>
            {TOGGLES.map(({ key, label, hint }) => (
              <View key={key} style={styles.row}>
                <View style={styles.rowText}>
                  <Text variant="body">{label}</Text>
                  <Text variant="caption" color="textSecondary">
                    {hint}
                  </Text>
                </View>
                <Switch
                  value={preferences[key]}
                  onValueChange={(value) => {
                    set({ [key]: value });
                  }}
                  trackColor={{ false: theme.glassBorder, true: theme.brand }}
                  thumbColor="#FFFFFF"
                />
              </View>
            ))}
          </ListCard>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg },
  centered: { paddingVertical: Spacing.xxl, alignItems: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingVertical: Spacing.lg,
  },
  rowText: { flex: 1, gap: 2 },
});
