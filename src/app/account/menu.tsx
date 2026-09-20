import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmbientBackground } from '@/components/ui/ambient-background';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { GlassHeader, HEADER_CONTENT_HEIGHT } from '@/components/ui/glass-header';
import { HeaderBackButton } from '@/components/ui/header-back-button';
import { ListCard, ListRow } from '@/components/ui/list-row';
import { SectionHeader } from '@/components/ui/section';
import { tabBarClearance } from '@/constants/layout';
import { Spacing } from '@/constants/theme';
import { useAuthStore } from '@/stores/use-auth-store';

/**
 * The Instagram-style "Settings and activity" hub — everything about the
 * account that doesn't fit on the Profile tab itself lives one tap behind
 * the hamburger menu there.
 */
export default function AccountMenuScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const signOut = useAuthStore((s) => s.signOut);

  const [signOutVisible, setSignOutVisible] = useState(false);

  const confirmSignOut = useCallback(() => {
    setSignOutVisible(false);
    signOut().then(() => {
      // The cached list belongs to the account that just left.
      queryClient.clear();
      router.replace('/(tabs)/profile');
    });
  }, [queryClient, router, signOut]);

  return (
    <View style={styles.screen}>
      <AmbientBackground />
      <GlassHeader title="Settings" left={<HeaderBackButton />} />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + HEADER_CONTENT_HEIGHT + Spacing.xl,
            paddingBottom: tabBarClearance(insets.bottom),
          },
        ]}
        showsVerticalScrollIndicator={false}>
        <View>
          <SectionHeader title="Account" />
          <ListCard>
            <ListRow
              icon="person-outline"
              label="Edit profile"
              onPress={() => router.push('/account/edit')}
            />
          </ListCard>
        </View>

        <View>
          <SectionHeader title="Security" />
          <ListCard>
            <ListRow
              icon="shield-checkmark-outline"
              label="Security"
              onPress={() => router.push('/account/security')}
            />
          </ListCard>
        </View>

        <View>
          <SectionHeader title="Your activity" />
          <ListCard>
            <ListRow
              icon="heart-outline"
              label="Wishlist"
              onPress={() => router.push('/account/wishlist')}
            />
            <ListRow
              icon="ticket-outline"
              label="My tickets"
              onPress={() => router.push('/(tabs)/tickets')}
            />
          </ListCard>
        </View>

        <View>
          <SectionHeader title="People" />
          <ListCard>
            <ListRow
              icon="people-outline"
              label="Contacts"
              onPress={() => router.push('/account/contacts')}
            />
            <ListRow
              icon="ban-outline"
              label="Blocked accounts"
              onPress={() => router.push('/account/blocked')}
            />
          </ListCard>
        </View>

        <View>
          <SectionHeader title="Preferences" />
          <ListCard>
            <ListRow
              icon="notifications-outline"
              label="Notifications"
              onPress={() => router.push('/account/notifications')}
            />
          </ListCard>
        </View>

        <View>
          <SectionHeader title="About" />
          <ListCard>
            <ListRow
              icon="document-text-outline"
              label="Terms & Conditions"
              onPress={() => router.push('/account/terms')}
            />
            <ListRow
              icon="help-buoy-outline"
              label="Support"
              onPress={() => router.push('/account/support')}
            />
          </ListCard>
        </View>

        <ListCard>
          <ListRow icon="log-out-outline" label="Sign out" danger onPress={() => setSignOutVisible(true)} />
        </ListCard>
      </ScrollView>

      <ConfirmDialog
        visible={signOutVisible}
        title="Are you sure you want to sign out?"
        message="Your tickets stay on your account and come back when you sign in."
        confirmLabel="Sign out"
        destructive
        onConfirm={confirmSignOut}
        onCancel={() => setSignOutVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, gap: Spacing.xl },
});
