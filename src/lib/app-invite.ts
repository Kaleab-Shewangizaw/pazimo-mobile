import { Share } from 'react-native';

import { Env } from '@/lib/env';

/**
 * Inviting someone who isn't on Pazimo yet — the New message screen's
 * "Invite" rows. Like Telegram, this goes out from the user's *own* SMS app
 * with the text prefilled, not from a backend SMS gateway: it costs Pazimo
 * nothing per invite, arrives from a number the recipient already knows
 * (so it doesn't read as spam), and can't be abused to text strangers in
 * bulk. Where there's no SMS app (iPad, simulator) it falls back to the OS
 * share sheet with the same text.
 */

export function buildAppInviteMessage(senderUsername?: string): string {
  const links = [
    Env.appStoreUrl ? `iPhone: ${Env.appStoreUrl}` : null,
    `Android: ${Env.playStoreUrl}`,
  ].filter(Boolean);

  return [
    "Hey! I'm using Pazimo for events, movies and drinks — join me so we can chat there.",
    senderUsername ? `Find me as @${senderUsername}.` : null,
    '',
    ...links,
  ]
    .filter((line) => line !== null)
    .join('\n');
}

export type AppInviteResult = 'sent' | 'cancelled' | 'unknown';

export async function sendAppInvite(
  phoneNumber: string,
  senderUsername?: string,
): Promise<AppInviteResult> {
  const message = buildAppInviteMessage(senderUsername);

  // Loaded lazily: `expo-sms` throws on import in a binary built without it
  // (an old dev client, or an Expo Go that doesn't bundle it), and a
  // top-level import would take the whole New message screen down with it
  // rather than just falling back to the share sheet below.
  const SMS = await import('expo-sms').catch(() => null);
  if (SMS && (await SMS.isAvailableAsync())) {
    const { result } = await SMS.sendSMSAsync([phoneNumber], message);
    return result;
  }

  const { action } = await Share.share({ message });
  return action === Share.dismissedAction ? 'cancelled' : 'unknown';
}
