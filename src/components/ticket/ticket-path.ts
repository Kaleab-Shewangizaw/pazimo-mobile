/**
 * The ticket silhouette: a rounded card bitten by a semicircular notch on each
 * side, at the line where the stub tears off.
 *
 * Kept as a pure function of geometry — no React, no `react-native-svg` — so the
 * same outline can fill a card, mask the glow beam that runs around its edge,
 * and print into the downloadable PNG without three shapes drifting apart.
 */

export type TicketGeometry = {
  width: number;
  height: number;
  /** Corner radius of the card. */
  radius: number;
  /** Distance from the top edge to the centre of the notches. */
  tearY: number;
  /** Radius of the bite taken out of each side. */
  notch: number;
};

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Traced clockwise from the top-left corner. Both notches use `sweep-flag 0`:
 * travelling down the right edge and up the left edge, that is the direction
 * that curves *into* the card, which is what makes the bite concave on both
 * sides rather than a bump on one.
 */
export function ticketPath({ width, height, radius, tearY, notch }: TicketGeometry): string {
  const w = r2(width);
  const h = r2(height);
  // A notch or corner larger than the space it sits in would fold the outline
  // back on itself, so both are clamped to what the box can actually hold.
  const c = r2(Math.max(0, Math.min(radius, w / 2, h / 2)));
  const n = r2(Math.max(0, Math.min(notch, w / 2)));
  const y = r2(Math.max(c + n, Math.min(tearY, h - c - n)));

  return [
    `M${c},0`,
    `H${r2(w - c)}`,
    `A${c},${c} 0 0 1 ${w},${c}`,
    `V${r2(y - n)}`,
    n > 0 ? `A${n},${n} 0 0 0 ${w},${r2(y + n)}` : '',
    `V${r2(h - c)}`,
    `A${c},${c} 0 0 1 ${r2(w - c)},${h}`,
    `H${c}`,
    `A${c},${c} 0 0 1 0,${r2(h - c)}`,
    `V${r2(y + n)}`,
    n > 0 ? `A${n},${n} 0 0 0 0,${r2(y - n)}` : '',
    `V${c}`,
    `A${c},${c} 0 0 1 ${c},0`,
    'Z',
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * The same outline pushed inward by `inset` all round — the face that sits on
 * top of the glow, leaving exactly `inset` of lit edge showing.
 *
 * Note the notch grows rather than shrinks: it is a hole, so moving the
 * boundary into the material moves that arc *away* from its own centre.
 */
export function insetGeometry(geometry: TicketGeometry, inset: number): TicketGeometry {
  return {
    width: geometry.width - inset * 2,
    height: geometry.height - inset * 2,
    radius: geometry.radius - inset,
    tearY: geometry.tearY - inset,
    notch: geometry.notch + inset,
  };
}

export function insetTicketPath(geometry: TicketGeometry, inset: number): string {
  return ticketPath(insetGeometry(geometry, inset));
}

/**
 * Everything below the tear: the stub's counterfoil, cut off at the waist.
 *
 * Used to mask artwork into the lower half without it spilling into the notches
 * — the bite is only half-eaten at that height, and a plain rounded rectangle
 * would fill the other half back in and lose the shape.
 */
export function ticketFootPath({
  width,
  height,
  radius,
  tearY,
  notch,
}: TicketGeometry): string {
  const w = r2(width);
  const h = r2(height);
  const c = r2(Math.max(0, Math.min(radius, w / 2, h / 2)));
  const n = r2(Math.max(0, Math.min(notch, w / 2)));
  const y = r2(Math.max(c + n, Math.min(tearY, h - c - n)));

  // The cut runs between the deepest points of the two notches, then follows the
  // outline round — so these arcs are literally the lower halves of the same
  // notches `ticketPath` traces, down to the sweep flag.
  return [
    `M${n},${y}`,
    `H${r2(w - n)}`,
    n > 0 ? `A${n},${n} 0 0 0 ${w},${r2(y + n)}` : '',
    `V${r2(h - c)}`,
    `A${c},${c} 0 0 1 ${r2(w - c)},${h}`,
    `H${c}`,
    `A${c},${c} 0 0 1 0,${r2(h - c)}`,
    `V${r2(y + n)}`,
    n > 0 ? `A${n},${n} 0 0 0 ${n},${y}` : '',
    'Z',
  ]
    .filter(Boolean)
    .join(' ');
}

/** The perforation itself, drawn between the two notches. */
export function tearLinePath({ width, tearY, notch }: TicketGeometry): string {
  const start = r2(notch + 8);
  const end = r2(width - notch - 8);
  return end > start ? `M${start},${r2(tearY)} H${end}` : '';
}
