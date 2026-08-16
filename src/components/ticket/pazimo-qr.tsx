import { memo, useId, useMemo } from 'react';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  Image as SvgImage,
  Path,
  Rect,
} from 'react-native-svg';

import { encodeQr } from '@/lib/qr';

/**
 * The ticket's QR code, drawn the way Pazimo draws it: round modules, round
 * finder eyes, and the mark sitting in the middle.
 *
 * Every data module is emitted into a *single* `<Path>` rather than its own
 * `<Circle>`. A level-H code for a ticket payload is around 37×37, so the naive
 * version mounts well over a thousand native views for one image — enough to be
 * felt on the reveal animation. One path draws the same pixels as one node.
 */

const MARK = require('@/assets/images/pazimo-mark.png');

/** Module radius. Under half a module so neighbours read as dots, not a blob. */
const DOT_RADIUS = 0.44;

/** Side of the cleared square behind the mark, as a share of the symbol. */
const LOGO_SHARE = 0.24;

/** Extra clearance around the mark so dots never touch its plate. */
const LOGO_MARGIN = 0.6;

/** The mark inside its white plate, as a share of the plate. */
const MARK_INSET = 0.14;

/** Two decimals is under a thousandth of a module at any size we render at. */
const round = (n: number) => Math.round(n * 100) / 100;

function dotPath(cx: number, cy: number, r: number): string {
  const x = round(cx - r);
  const y = round(cy);
  const d = round(r * 2);
  return `M${x},${y}a${r},${r} 0 1,0 ${d},0a${r},${r} 0 1,0 ${-d},0`;
}

function useQrGeometry(value: string) {
  return useMemo(() => {
    const matrix = encodeQr(value);
    const n = matrix.count;

    // The three 7×7 alignment squares, addressed by their top-left module.
    const finderOrigins = [
      { row: 0, col: 0 },
      { row: 0, col: n - 7 },
      { row: n - 7, col: 0 },
    ];
    const inFinder = (row: number, col: number) =>
      finderOrigins.some(
        (o) => row >= o.row && row < o.row + 7 && col >= o.col && col < o.col + 7,
      );

    // A square of modules is cleared for the mark. Level-H recovery is what
    // makes this safe — the symbol still decodes with this much of it missing.
    const logoSide = Math.max(5, Math.round(n * LOGO_SHARE));
    const logoStart = (n - logoSide) / 2;
    const clearedStart = logoStart - LOGO_MARGIN;
    const clearedEnd = logoStart + logoSide + LOGO_MARGIN;
    const inLogo = (row: number, col: number) =>
      row + 1 > clearedStart && row < clearedEnd && col + 1 > clearedStart && col < clearedEnd;

    let dots = '';
    for (let row = 0; row < n; row += 1) {
      for (let col = 0; col < n; col += 1) {
        if (!matrix.isDark(row, col)) continue;
        if (inFinder(row, col) || inLogo(row, col)) continue;
        dots += dotPath(col + 0.5, row + 0.5, DOT_RADIUS);
      }
    }

    return {
      count: n,
      dots,
      // Centre of each eye, in module coordinates.
      finders: finderOrigins.map((o) => ({ cx: o.col + 3.5, cy: o.row + 3.5 })),
      logo: { x: logoStart, y: logoStart, side: logoSide },
    };
  }, [value]);
}

export type QrGlyphProps = {
  value: string;
  color?: string;
  /** Plate behind the mark; match the surface the code sits on. */
  background?: string;
};

/**
 * The code as a bare `<G>` in module coordinates, for embedding in a larger
 * drawing. Callers are responsible for the transform that places and scales it,
 * and for the quiet zone around it.
 */
function QrGlyphImpl({ value, color = '#0A0A0B', background = '#FFFFFF' }: QrGlyphProps) {
  const { dots, finders, logo } = useQrGeometry(value);
  // Two codes can be mounted at once (the visible one and the export poster),
  // and a duplicate clip-path id would make one of them mask against the other.
  const clipId = `qr-mark-${useId()}`;
  const markInset = logo.side * MARK_INSET;

  return (
    <G>
      <Defs>
        <ClipPath id={clipId}>
          <Rect
            x={logo.x + markInset}
            y={logo.y + markInset}
            width={logo.side - markInset * 2}
            height={logo.side - markInset * 2}
            rx={logo.side * 0.22}
          />
        </ClipPath>
      </Defs>

      <Path d={dots} fill={color} />

      {finders.map((eye) => (
        <Circle
          key={`eye-${eye.cx}-${eye.cy}`}
          cx={eye.cx}
          cy={eye.cy}
          // The spec's eye is a 7×7 ring one module thick; a circle stroked on
          // the ring's centre line occupies exactly the same modules.
          r={3}
          strokeWidth={1}
          stroke={color}
          fill="none"
        />
      ))}
      {finders.map((eye) => (
        <Circle key={`pupil-${eye.cx}-${eye.cy}`} cx={eye.cx} cy={eye.cy} r={1.5} fill={color} />
      ))}

      <Rect
        x={logo.x}
        y={logo.y}
        width={logo.side}
        height={logo.side}
        rx={logo.side * 0.28}
        fill={background}
      />
      <SvgImage
        x={logo.x + markInset}
        y={logo.y + markInset}
        width={logo.side - markInset * 2}
        height={logo.side - markInset * 2}
        href={MARK}
        preserveAspectRatio="xMidYMid slice"
        clipPath={`url(#${clipId})`}
      />
    </G>
  );
}

export const QrGlyph = memo(QrGlyphImpl);

export type PazimoQrProps = QrGlyphProps & {
  /** Rendered edge length in points. The quiet zone is the caller's padding. */
  size: number;
};

/** The standalone code, sized in points. */
function PazimoQrImpl({ value, size, ...rest }: PazimoQrProps) {
  const { count } = useQrGeometry(value);
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${count} ${count}`}>
      <QrGlyph value={value} {...rest} />
    </Svg>
  );
}

export const PazimoQr = memo(PazimoQrImpl);

/** Modules per side — callers embedding `QrGlyph` need it to build the transform. */
export function qrModuleCount(value: string): number {
  return encodeQr(value).count;
}
