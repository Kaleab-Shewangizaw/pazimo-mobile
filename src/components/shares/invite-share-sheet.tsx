import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
// Per-icon subpath import — see `app/(tabs)/_layout.tsx` for why not the barrel.
import { PaperPlaneTiltIcon } from 'phosphor-react-native/src/icons/PaperPlaneTilt';
import { useCallback, useDeferredValue, useState } from 'react';
import { ActivityIndicator, Share, StyleSheet, TextInput, View } from 'react-native';

import { AvatarInitials } from '@/components/shares/avatar-initials';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Touchable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { isResolvableIdentifier } from '@/lib/identifier';
import { buildInviteLink, buildPublicInviteLink, type InviteKind } from '@/lib/invite-link';
import { useConversationsList, useSendMessage } from '@/queries/messages';
import { useShareSearch } from '@/queries/ticket-shares';
import type { ShareUser } from '@/types/api';

export type InviteShareSheetProps = {
  visible: boolean;
  onClose: () => void;
  kind: InviteKind;
  id: string;
  title: string;
  /** Already resolved via `resolveImageUrl`/`eventCoverUrl` — not every kind has one (a refill venue's catalog fetch carries no image). */
  image?: string | null;
  subtitle?: string;
};

const KIND_ICON: Record<InviteKind, keyof typeof Ionicons.glyphMap> = {
  movie: 'film',
  event: 'calendar',
  venue: 'location',
};

const KIND_INVITE_LINE: Record<InviteKind, string> = {
  movie: 'Come watch this with me',
  event: 'Come to this with me',
  venue: "Let's meet up here",
};

function nameOf(person: { firstName: string; lastName?: string }) {
  return [person.firstName, person.lastName].filter(Boolean).join(' ').trim() || 'Pazimo user';
}

/**
 * One sheet for inviting someone to a movie/event/venue — send it into
 * Pazimo chats, or hand it to the OS share sheet (Telegram, Instagram,
 * copy link, …). Unlike `ShareItemSheet` (an irreversible ownership
 * transfer, hence its multi-step confirm), this just posts a message —
 * tap to pick one or more people, then the pinned Send button, Instagram-style.
 */
export function InviteShareSheet({
  visible,
  onClose,
  kind,
  id,
  title,
  image,
  subtitle,
}: InviteShareSheetProps) {
  const theme = useTheme();
  const { submit } = useSendMessage();
  const { conversations: contacts, isLoading: contactsLoading } = useConversationsList();
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const { results, isLoading: searchLoading } = useShareSearch(deferredQuery);
  // Tapping a person picks them; nothing goes out until the pinned Send
  // button — so a mis-tap never sends, and one share can go to several
  // people. Whole `ShareUser`s are kept, not ids, so someone picked from
  // search results stays picked after the search is cleared.
  const [selected, setSelected] = useState<Map<string, ShareUser>>(() => new Map());
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [copyLabel, setCopyLabel] = useState('Copy link');

  // In-chat sends use the app's own deep link (a rich card renders from it,
  // see the module doc). Copy/external-share needs a URL that works for
  // someone without the app installed, so those use the public web page
  // instead, falling back to the deep link where there isn't one yet.
  const link = buildInviteLink(kind, id, { openShowtimes: kind === 'movie' });
  const publicLink = buildPublicInviteLink(kind, id) ?? link;
  const shareText = `${KIND_INVITE_LINE[kind]} — ${title}\n${publicLink}`;

  const trimmed = deferredQuery.trim();
  const resolvable = isResolvableIdentifier(trimmed);
  const typing = trimmed.length > 0;

  // Every open starts with nobody picked — adjusted during render (the
  // "reset state when a prop changes" pattern) rather than in an effect.
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setSelected(new Map());
      setSent(false);
      setQuery('');
    }
  }

  const toggle = useCallback((person: ShareUser) => {
    setSelected((current) => {
      const next = new Map(current);
      if (next.has(person._id)) next.delete(person._id);
      else next.set(person._id, person);
      return next;
    });
  }, []);

  const sendToSelected = useCallback(async () => {
    if (selected.size === 0 || sending) return;
    setSending(true);
    // One at a time, and only the ones that failed stay picked — so a retry
    // never double-sends to the people who already got it.
    const failed = new Map<string, ShareUser>();
    for (const person of selected.values()) {
      const ok = await submit(person._id, link);
      if (!ok) failed.set(person._id, person);
    }
    setSending(false);
    setSelected(failed);
    if (failed.size === 0) {
      setSent(true);
      setTimeout(onClose, 700);
    }
  }, [selected, sending, submit, link, onClose]);

  const selectedPeople = [...selected.values()];
  const sendLabel = sent
    ? 'Sent!'
    : selectedPeople.length === 1
      ? `Send to ${nameOf(selectedPeople[0])}`
      : `Send to ${selectedPeople.length} people`;

  const copyLink = useCallback(() => {
    Clipboard.setStringAsync(publicLink).then(() => {
      setCopyLabel('Copied!');
      setTimeout(() => setCopyLabel('Copy link'), 1500);
    });
  }, [publicLink]);

  const shareExternally = useCallback(() => {
    Share.share({ message: shareText }).catch(() => {
      // Dismissed; nothing to recover from.
    });
  }, [shareText]);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      footer={
        selected.size > 0 || sent ? (
          <Button
            label={sendLabel}
            size="lg"
            loading={sending}
            disabled={sending || sent}
            onPress={sendToSelected}
            icon={sent ? undefined : <PaperPlaneTiltIcon size={18} weight="fill" color={theme.onBrand} />}
          />
        ) : null
      }>
      <View style={styles.header}>
        <Text variant="title" style={styles.headerTitle}>
          Share
        </Text>
        <Touchable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={onClose}
          pressedScale={0.9}
          style={[styles.closeButton, { backgroundColor: theme.surfaceMuted }]}>
          <Ionicons name="close" size={18} color={theme.text} />
        </Touchable>
      </View>

      <View style={styles.preview}>
        {image ? (
          <Image source={{ uri: image }} style={styles.previewImage} contentFit="cover" />
        ) : (
          <View style={[styles.previewImage, styles.previewFallback, { backgroundColor: theme.surfaceMuted }]}>
            <Ionicons name={KIND_ICON[kind]} size={22} color={theme.textMuted} />
          </View>
        )}
        <View style={styles.previewText}>
          <Text variant="callout" numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="small" color="textSecondary" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      <Text variant="caption" color="textMuted" style={styles.sectionLabel}>
        SHARE TO CHATS
      </Text>

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
      </View>

      {typing ? (
        !resolvable ? (
          <Text variant="small" color="textMuted" style={styles.empty}>
            Keep typing the full username or phone number.
          </Text>
        ) : searchLoading ? (
          <ActivityIndicator color="#FFFFFF" style={styles.spinner} />
        ) : results.length ? (
          <View style={styles.list}>
            {results.map((person) => (
              <ContactRow
                key={person._id}
                person={person}
                selected={selected.has(person._id)}
                onPress={() => toggle(person)}
              />
            ))}
          </View>
        ) : (
          <Text variant="small" color="textMuted" style={styles.empty}>
            No one found with that exact username or phone number.
          </Text>
        )
      ) : contactsLoading ? (
        <ActivityIndicator color="#FFFFFF" style={styles.spinner} />
      ) : contacts.length ? (
        <View style={styles.list}>
          {contacts.map((c) => (
            <ContactRow
              key={c.counterparty._id}
              person={c.counterparty}
              selected={selected.has(c.counterparty._id)}
              onPress={() => toggle(c.counterparty)}
            />
          ))}
        </View>
      ) : (
        <Text variant="small" color="textMuted" style={styles.empty}>
          No conversations yet — search a username or phone number.
        </Text>
      )}

      <Text variant="caption" color="textMuted" style={styles.sectionLabel}>
        OR SHARE VIA
      </Text>
      <View style={styles.externalRow}>
        <ExternalAction icon="copy-outline" label={copyLabel} onPress={copyLink} />
        <ExternalAction icon="ellipsis-horizontal" label="More" onPress={shareExternally} />
      </View>
    </BottomSheet>
  );
}

function ContactRow({
  person,
  onPress,
  selected,
}: {
  person: ShareUser;
  onPress: () => void;
  selected: boolean;
}) {
  const theme = useTheme();
  const name = nameOf(person);
  return (
    <Touchable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={name}
      onPress={onPress}
      haptic
      pressedScale={0.98}
      style={styles.row}>
      <AvatarInitials name={name} size={40} />
      <View style={styles.rowText}>
        <Text variant="body" numberOfLines={1}>
          {name}
        </Text>
        {person.username ? (
          <Text variant="caption" color="textSecondary">
            @{person.username}
          </Text>
        ) : null}
      </View>
      <View
        style={[
          styles.check,
          selected
            ? { backgroundColor: theme.brand, borderColor: theme.brand }
            : { borderColor: theme.textMuted },
        ]}>
        {selected ? <Ionicons name="checkmark" size={15} color={theme.onBrand} /> : null}
      </View>
    </Touchable>
  );
}

function ExternalAction({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      pressedScale={0.95}
      style={styles.externalAction}>
      <View style={[styles.externalIcon, { backgroundColor: theme.surfaceMuted }]}>
        <Ionicons name={icon} size={20} color={theme.text} />
      </View>
      <Text variant="caption" color="textSecondary">
        {label}
      </Text>
    </Touchable>
  );
}

const PREVIEW_SIZE = 48;
const EXTERNAL_ICON = 52;

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.lg },
  headerTitle: { flex: 1 },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },

  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  previewImage: { width: PREVIEW_SIZE, height: PREVIEW_SIZE, borderRadius: Radius.md },
  previewFallback: { alignItems: 'center', justifyContent: 'center' },
  previewText: { flex: 1, gap: 1 },

  sectionLabel: { marginBottom: Spacing.sm, marginTop: Spacing.xs },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginBottom: Spacing.sm,
  },
  input: { flex: 1, paddingVertical: Spacing.md },

  list: { gap: Spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm },
  rowText: { flex: 1, gap: 1 },
  check: {
    width: 24,
    height: 24,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: { marginVertical: Spacing.lg },
  empty: { textAlign: 'center', paddingVertical: Spacing.lg },

  externalRow: { flexDirection: 'row', gap: Spacing.lg },
  externalAction: { alignItems: 'center', gap: Spacing.xs },
  externalIcon: {
    width: EXTERNAL_ICON,
    height: EXTERNAL_ICON,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
