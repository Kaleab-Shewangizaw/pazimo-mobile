import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import type Svg from 'react-native-svg';

import type { Ticket } from '@/types/api';

/**
 * Turns the off-screen `TicketPoster` into a PNG and hands it to the system
 * share sheet — which is where "save to photos", "send on Telegram" and
 * "print" all live, so one call covers every way a person actually keeps a
 * ticket.
 *
 * `toDataURL` is `react-native-svg`'s own rasteriser, so this needs no
 * screenshot module and no extra native dependency: the poster is already a
 * drawing, and this asks it to draw itself into a bitmap instead of onto the
 * screen.
 */

/** Rasterised at 2× so the QR stays crisp when the image is zoomed or printed. */
const SCALE = 2;

/** Ceiling on the rasterise callback, which has no error channel of its own. */
const RENDER_TIMEOUT_MS = 10_000;

/** A beat for the poster to reach the native side before it can be captured. */
const LAYOUT_SETTLE_MS = 60;

function safeName(ticket: Ticket): string {
  const slug = ticket.event.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return `pazimo-${slug || 'ticket'}-${ticket.ticketId}.png`;
}

async function rasterise(poster: Svg): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('render timed out')), RENDER_TIMEOUT_MS);
    poster.toDataURL(
      (data) => {
        clearTimeout(timeout);
        resolve(data);
      },
      { scale: SCALE },
    );
  });
}

async function saveAndShare(ticket: Ticket, base64: string) {
  const file = new File(Paths.cache, safeName(ticket));
  // Overwrite rather than delete-then-create: downloading the same ticket
  // twice must not fail on the leftover from the first time.
  file.create({ overwrite: true });
  file.write(base64, { encoding: 'base64' });

  await Sharing.shareAsync(file.uri, {
    mimeType: 'image/png',
    UTI: 'public.png',
    dialogTitle: 'Save your ticket',
  });
}

export function useTicketDownload(ticket: Ticket | undefined) {
  const posterRef = useRef<Svg>(null);
  const [saving, setSaving] = useState(false);
  // Guards re-entry without putting `saving` in the callback's deps, which
  // would give `download` a new identity mid-flight.
  const busy = useRef(false);

  const download = useCallback(async () => {
    const poster = posterRef.current;
    if (!ticket || !poster || busy.current) return;

    busy.current = true;
    setSaving(true);
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Not supported', 'This device cannot share files.');
        return;
      }
      await saveAndShare(ticket, await rasterise(poster));
    } catch {
      Alert.alert('Could not save', 'We could not prepare that ticket image. Try again.');
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }, [ticket]);

  return { posterRef, download, saving };
}

/**
 * Downloading straight from a list.
 *
 * A row cannot own a poster — mounting one full ticket drawing per row would
 * cost more than the list itself. Instead the screen keeps a single poster
 * slot, and `request` fills it with whichever ticket was tapped; the capture
 * runs once that has rendered, then the slot empties again.
 */
export function useTicketDownloadQueue() {
  const [pending, setPending] = useState<Ticket | null>(null);
  const { posterRef, download } = useTicketDownload(pending ?? undefined);

  useEffect(() => {
    if (!pending) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      download().finally(() => {
        if (!cancelled) setPending(null);
      });
    }, LAYOUT_SETTLE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [pending, download]);

  return { posterRef, pending, request: setPending, busyTicketId: pending?._id ?? null };
}
