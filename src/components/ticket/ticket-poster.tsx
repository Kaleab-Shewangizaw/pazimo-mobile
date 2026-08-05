import { forwardRef, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { G, Path, Rect, Text as SvgText } from 'react-native-svg';

import { QrGlyph, qrModuleCount } from '@/components/ticket/pazimo-qr';
import { type TicketGeometry, tearLinePath, ticketPath } from '@/components/ticket/ticket-path';
import { FontFamily } from '@/constants/theme';
import { formatTicketDate } from '@/lib/date';
import { formatPrice } from '@/lib/pricing';
import { ticketQrPayload } from '@/lib/qr';
import type { Ticket } from '@/types/api';

/**
 * The downloadable ticket: the same artefact as `TicketView`, redrawn as one
 * SVG so `react-native-svg`'s `toDataURL` can rasterise it into a PNG the buyer
 * can keep.
 *
 * It is a separate composition rather than a screenshot of the live card
 * because a capture would inherit the ambient backdrop, the safe-area padding
 * and whatever the scroll position happened to be. This draws at a fixed size
 * with its own margins, so the saved image looks the same from every screen it
 * is triggered on — and needs no native screenshot module to do it.
 *
 * Mounted off-screen by `useTicketDownload`; nothing renders it directly.
 */

const WIDTH = 900;
const PAD = 64;
const INNER = WIDTH - PAD * 2;

const TITLE_SIZE = 54;
const TITLE_LEADING = 62;
const BODY_SIZE = 26;
const LABEL_SIZE = 22;
const VALUE_SIZE = 30;

const PLATE = 560;
const ROW_HEIGHT = 92;

const INK = '#FFFFFF';
const MUTED = 'rgba(255,255,255,0.62)';
const FAINT = 'rgba(255,255,255,0.40)';
const CARD = '#0E0E11';

/**
 * SVG text does not wrap, so lines are broken here. Comic Relief's bold cut
 * averages a little over half its point size per glyph; the estimate only has
 * to be close, because the title is centred and has margin on both sides.
 */
const AVG_GLYPH = 0.56;

function wrap(text: string, size: number, maxWidth: number, maxLines: number): string[] {
  const perLine = Math.max(8, Math.floor(maxWidth / (size * AVG_GLYPH)));
  const lines: string[] = [];
  let line = '';

  for (const word of text.split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length <= perLine) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = word;
    if (lines.length === maxLines) break;
  }
  if (line && lines.length < maxLines) lines.push(line);

  if (lines.length === maxLines) {
    const last = lines[maxLines - 1];
    const consumed = lines.join(' ').length;
    if (consumed < text.length) lines[maxLines - 1] = `${last.slice(0, perLine - 1)}…`;
  }
  return lines;
}

export type TicketPosterProps = { ticket: Ticket };

export const TicketPoster = forwardRef<Svg, TicketPosterProps>(function TicketPoster(
  { ticket },
  ref,
) {
  const payload = useMemo(() => ticketQrPayload(ticket), [ticket]);
  // Encoding is the expensive part of drawing a QR; the glyph memoises its own,
  // so the module count is memoised here rather than recomputed every render.
  const modules = useMemo(() => qrModuleCount(payload), [payload]);
  const titleLines = useMemo(
    () => wrap(ticket.event.title, TITLE_SIZE, INNER - 40, 3),
    [ticket.event.title],
  );

  const venue =
    [ticket.event.location?.address, ticket.event.location?.city].filter(Boolean).join(', ') ||
    'Announced by the organizer';

  const rows: { label: string; value: string }[] = [
    { label: 'VENUE', value: venue },
    {
      label: 'DATE & TIME',
      value: formatTicketDate(ticket.event.startDate, ticket.event.startTime) || 'To be announced',
    },
    {
      label: ticket.ticketType ? ticket.ticketType.toUpperCase() : 'PRICE',
      value: formatPrice(ticket.price, ticket.currency),
    },
  ];

  // Everything below the title stacks at a fixed rhythm, so the canvas height
  // is derived rather than guessed — a three-line title grows the image instead
  // of overflowing it.
  const titleTop = PAD + TITLE_SIZE;
  const titleBlock = titleLines.length * TITLE_LEADING;
  const subtitleY = titleTop + titleBlock + 6;
  const referenceY = subtitleY + 44;
  const plateY = referenceY + 44;
  const perforationY = plateY + PLATE + 56;
  const rowsTop = perforationY + 40;
  const height = rowsTop + rows.length * ROW_HEIGHT + PAD;

  const plateX = (WIDTH - PLATE) / 2;
  const qrSize = PLATE * 0.8;

  // The saved image carries the same silhouette as the card on screen, so what
  // lands in someone's photo roll is recognisably the ticket they were shown.
  const geometry: TicketGeometry = {
    width: WIDTH,
    height,
    radius: 48,
    tearY: perforationY,
    notch: 28,
  };

  return (
    <Svg ref={ref} width={WIDTH} height={height} viewBox={`0 0 ${WIDTH} ${height}`}>
      <Path
        d={ticketPath(geometry)}
        fill={CARD}
        stroke="rgba(255,255,255,0.16)"
        strokeWidth={2}
      />

      {titleLines.map((line, index) => (
        <SvgText
          key={line}
          x={WIDTH / 2}
          y={titleTop + index * TITLE_LEADING}
          fill={INK}
          fontSize={TITLE_SIZE}
          fontFamily={FontFamily.bold}
          textAnchor="middle">
          {line}
        </SvgText>
      ))}

      <SvgText
        x={WIDTH / 2}
        y={subtitleY}
        fill={MUTED}
        fontSize={BODY_SIZE}
        fontFamily={FontFamily.regular}
        textAnchor="middle">
        Show this QR code at the event entrance
      </SvgText>
      <SvgText
        x={WIDTH / 2}
        y={referenceY}
        fill={FAINT}
        fontSize={LABEL_SIZE}
        fontFamily={FontFamily.regular}
        textAnchor="middle">
        {`Ticket: ${ticket.ticketId}`}
      </SvgText>

      <Rect x={plateX} y={plateY} width={PLATE} height={PLATE} rx={40} fill="#FFFFFF" />
      {/* The code draws in module units, so it is placed and scaled here rather
          than nested in its own viewport. */}
      <G
        transform={`translate(${plateX + (PLATE - qrSize) / 2}, ${
          plateY + (PLATE - qrSize) / 2
        }) scale(${qrSize / modules})`}>
        <QrGlyph value={payload} />
      </G>

      {/* The tear line, and the one flourish that says "ticket" rather than
          "receipt" — drawn between the notches the outline already punched. */}
      <Path
        d={tearLinePath(geometry)}
        stroke="rgba(255,255,255,0.20)"
        strokeWidth={2}
        strokeDasharray="12 12"
        fill="none"
      />

      {rows.map((row, index) => (
        <SvgText
          key={`${row.label}-label`}
          x={PAD}
          y={rowsTop + index * ROW_HEIGHT}
          fill={FAINT}
          fontSize={LABEL_SIZE}
          fontFamily={FontFamily.regular}
          letterSpacing={1.6}>
          {row.label}
        </SvgText>
      ))}
      {rows.map((row, index) => (
        <SvgText
          key={`${row.label}-value`}
          x={PAD}
          y={rowsTop + index * ROW_HEIGHT + 38}
          fill={INK}
          fontSize={VALUE_SIZE}
          fontFamily={FontFamily.semibold}>
          {wrap(row.value, VALUE_SIZE, INNER, 1)[0] ?? ''}
        </SvgText>
      ))}
    </Svg>
  );
});

/**
 * Parked off-screen rather than hidden with `opacity: 0` or `display: none` —
 * a view that isn't drawn has nothing for `toDataURL` to rasterise.
 */
export const posterHostStyle = StyleSheet.create({
  host: { position: 'absolute', left: -WIDTH * 2, top: 0, width: WIDTH },
}).host;
