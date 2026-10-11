import { useQuery } from '@tanstack/react-query';
import { getPermissionsAsync, requestPermissionsAsync } from 'expo-contacts';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking } from 'react-native';

import { CONTACT_MATCH_CHUNK, matchContacts } from '@/api/messages';
import { queryKeys } from '@/queries/keys';
import { readDeviceContacts, type DeviceContact } from '@/lib/device-contacts';
import { useAuthStore } from '@/stores/use-auth-store';
import type { ContactMatch, ShareUser } from '@/types/api';

/**
 * - `unknown`: still checking.
 * - `undetermined`: never asked — the screen shows its own explainer first,
 *   so the OS prompt only appears after a deliberate tap.
 * - `blocked`: refused and the OS won't ask again; only Settings can fix it.
 */
export type ContactsAccess = 'unknown' | 'undetermined' | 'granted' | 'denied' | 'blocked';

function toAccess(response: { granted: boolean; canAskAgain: boolean; status: string }): ContactsAccess {
  if (response.granted) return 'granted';
  if (response.status === 'undetermined') return 'undetermined';
  return response.canAskAgain ? 'denied' : 'blocked';
}

/**
 * Read on mount, and again whenever the app comes back to the foreground —
 * the "Open Settings" path leaves the app, and the grant made there has to
 * show up on return without the user backing out and in again.
 */
export function useContactsAccess() {
  const [access, setAccess] = useState<ContactsAccess>('unknown');

  useEffect(() => {
    const check = () => {
      getPermissionsAsync()
        .then((response) => setAccess(toAccess(response)))
        .catch(() => setAccess('denied'));
    };
    check();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => subscription.remove();
  }, []);

  const request = useCallback(async () => {
    if (access === 'blocked') {
      await Linking.openSettings();
      return;
    }
    const response = await requestPermissionsAsync();
    setAccess(toAccess(response));
  }, [access]);

  return { access, request };
}

export type PazimoContact = { contact: DeviceContact; user: ShareUser };

export type AddressBook = {
  /** One row per Pazimo account, under the name it's saved as on this phone. */
  onPazimo: PazimoContact[];
  /** Everyone else with a number — invite candidates. */
  notOnPazimo: DeviceContact[];
};

async function loadAddressBook(myId: string | undefined): Promise<AddressBook> {
  const contacts = await readDeviceContacts();
  const phones = [...new Set(contacts.flatMap((contact) => contact.phones))];

  const matches: ContactMatch[] = [];
  for (let i = 0; i < phones.length; i += CONTACT_MATCH_CHUNK) {
    matches.push(...(await matchContacts(phones.slice(i, i + CONTACT_MATCH_CHUNK))));
  }
  const userByPhone = new Map(matches.map((match) => [match.phone, match.user]));

  const onPazimo: PazimoContact[] = [];
  const notOnPazimo: DeviceContact[] = [];
  // Two saved contacts can be the same account (a number saved twice under
  // different names) — the first one, in the address book's own sort order,
  // wins, so the list never shows one person twice.
  const seenUserIds = new Set<string>();

  for (const contact of contacts) {
    const user = contact.phones.map((phone) => userByPhone.get(phone)).find(Boolean);
    if (!user) {
      notOnPazimo.push(contact);
    } else if (user._id !== myId && !seenUserIds.has(user._id)) {
      seenUserIds.add(user._id);
      onPazimo.push({ contact, user });
    }
  }

  return { onPazimo, notOnPazimo };
}

/**
 * The phone's contacts split into "on Pazimo" and "invite". Only runs once
 * contacts access is granted and someone is signed in; kept for five minutes
 * so reopening the New message screen doesn't re-upload the whole address
 * book, with pull-to-refresh for anyone who just added a contact.
 */
export function useAddressBook(access: ContactsAccess) {
  const token = useAuthStore((s) => s.token);
  const myId = useAuthStore((s) => s.user?._id);

  const query = useQuery({
    queryKey: queryKeys.addressBook,
    queryFn: () => loadAddressBook(myId),
    enabled: Boolean(token) && access === 'granted',
    staleTime: 5 * 60 * 1000,
  });

  return query;
}
