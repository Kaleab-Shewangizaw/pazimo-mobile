import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmbientBackground } from '@/components/ui/ambient-background';
import { GlassHeader, HEADER_CONTENT_HEIGHT } from '@/components/ui/glass-header';
import { HeaderBackButton } from '@/components/ui/header-back-button';
import { ListCard, ListRow } from '@/components/ui/list-row';
import { Text } from '@/components/ui/text';
import { tabBarClearance } from '@/constants/layout';
import { Spacing } from '@/constants/theme';

const SUPPORT_EMAIL = 'support@pazimo.com';
const SUPPORT_PHONE = '+251991051844';
const SUPPORT_PHONE_DISPLAY = '+251 991 051 844';

export default function SupportScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <AmbientBackground />
      <GlassHeader title="Support" left={<HeaderBackButton />} />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + HEADER_CONTENT_HEIGHT + Spacing.xl,
            paddingBottom: tabBarClearance(insets.bottom),
          },
        ]}
        showsVerticalScrollIndicator={false}>
        <Text variant="body" color="textSecondary">
          Have a question about an order, an event, or your account? Reach us directly — we
          respond within 24 hours, Monday to Friday.
        </Text>

        <ListCard>
          <ListRow
            icon="mail-outline"
            label="Email us"
            value={SUPPORT_EMAIL}
            onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
          />
          <ListRow
            icon="call-outline"
            label="Call us"
            value={SUPPORT_PHONE_DISPLAY}
            onPress={() => Linking.openURL(`tel:${SUPPORT_PHONE}`)}
          />
          <ListRow icon="location-outline" label="Nifas Silk Lafto, Addis Ababa, Ethiopia" />
        </ListCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, gap: Spacing.xl },
});
