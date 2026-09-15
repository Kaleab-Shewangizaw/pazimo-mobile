import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddEmailSheet } from '@/components/account/add-email-sheet';
import { AuthSheet } from '@/components/account/auth-sheet';
import { UsernameSheet } from '@/components/account/username-sheet';
import { AmbientBackground } from '@/components/ui/ambient-background';
import { GlassHeader, HEADER_CONTENT_HEIGHT } from '@/components/ui/glass-header';
import { GlassIconButton } from '@/components/ui/glass-button';
import { ListCard, ListRow } from '@/components/ui/list-row';
import { EmptyState } from '@/components/ui/state-views';
import { Text } from '@/components/ui/text';
import { tabBarClearance } from '@/constants/layout';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useMyTickets } from '@/queries/tickets';
import { displayName, useAuthStore } from '@/stores/use-auth-store';
import type { User } from '@/types/api';

/** A no-email account either skipped it at signup or still has the backend's placeholder. */
function needsEmail(user: User): boolean {
  return !user.email || user.email.includes('customerpazimo');
}

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

  const user = useAuthStore((s) => s.user);
  const { tickets } = useMyTickets();

  const [authVisible, setAuthVisible] = useState(false);
  const [addEmailVisible, setAddEmailVisible] = useState(false);
  const [usernameVisible, setUsernameVisible] = useState(false);

  // After a fresh sign-up/login, nudge toward the two things guest-created
  // accounts are most likely to be missing — an email, then a username —
  // one sheet at a time rather than dumping both on screen at once. Each
  // next sheet waits for the previous one to actually finish closing (260ms,
  // matching BottomSheet's own close animation) — opening one in the same
  // tick the last one starts closing means two full-screen sheets are
  // mounted at once, which visibly corrupts layout while they overlap.
  const onAuthenticated = useCallback((authedUser: User) => {
    if (needsEmail(authedUser)) {
      setTimeout(() => setAddEmailVisible(true), 260);
    } else if (!authedUser.username) {
      setTimeout(() => setUsernameVisible(true), 260);
    }
  }, []);

  const onAddEmailClose = useCallback(() => {
    setAddEmailVisible(false);
    if (user && !user.username) {
      setTimeout(() => setUsernameVisible(true), 260);
    }
  }, [user]);

  return (
    <View style={styles.screen}>
      <AmbientBackground />
      <GlassHeader
        title="Profile"
        right={
          user ? (
            <GlassIconButton
              icon="menu-outline"
              accessibilityLabel="Account menu"
              onPress={() => router.push('/account/menu')}
            />
          ) : undefined
        }
      />

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

            <ListCard>
              <ListRow
                icon="ticket-outline"
                label="My tickets"
                value={String(tickets.length)}
                onPress={() => router.push('/(tabs)/tickets')}
              />
              <ListRow
                icon="mail-outline"
                label="Email"
                // The backend mints a placeholder address when the buyer skips
                // the field; showing it would read as a mistake we made.
                value={needsEmail(user) ? 'Not set' : (user.email ?? '—')}
                onPress={() => setAddEmailVisible(true)}
              />
              <ListRow
                icon="at-outline"
                label="Username"
                value={user.username ? `@${user.username}` : 'Set up'}
                onPress={() => setUsernameVisible(true)}
              />
            </ListCard>
          </>
        ) : (
          <>
            <EmptyState
              icon="person-circle-outline"
              title="You're browsing as a guest"
              message="Create an account (or log in) and every ticket you buy lands here."
              actionLabel="Sign up or log in"
              onAction={() => setAuthVisible(true)}
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

      <AuthSheet
        visible={authVisible}
        onClose={() => setAuthVisible(false)}
        onAuthenticated={onAuthenticated}
      />
      <AddEmailSheet visible={addEmailVisible} onClose={onAddEmailClose} />
      <UsernameSheet visible={usernameVisible} onClose={() => setUsernameVisible(false)} />
    </View>
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

  note: { textAlign: 'center' },
});
