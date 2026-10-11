import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { memo, useCallback, useDeferredValue, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SectionList,
  type SectionListData,
  type SectionListRenderItem,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AvatarInitials } from '@/components/shares/avatar-initials';
import { Button } from '@/components/ui/button';
import { GlassHeader, HEADER_CONTENT_HEIGHT } from '@/components/ui/glass-header';
import { AmbientBackground } from '@/components/ui/ambient-background';
import { HeaderBackButton } from '@/components/ui/header-back-button';
import { Touchable } from '@/components/ui/pressable';
import { PageRefreshControl } from '@/components/ui/refresh-control';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useRefresh } from '@/hooks/use-refresh';
import { useTheme } from '@/hooks/use-theme';
import { sendAppInvite } from '@/lib/app-invite';
import type { DeviceContact } from '@/lib/device-contacts';
import { isResolvableIdentifier } from '@/lib/identifier';
import { useAddressBook, useContactsAccess, type PazimoContact } from '@/queries/address-book';
import { useShareSearch } from '@/queries/ticket-shares';
import { useAuthStore } from '@/stores/use-auth-store';
import type { ShareUser } from '@/types/api';

type Row =
  | { kind: 'pazimo'; key: string; name: string; thumbnail: string | null; user: ShareUser }
  | { kind: 'invite'; key: string; contact: DeviceContact };

type Section = { title: string; data: Row[] };

function nameOf(person: { firstName: string; lastName?: string }) {
  return [person.firstName, person.lastName].filter(Boolean).join(' ').trim() || 'Pazimo user';
}

const digitsOf = (text: string) => text.replace(/\D/g, '');

/** Name, or — once the query has a few digits — any saved number containing them. */
function matchesQuery(contact: DeviceContact, needle: string, needleDigits: string) {
  if (contact.name.toLowerCase().includes(needle)) return true;
  return needleDigits.length >= 3 && contact.phones.some((p) => digitsOf(p).includes(needleDigits));
}

/**
 * The Chats FAB's destination — Telegram's "New Message": everyone in the
 * phone's address book who's on Pazimo, then everyone who isn't with an
 * Invite button that opens the SMS app (see `lib/app-invite.ts`). The search
 * box filters both lists locally, and also runs the same exact
 * username/phone lookup as the header search sheet, so someone who isn't
 * saved on this phone can still be found. Without contacts access the
 * screen still works as that lookup, with a card explaining the upside.
 */
export default function NewChatScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const myUsername = useAuthStore((s) => s.user?.username);

  const { access, request } = useContactsAccess();
  const { data: book, isLoading, isError, refetch } = useAddressBook(access);
  const { refreshing, onRefresh } = useRefresh(refetch);

  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const needle = deferredQuery.trim().toLowerCase();
  const { results: searchResults } = useShareSearch(deferredQuery);
  // Invites are fire-and-forget SMS — there's nothing server-side to read
  // back, so this is just "you already did this one" feedback for the visit.
  const [invited, setInvited] = useState<Set<string>>(() => new Set());

  const openChat = useCallback(
    (person: ShareUser) => {
      router.replace({
        pathname: '/conversation/[userId]',
        params: {
          userId: person._id,
          firstName: person.firstName,
          lastName: person.lastName ?? '',
          username: person.username ?? '',
        },
      });
    },
    [router],
  );

  const invite = useCallback(
    async (contact: DeviceContact) => {
      try {
        const result = await sendAppInvite(contact.phones[0], myUsername);
        // Android's SMS app never reports back ('unknown'), so only an
        // explicit cancel leaves the row un-marked.
        if (result !== 'cancelled') {
          setInvited((current) => new Set(current).add(contact.id));
        }
      } catch {
        Alert.alert("Couldn't open messages", 'Try again, or share the Pazimo link another way.');
      }
    },
    [myUsername],
  );

  const sections = useMemo<Section[]>(() => {
    const needleDigits = digitsOf(needle);
    const filter = (contact: DeviceContact) => !needle || matchesQuery(contact, needle, needleDigits);

    const onPazimo = (book?.onPazimo ?? []).filter(({ contact }) => filter(contact));
    const pazimoIds = new Set(onPazimo.map(({ user }) => user._id));
    // An exact username/phone hit that isn't already listed from the address
    // book — someone the user knows by handle but hasn't saved.
    const extraResults = isResolvableIdentifier(needle)
      ? searchResults.filter((person) => !pazimoIds.has(person._id))
      : [];

    const result: Section[] = [];
    if (extraResults.length) {
      result.push({
        title: 'PAZIMO SEARCH',
        data: extraResults.map((user) => ({
          kind: 'pazimo',
          key: `search-${user._id}`,
          name: nameOf(user),
          thumbnail: null,
          user,
        })),
      });
    }
    if (onPazimo.length) {
      result.push({
        title: 'CONTACTS ON PAZIMO',
        data: onPazimo.map(({ contact, user }: PazimoContact) => ({
          kind: 'pazimo',
          key: `contact-${user._id}`,
          name: contact.name,
          thumbnail: contact.thumbnail,
          user,
        })),
      });
    }
    const toInvite = (book?.notOnPazimo ?? []).filter(filter);
    if (toInvite.length) {
      result.push({
        title: 'INVITE TO PAZIMO',
        data: toInvite.map((contact) => ({ kind: 'invite', key: `invite-${contact.id}`, contact })),
      });
    }
    return result;
  }, [book, needle, searchResults]);

  const renderItem = useCallback<SectionListRenderItem<Row, Section>>(
    ({ item }) =>
      item.kind === 'pazimo' ? (
        <PazimoRow row={item} onPress={openChat} />
      ) : (
        <InviteRow contact={item.contact} invited={invited.has(item.contact.id)} onInvite={invite} />
      ),
    [openChat, invite, invited],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: SectionListData<Row, Section> }) => (
      <Text variant="caption" color="textMuted" style={styles.sectionLabel}>
        {section.title}
      </Text>
    ),
    [],
  );

  const topPadding = insets.top + HEADER_CONTENT_HEIGHT + Spacing.lg;

  return (
    <View style={styles.screen}>
      <AmbientBackground />
      <GlassHeader title="New message" left={<HeaderBackButton />} />

      <SectionList
        sections={sections}
        keyExtractor={(row) => row.key}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        initialNumToRender={20}
        contentContainerStyle={[
          styles.list,
          { paddingTop: topPadding, paddingBottom: insets.bottom + Spacing.xxl },
        ]}
        refreshControl={
          access === 'granted' ? (
            <PageRefreshControl refreshing={refreshing} onRefresh={onRefresh} progressViewOffset={topPadding} />
          ) : undefined
        }
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <SearchBox value={query} onChange={setQuery} />
            {access === 'undetermined' || access === 'denied' || access === 'blocked' ? (
              <ContactsAccessCard blocked={access === 'blocked'} onAllow={request} />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <ListEmpty
            access={access}
            loading={access === 'unknown' || (access === 'granted' && isLoading)}
            error={isError}
            searching={needle.length > 0}
            onRetry={refetch}
          />
        }
      />
    </View>
  );
}

const SearchBox = memo(function SearchBox({
  value,
  onChange,
}: {
  value: string;
  onChange: (text: string) => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.searchBox, { borderColor: theme.glassBorder }]}>
      <Ionicons name="search" size={18} color={theme.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Search contacts, username or phone"
        placeholderTextColor={theme.textMuted}
        style={[styles.input, { color: theme.text }]}
        autoCorrect={false}
        autoCapitalize="none"
      />
      {value.length > 0 ? (
        <Touchable
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          onPress={() => onChange('')}
          pressedScale={0.9}>
          <Ionicons name="close-circle" size={18} color={theme.textMuted} />
        </Touchable>
      ) : null}
    </View>
  );
});

function ContactsAccessCard({ blocked, onAllow }: { blocked: boolean; onAllow: () => void }) {
  const theme = useTheme();
  return (
    <View style={[styles.accessCard, { backgroundColor: theme.surfaceMuted, borderColor: theme.glassBorder }]}>
      <Ionicons name="people" size={26} color={theme.text} />
      <Text variant="callout">Find your friends on Pazimo</Text>
      <Text variant="small" color="textSecondary" style={styles.accessBody}>
        See which of your contacts are already here, and invite the rest by SMS. Only phone numbers
        are checked — names stay on your phone and nothing is saved.
      </Text>
      <Button
        label={blocked ? 'Open Settings' : 'Allow contacts'}
        onPress={onAllow}
        style={styles.accessButton}
      />
    </View>
  );
}

function ListEmpty({
  access,
  loading,
  error,
  searching,
  onRetry,
}: {
  access: string;
  loading: boolean;
  error: boolean;
  searching: boolean;
  onRetry: () => void;
}) {
  if (loading) return <ActivityIndicator color="#FFFFFF" style={styles.spinner} />;
  if (error) {
    return (
      <View style={styles.emptyBlock}>
        <Text variant="small" color="textMuted" style={styles.empty}>
          Couldn&apos;t check your contacts right now.
        </Text>
        <Button label="Try again" variant="secondary" onPress={onRetry} />
      </View>
    );
  }
  if (searching) {
    return (
      <Text variant="small" color="textMuted" style={styles.empty}>
        No contacts match. Type someone&apos;s full username or phone number to find them on Pazimo.
      </Text>
    );
  }
  if (access === 'granted') {
    return (
      <Text variant="small" color="textMuted" style={styles.empty}>
        No contacts with phone numbers on this device yet.
      </Text>
    );
  }
  return (
    <Text variant="small" color="textMuted" style={styles.empty}>
      Search a full username or phone number to start chatting.
    </Text>
  );
}

const PazimoRow = memo(function PazimoRow({
  row,
  onPress,
}: {
  row: Extract<Row, { kind: 'pazimo' }>;
  onPress: (person: ShareUser) => void;
}) {
  const theme = useTheme();
  return (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel={`Message ${row.name}`}
      onPress={() => onPress(row.user)}
      pressedScale={0.98}
      style={styles.row}>
      <AvatarInitials name={row.name} size={44} imageUri={row.thumbnail} />
      <View style={styles.rowText}>
        <Text variant="body" numberOfLines={1}>
          {row.name}
        </Text>
        <Text variant="caption" color="textSecondary" numberOfLines={1}>
          {row.user.username ? `@${row.user.username}` : 'On Pazimo'}
        </Text>
      </View>
      <Ionicons name="chatbubble-outline" size={18} color={theme.textMuted} />
    </Touchable>
  );
});

const InviteRow = memo(function InviteRow({
  contact,
  invited,
  onInvite,
}: {
  contact: DeviceContact;
  invited: boolean;
  onInvite: (contact: DeviceContact) => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <AvatarInitials name={contact.name} size={44} imageUri={contact.thumbnail} />
      <View style={styles.rowText}>
        <Text variant="body" numberOfLines={1}>
          {contact.name}
        </Text>
        <Text variant="caption" color="textSecondary" numberOfLines={1}>
          {contact.phones[0]}
        </Text>
      </View>
      <Touchable
        accessibilityRole="button"
        accessibilityLabel={invited ? `Invite ${contact.name} again` : `Invite ${contact.name} to Pazimo`}
        onPress={() => onInvite(contact)}
        haptic
        pressedScale={0.94}
        style={[
          styles.invitePill,
          invited ? { backgroundColor: theme.surfaceMuted } : { backgroundColor: theme.brandTint },
        ]}>
        {invited ? <Ionicons name="checkmark" size={14} color={theme.textSecondary} /> : null}
        <Text variant="small" color={invited ? 'textSecondary' : 'text'}>
          {invited ? 'Invited' : 'Invite'}
        </Text>
      </Touchable>
    </View>
  );
});

const styles = StyleSheet.create({
  screen: { flex: 1 },
  list: { paddingHorizontal: Spacing.lg },
  header: { gap: Spacing.lg, marginBottom: Spacing.sm },
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
  accessCard: {
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.xl,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  accessBody: { textAlign: 'center' },
  accessButton: { alignSelf: 'stretch', marginTop: Spacing.sm },
  sectionLabel: { marginTop: Spacing.lg, marginBottom: Spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm },
  rowText: { flex: 1, gap: 1 },
  invitePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.pill,
  },
  spinner: { marginVertical: Spacing.xl },
  emptyBlock: { gap: Spacing.md, alignItems: 'center' },
  empty: { textAlign: 'center', paddingVertical: Spacing.lg },
});
