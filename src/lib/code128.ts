/**
 * Code 128 (subset B) encoding, for drawing a refill pickup code on the device
 * instead of loading the server's `barcode.png`.
 *
 * Same symbology the backend renders (`barcodeRenderer.js`, bwip-js `code128`)
 * and the same text, so the counter's scanner reads it identically — drawing
 * it here just means the bars can be sized to the plate rather than cropped
 * out of a fixed-aspect bitmap.
 *
 * Subset B covers printable ASCII (32–127), which is everything a reference
 * code (`utils/referenceCode.js`: six alphanumerics) can contain.
 */

/**
 * Bar/space widths for symbol values 0–106, in modules, bar first. Each symbol
 * is 11 modules wide; the stop (106) is 13.
 */
const PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
];

const START_B = 104;
const STOP = 106;

export type Code128Bars = {
  /** Total width in modules, excluding any quiet zone. */
  modules: number;
  /** Each dark bar as `[x, width]` in modules. */
  bars: [number, number][];
};

/** Returns null when `text` has a character outside subset B. */
export function encodeCode128(text: string): Code128Bars | null {
  const values: number[] = [START_B];
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (code < 32 || code > 127) return null;
    values.push(code - 32);
  }

  // Weighted sum: the start counts once, each data symbol by its position.
  let checksum = START_B;
  for (let i = 1; i < values.length; i += 1) checksum += values[i] * i;
  values.push(checksum % 103, STOP);

  const bars: [number, number][] = [];
  let x = 0;
  for (const value of values) {
    const pattern = PATTERNS[value];
    for (let i = 0; i < pattern.length; i += 1) {
      const width = Number(pattern[i]);
      // Even positions are bars, odd are spaces.
      if (i % 2 === 0) bars.push([x, width]);
      x += width;
    }
  }

  return { modules: x, bars };
}
