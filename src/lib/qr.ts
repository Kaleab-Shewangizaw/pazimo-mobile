// eslint-disable-next-line import/no-named-as-default -- the package's default export *is* the factory; `stringToBytes` hangs off it as a field.
import qrcode from 'qrcode-generator';

import type { Ticket } from '@/types/api';

/**
 * The QR is regenerated on the device rather than shown from `ticket.qrCode`.
 *
 * That field is a `data:image/svg+xml;base64,...` string, and React Native's
 * `<Image>` cannot render SVG from a data URL at all — so it is unusable here
 * regardless of styling. Re-encoding also lets the code carry the app's own
 * look (round modules, Pazimo mark in the middle) while staying byte-identical
 * in *payload*, which is the only part a scanner reads.
 */

/**
 * The library's default byte encoder is latin-1, which would mangle any
 * non-ASCII name in the payload. The backend encodes UTF-8, so match it — a
 * one-time global on the factory, the way `qrcode_UTF8.js` does it.
 *
 * The encoder is spelled out here rather than taken from
 * `qrcode.stringToBytesFuncs['UTF-8']`, which is the field that add-on actually
 * reads. That table exists **only in the package's CommonJS build**: the ESM
 * build defines `qrcode.stringToBytes` and never populates `stringToBytesFuncs`
 * at all. Metro resolves the `import` condition for the web and SSR bundles, so
 * that spelling evaluated `undefined['UTF-8']` at module scope and threw —
 * and because expo-router validates the whole route tree during static render,
 * it took down every route, not just Tickets. Native resolves `require` and got
 * the CommonJS build, which is why it only ever broke on web.
 *
 * Byte-for-byte the same output as the library's own UTF-8 function.
 */
// eslint-disable-next-line import/no-named-as-default-member -- a field on the factory object, not a module export.
qrcode.stringToBytes = function toUTF8Bytes(text: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i += 1) {
    let code = text.charCodeAt(i);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0xd800 || code >= 0xe000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      // A surrogate pair spells one code point across two UTF-16 units, so the
      // second unit is consumed here rather than by the next iteration.
      i += 1;
      code = 0x10000 + (((code & 0x3ff) << 10) | (text.charCodeAt(i) & 0x3ff));
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    }
  }
  return bytes;
};

/**
 * Highest correction level, and not a style choice: the Pazimo mark covers the
 * middle of the symbol, and only 'H' (~30% recovery) reliably survives that.
 */
const ERROR_CORRECTION = 'H';

/** Auto-selects the smallest version that fits the payload. */
const AUTO_VERSION = 0;

function ticketHolderName(ticket: Ticket): string {
  if (ticket.isInvitation) return ticket.guestName ?? '';
  if (ticket.user && typeof ticket.user === 'object') {
    return [ticket.user.firstName, ticket.user.lastName].filter(Boolean).join(' ').trim();
  }
  return ticket.guestName ?? '';
}

/**
 * Mirrors the payload `Ticket.pre("save")` writes on the backend, key for key.
 *
 * Only `tid` is actually validated at the door (`validateQRCode` accepts `tid`
 * or `ticketId` and looks the ticket up server-side); the rest is what the
 * scanner app shows the person holding the reader, so it is worth keeping
 * faithful even though a mismatch would not block entry.
 */
export function ticketQrPayload(ticket: Ticket): string {
  return JSON.stringify({
    tid: ticket.ticketId,
    nm: ticketHolderName(ticket),
    tp: ticket.isInvitation ? 'guest' : 'user',
    tip: ticket.ticketType,
    qty: ticket.purchaseQuantity,
  });
}

export type QrMatrix = {
  /** Modules per side, excluding any quiet zone. */
  count: number;
  isDark: (row: number, col: number) => boolean;
};

export function encodeQr(value: string): QrMatrix {
  const qr = qrcode(AUTO_VERSION, ERROR_CORRECTION);
  qr.addData(value);
  qr.make();
  return { count: qr.getModuleCount(), isDark: (row, col) => qr.isDark(row, col) };
}
