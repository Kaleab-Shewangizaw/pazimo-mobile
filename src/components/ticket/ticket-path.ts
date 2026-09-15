/**
 * ticket-path.ts
 *
 * The ticket silhouette is defined in ONE place.
 *
 * The frame, glass mask, tear line and artwork all use this geometry.
 */

export type TicketGeometry = {
  width: number;
  height: number;
  radius: number;
  tearY: number;
  notch: number;
};

const MIN_RADIUS = 1;
const MIN_NOTCH = 1;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Normalizes geometry so every consumer works from exactly the same values.
 */
function normalizeGeometry(g: TicketGeometry): TicketGeometry {
  const width = Math.max(0, g.width);
  const height = Math.max(0, g.height);

  if (width <= 0 || height <= 0) {
    return {
      width,
      height,
      radius: 0,
      tearY: 0,
      notch: 0,
    };
  }

  const radius = clamp(g.radius, MIN_RADIUS, Math.min(width, height) / 2);

  const notch = clamp(
    g.notch,
    MIN_NOTCH,
    Math.min(width / 2, Math.max(1, height / 4)),
  );

  const minTearY = radius + notch;
  const maxTearY = Math.max(minTearY, height - radius - notch);

  const tearY = clamp(g.tearY, minTearY, maxTearY);

  return {
    width,
    height,
    radius,
    tearY,
    notch,
  };
}

/**
 * Main ticket silhouette.
 *
 * The path starts at the top-left horizontal tangent and travels clockwise.
 *
 * The two side notches are true semicircular cut-outs.
 *
 * IMPORTANT:
 * Do not recreate this shape anywhere else.
 */
export function ticketPath(input: TicketGeometry): string {
  const g = normalizeGeometry(input);

  const { width: w, height: h, radius: r, tearY: y, notch: n } = g;

  if (w <= 0 || h <= 0) {
    return '';
  }

  return [
    // ─────────────────────────────────────────────────────────────
    // TOP
    // ─────────────────────────────────────────────────────────────

    `M ${r} 0`,
    `H ${w - r}`,

    // Top-right corner
    `A ${r} ${r} 0 0 1 ${w} ${r}`,

    // Right side → notch
    `V ${y - n}`,

    // Right concave notch
    `A ${n} ${n} 0 0 0 ${w} ${y + n}`,

    // Right side → bottom
    `V ${h - r}`,

    // Bottom-right corner
    `A ${r} ${r} 0 0 1 ${w - r} ${h}`,

    // Bottom
    `H ${r}`,

    // Bottom-left corner
    `A ${r} ${r} 0 0 1 0 ${h - r}`,

    // Left side → notch
    `V ${y + n}`,

    // Left concave notch
    `A ${n} ${n} 0 0 0 0 ${y - n}`,

    // Left side → top
    `V ${r}`,

    // Top-left corner
    `A ${r} ${r} 0 0 1 ${r} 0`,

    'Z',
  ].join(' ');
}

/**
 * Creates a mathematically smaller version of the ticket.
 *
 * The returned geometry is meant to be translated by the same inset amount.
 *
 * This lets us create:
 *
 *   outer ticket
 *   glass face
 *   inner bevel
 *
 * without inventing slightly different silhouettes.
 */
export function insetGeometry(
  input: TicketGeometry,
  inset: number,
): TicketGeometry {
  const g = normalizeGeometry(input);
  const amount = Math.max(0, inset);

  const width = Math.max(0, g.width - amount * 2);

  const height = Math.max(0, g.height - amount * 2);

  if (width <= 0 || height <= 0) {
    return {
      width,
      height,
      radius: 0,
      tearY: 0,
      notch: 0,
    };
  }

  const radius = clamp(
    Math.max(MIN_RADIUS, g.radius - amount),
    MIN_RADIUS,
    Math.min(width, height) / 2,
  );

  /**
   * Increasing the notch slightly keeps the bite visually deep
   * when the face moves inward.
   */
  const notch = clamp(
    g.notch + amount,
    MIN_NOTCH,
    Math.min(width / 2, Math.max(1, height / 4)),
  );

  const tearY = g.tearY - amount;

  return normalizeGeometry({
    width,
    height,
    radius,
    tearY,
    notch,
  });
}

/**
 * Lower ticket section — everything from the tear line down.
 *
 * This is used for the artwork/background beneath the perforation, which is
 * meant to run flush to the dashed line with no gap, so the split has to land
 * exactly on it rather than below the notch like the outer silhouette's own
 * bite does.
 *
 * Each notch is a true semicircle (its chord is exactly its diameter), so
 * splitting it at the tear line splits it exactly in half: the two "deepest
 * bite" points, `n` in from each edge at `y`, are precisely `n` away from
 * both notch ends, which is what makes each half its own valid arc of the
 * same radius rather than a lopsided one.
 */
export function ticketFootPath(input: TicketGeometry): string {
  const g = normalizeGeometry(input);

  const { width: w, height: h, radius: r, tearY: y, notch: n } = g;

  if (w <= 0 || h <= 0) {
    return '';
  }

  return [
    // Start at the deepest point of the left notch's bite, on the tear line.
    `M ${n} ${y}`,

    // Out to the edge at the notch's lower end. Sweep is 1, not 0, here and
    // on the matching right-side arc below: this traces the second half of
    // ticketPath()'s own notch arc, but starting from its *middle* instead
    // of its end — reversing which end is which flips the sweep flag needed
    // to keep tracing the same physical curve.
    `A ${n} ${n} 0 0 1 0 ${y + n}`,

    // Left edge down.
    `V ${h - r}`,

    // Bottom-left corner.
    `A ${r} ${r} 0 0 0 ${r} ${h}`,

    // Bottom edge.
    `H ${w - r}`,

    // Bottom-right corner.
    `A ${r} ${r} 0 0 0 ${w} ${h - r}`,

    // Right edge back to the notch's lower end.
    `V ${y + n}`,

    // In from the edge to the right notch's deepest point, on the tear line.
    `A ${n} ${n} 0 0 1 ${w - n} ${y}`,

    // Straight back across the tear line to close.
    `H ${n}`,

    'Z',
  ].join(' ');
}

/**
 * Upper ticket section — the exact complement of `ticketFootPath`, split at
 * the tear line rather than below it. Used to keep the glass material off the
 * artwork half: that half draws its own photo and scrim, and a second
 * frosted layer on top of it only re-blurs the photo and re-darkens the text
 * sitting over it.
 */
export function ticketHeadPath(input: TicketGeometry): string {
  const g = normalizeGeometry(input);

  const { width: w, height: h, radius: r, tearY: y, notch: n } = g;

  if (w <= 0 || h <= 0) {
    return '';
  }

  return [
    `M ${r} 0`,
    `H ${w - r}`,

    // Top-right corner.
    `A ${r} ${r} 0 0 1 ${w} ${r}`,

    // Right edge down to the notch's upper end.
    `V ${y - n}`,

    // In from the edge to the notch's deepest point, on the tear line —
    // the other half of the same bite ticketFootPath() takes below it.
    `A ${n} ${n} 0 0 0 ${w - n} ${y}`,

    // Straight across the tear line to the left notch's deepest point.
    `H ${n}`,

    // Out to the edge at the left notch's upper end.
    `A ${n} ${n} 0 0 0 0 ${y - n}`,

    // Left edge up to the top-left corner.
    `V ${r}`,
    `A ${r} ${r} 0 0 1 ${r} 0`,

    'Z',
  ].join(' ');
}

/**
 * Perforation line.
 *
 * It stops exactly where the notches begin.
 */
export function tearLinePath(input: TicketGeometry): string {
  const g = normalizeGeometry(input);

  if (g.width <= 0) {
    return '';
  }

  return [`M ${g.notch} ${g.tearY}`, `H ${g.width - g.notch}`].join(' ');
}

