import { Contact, ContactField, ContactsSortOrder } from 'expo-contacts';

/**
 * The device address book, reduced to what the New message screen needs —
 * a name to show, the numbers to match against Pazimo accounts (see
 * `matchContacts` in `api/messages.ts`) and to send an invite to, and the
 * photo saved on the phone. Read with the class-based `Contact` API; the
 * old `getContactsAsync` throws on SDK 57 unless imported from `/legacy`.
 */
export type DeviceContact = {
  id: string;
  name: string;
  /** Raw, as saved on the phone — the server normalizes, and echoes each match back verbatim. */
  phones: string[];
  thumbnail: string | null;
};

const FIELDS = [ContactField.FULL_NAME, ContactField.PHONES, ContactField.THUMBNAIL] as const;

export async function readDeviceContacts(): Promise<DeviceContact[]> {
  const details = await Contact.getAllDetails(FIELDS, { sortOrder: ContactsSortOrder.GivenName });

  const contacts: DeviceContact[] = [];
  for (const entry of details) {
    // One person often has the same number saved twice ("mobile" and
    // "main", or with and without the country code) — trimmed-exact
    // duplicates are dropped here, format variants are the server's job.
    const phones = [
      ...new Set((entry.phones ?? []).map((phone) => phone.number?.trim()).filter(Boolean)),
    ] as string[];
    // A contact with no number can neither be matched nor invited by SMS.
    if (phones.length === 0) continue;

    contacts.push({
      id: entry.id,
      name: entry.fullName?.trim() || phones[0],
      phones,
      thumbnail: entry.thumbnail ?? null,
    });
  }
  return contacts;
}
