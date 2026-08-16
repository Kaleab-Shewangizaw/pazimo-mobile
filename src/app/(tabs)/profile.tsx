import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SignInSheet } from '@/components/account/sign-in-sheet';
import { AmbientBackground } from '@/components/ui/ambient-background';
import { Button } from '@/components/ui/button';
import { GlassHeader, HEADER_CONTENT_HEIGHT } from '@/components/ui/glass-header';
import { Touchable } from '@/components/ui/pressable';
import { EmptyState } from '@/components/ui/state-views';
import { Text } from '@/components/ui/text';
import { tabBarClearance } from '@/constants/layout';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useMyTickets } from '@/queries/tickets';
import { displayName, useAuthStore } from '@/stores/use-auth-store';

/**
 * The account, such as it is.
 *
 * Pazimo is guest-first and this screen must never become a gate: browsing and
 * checkout both work signed out, and most people arrive here already signed in
 * because paying created their account for them. So the signed-out state sells
 * one concrete benefit — your tickets follow your phone number — rather than
 * demanding a login.
 */
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();

  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const { tickets } = useMyTickets();

  const [signInVisible, setSignInVisible] = useState(false);

  const confirmSignOut = useCallback(() => {
    Alert.alert('Sign out?', 'Your tickets stay on your account and come back when you sign in.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => {
          signOut().then(() => {
            // The cached list belongs to the account that just left.
            queryClient.clear();
          });
        },
      },
    ]);
  }, [queryClient, signOut]);

  return (
    <View style={styles.screen}>
      <AmbientBackground />
      <GlassHeader title="Profile" />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + HEADER_CONTENT_HEIGHT + Spacing.xl,
            paddingBottom: tabBarClearance(insets.bottom),
          },
        ]}
        showsVerticalScrollIndicator={false}>
        {user ? (
          <>
            <View style={styles.identity}>
              <View style={[styles.avatar, { borderColor: theme.glassBorder }]}>
                <Text variant="heading" style={styles.initial}>
                  {displayName(user).charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text variant="title" numberOfLines={1}>
                {displayName(user)}
              </Text>
              {user.phoneNumber ? (
                <Text variant="small" color="textSecondary">
                  {user.phoneNumber}
                </Text>
              ) : null}
            </View>

            <View style={[styles.card, { borderColor: theme.glassBorder }]}>
              <Row
                icon="ticket-outline"
                label="My tickets"
                value={String(tickets.length)}
                onPress={() => router.push('/(tabs)/tickets')}
              />
              <View style={[styles.divider, { backgroundColor: theme.hairline }]} />
              <Row
                icon="mail-outline"
                label="Email"
                // Checkout mints a placeholder address when the buyer skips the
                // field; showing it would read as a mistake we made.
                value={user.email?.includes('customerpazimo') ? 'Not set' : (user.email ?? '—')}
              />
            </View>

            <Button label="Sign out" variant="secondary" onPress={confirmSignOut} />
          </>
        ) : (
          <>
            <EmptyState
              icon="person-circle-outline"
              title="You're browsing as a guest"
              message="Sign in with the phone number you buy tickets with, and every ticket you've bought lands here."
              actionLabel="Sign in"
              onAction={() => setSignInVisible(true)}
            />
            {tickets.length ? (
              <Text variant="small" color="textMuted" style={styles.note}>
                {tickets.length === 1
                  ? '1 ticket bought on this device is already in your Tickets tab.'
                  : `${tickets.length} tickets bought on this device are already in your Tickets tab.`}
              </Text>
            ) : null}
          </>
        )}
      </ScrollView>

      <SignInSheet visible={signInVisible} onClose={() => setSignInVisible(false)} />
    </View>
  );
}

function Row({
  icon,
  label,
  value,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onPress?: () => void;
}) {
  const theme = useTheme();

  const content = (
    <View style={styles.row}>
      <Ionicons name={icon} size={19} color={theme.textSecondary} />
      <Text variant="body" style={styles.rowLabel}>
        {label}
      </Text>
      <Text variant="body" color="textSecondary" numberOfLines={1} style={styles.rowValue}>
        {value}
      </Text>
      {onPress ? <Ionicons name="chevron-forward" size={16} color={theme.textMuted} /> : null}
    </View>
  );

  if (!onPress) return content;
  return (
    <Touchable accessibilityRole="button" onPress={onPress} pressedScale={0.99}>
      {content}
    </Touchable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, gap: Spacing.xl },

  identity: { alignItems: 'center', gap: Spacing.xs },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.sm,
  },
  initial: { color: '#FFFFFF' },

  card: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: Spacing.lg,
  },
  divider: { height: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.lg },
  rowLabel: { flex: 1 },
  rowValue: { maxWidth: '52%', textAlign: 'right' },

  note: { textAlign: 'center' },
});
