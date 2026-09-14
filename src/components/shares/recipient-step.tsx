import { Ionicons } from '@expo/vector-icons';
import { memo, useDeferredValue, useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';

import { AvatarInitials } from '@/components/shares/avatar-initials';
import { Touchable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { isResolvableIdentifier } from '@/lib/identifier';
import { useShareContacts, useShareSearch } from '@/queries/ticket-shares';
import type { ShareContact, ShareUser } from '@/types/api';

export type RecipientStepProps = {
  onSelect: (recipient: ShareUser) => void;
};

function nameOf(person: { firstName: string; lastName?: string }) {
  return [person.firstName, person.lastName].filter(Boolean).join(' ').trim() || 'Pazimo user';
}

/**
 * Recents on top, exact-match search below. There is no fuzzy directory here
 * on purpose — the backend only ever resolves a *complete* username or phone
 * number (see `lib/identifier.ts`), so a request never even goes out while
 * the input is still obviously partial, and a result is either a match or
 * nothing, never a "close enough" list.
 */
function RecipientStepImpl({ onSelect }: RecipientStepProps) {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  const { contacts, isLoading: contactsLoading } = useShareContacts();
  const { results, isLoading: searchLoading } = useShareSearch(deferredQuery);

  const trimmed = deferredQuery.trim();
  const resolvable = isResolvableIdentifier(trimmed);
  const typing = trimmed.length > 0;

  const selectContact = (contact: ShareContact) =>
    onSelect({
      _id: contact.userId,
      firstName: contact.firstName,
      lastName: contact.lastName,
      username: contact.username,
    });

  return (
    <View style={styles.container}>
      <View style={[styles.searchBox, { borderColor: theme.glassBorder }]}>
        <Ionicons name="search" size={18} color={theme.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Username or phone number"
          placeholderTextColor={theme.textMuted}
          style={[styles.input, { color: theme.text }]}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {query.length > 0 ? (
          <Touchable
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            onPress={() => setQuery('')}
            pressedScale={0.9}>
            <Ionicons name="close-circle" size={18} color={theme.textMuted} />
          </Touchable>
        ) : null}
      </View>

      {typing ? (
        !resolvable ? (
          <Text variant="small" color="textMuted" style={styles.empty}>
            Keep typing the full username or phone number — partial matches are not shown.
          </Text>
        ) : searchLoading ? (
          <ActivityIndicator color="#FFFFFF" style={styles.spinner} />
        ) : results.length ? (
          <View style={styles.list}>
            {results.map((person) => (
              <PersonRow
                key={person._id}
                name={nameOf(person)}
                handle={person.username}
                onPress={() => onSelect(person)}
              />
            ))}
          </View>
        ) : (
          <Text variant="small" color="textMuted" style={styles.empty}>
            No one found with that exact username or phone number.
          </Text>
        )
      ) : (
        <>
          <Text variant="caption" color="textMuted" style={styles.sectionLabel}>
            RECENT
          </Text>
          {contactsLoading ? (
            <ActivityIndicator color="#FFFFFF" style={styles.spinner} />
          ) : contacts.length ? (
            <View style={styles.list}>
              {contacts.map((contact) => (
                <PersonRow
                  key={contact.userId}
                  name={nameOf(contact)}
                  handle={contact.username}
                  onPress={() => selectContact(contact)}
                />
              ))}
            </View>
          ) : (
            <Text variant="small" color="textMuted" style={styles.empty}>
              Enter a full username or phone number to send them a ticket.
            </Text>
          )}
        </>
      )}
    </View>
  );
}

function PersonRow({
  name,
  handle,
  onPress,
}: {
  name: string;
  handle?: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel={`Send to ${name}`}
      onPress={onPress}
      pressedScale={0.98}
      style={styles.row}>
      <AvatarInitials name={name} size={40} />
      <View style={styles.rowText}>
        <Text variant="body" numberOfLines={1}>
          {name}
        </Text>
        {handle ? (
          <Text variant="caption" color="textSecondary">
            @{handle}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
    </Touchable>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.md },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  input: { flex: 1, paddingVertical: Spacing.md },
  sectionLabel: { marginTop: Spacing.xs },
  list: { gap: Spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm },
  rowText: { flex: 1, gap: 1 },
  spinner: { marginVertical: Spacing.lg },
  empty: { textAlign: 'center', paddingVertical: Spacing.lg },
});

export const RecipientStep = memo(RecipientStepImpl);
