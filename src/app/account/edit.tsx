import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Keyboard, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddEmailSheet } from '@/components/account/add-email-sheet';
import { ChangePasswordSheet } from '@/components/account/change-password-sheet';
import { DeleteAccountSheet } from '@/components/account/delete-account-sheet';
import { UsernameSheet } from '@/components/account/username-sheet';
import { AmbientBackground } from '@/components/ui/ambient-background';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { GlassHeader, HEADER_CONTENT_HEIGHT } from '@/components/ui/glass-header';
import { HeaderBackButton } from '@/components/ui/header-back-button';
import { ListCard, ListRow } from '@/components/ui/list-row';
import { SectionHeader } from '@/components/ui/section';
import { Text } from '@/components/ui/text';
import { tabBarClearance } from '@/constants/layout';
import { Spacing } from '@/constants/theme';
import { useUpdateProfile } from '@/queries/account';
import { useAuthStore } from '@/stores/use-auth-store';
import type { User } from '@/types/api';

function needsEmail(user: User): boolean {
  return !user.email || user.email.includes('customerpazimo');
}

export default function EditAccountScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { submit: submitProfile, submitting: savingProfile } = useUpdateProfile();

  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [addEmailVisible, setAddEmailVisible] = useState(false);
  const [usernameVisible, setUsernameVisible] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);

  const nameChanged = user
    ? firstName.trim() !== user.firstName && firstName.trim().length > 0
    : false;
  const lastNameChanged = user ? (lastName.trim() || undefined) !== user.lastName : false;

  const saveName = useCallback(async () => {
    if (!firstName.trim()) return;
    Keyboard.dismiss();
    await submitProfile({ firstName: firstName.trim(), lastName: lastName.trim() || undefined });
  }, [firstName, lastName, submitProfile]);

  const onDeleted = useCallback(() => {
    setDeleteVisible(false);
    router.replace('/(tabs)/profile');
  }, [router]);

  if (!user) return null;

  return (
    <View style={styles.screen}>
      <AmbientBackground />
      <GlassHeader title="Edit profile" left={<HeaderBackButton />} />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + HEADER_CONTENT_HEIGHT + Spacing.xl,
            paddingBottom: tabBarClearance(insets.bottom),
          },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.nameFields}>
          <Field label="First name" value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
          <Field label="Last name" value={lastName} onChangeText={setLastName} autoCapitalize="words" />
          {nameChanged || lastNameChanged ? (
            <Button label="Save name" loading={savingProfile} onPress={saveName} />
          ) : null}
        </View>

        <View>
          <SectionHeader title="Account" />
          <ListCard>
            <ListRow
              icon="mail-outline"
              label="Email"
              value={needsEmail(user) ? 'Not set' : (user.email ?? '—')}
              onPress={() => setAddEmailVisible(true)}
            />
            <ListRow
              icon="at-outline"
              label="Username"
              value={user.username ? `@${user.username}` : 'Set up'}
              onPress={() => setUsernameVisible(true)}
            />
            <ListRow icon="lock-closed-outline" label="Password" onPress={() => setPasswordVisible(true)} />
          </ListCard>
        </View>

        <View>
          <SectionHeader title="Danger zone" />
          <ListCard>
            <ListRow
              icon="trash-outline"
              label="Delete account"
              danger
              onPress={() => setDeleteVisible(true)}
            />
          </ListCard>
          <Text variant="caption" color="textMuted" style={styles.note}>
            Deleting your account is permanent. Your tickets stay valid, but you won&apos;t be able
            to sign back in.
          </Text>
        </View>
      </ScrollView>

      <AddEmailSheet visible={addEmailVisible} onClose={() => setAddEmailVisible(false)} />
      <UsernameSheet visible={usernameVisible} onClose={() => setUsernameVisible(false)} />
      <ChangePasswordSheet visible={passwordVisible} onClose={() => setPasswordVisible(false)} />
      <DeleteAccountSheet
        visible={deleteVisible}
        onClose={() => setDeleteVisible(false)}
        onDeleted={onDeleted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, gap: Spacing.xl },
  nameFields: { gap: Spacing.md },
  note: { paddingHorizontal: Spacing.xs, marginTop: Spacing.sm },
});
