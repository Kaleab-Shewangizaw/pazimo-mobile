import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

/**
 * A drawn map tile — dark streets, a river, a park and a pin — standing in
 * for a real map. It needs no API key and no network, renders instantly,
 * and sits in the app's black-and-white look in a way a bright Google tile
 * never would. It's a signpost, not navigation: tapping it opens the real
 * map (see `LocationCard`).
 *
 * Seeded by the place's name, so two venues never show the same tile and the
 * same venue always shows the same one.
 */

const W = 320;
const H = 140;
const PIN_X = W * 0.58;
const PIN_Y = H * 0.46;

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function MapPreviewImpl({ seed, height = H }: { seed: string; height?: number }) {
  const h = hash(seed || 'pazimo');
  // A few degrees of tilt and a nudge of the street grid — enough that each
  // place reads as its own neighbourhood.
  const angle = (h % 41) - 20;
  const shiftX = ((h >> 6) % 40) - 20;
  const shiftY = ((h >> 12) % 24) - 12;
  const riverHigh = (h >> 18) % 2 === 0;

  return (
    <View style={[styles.frame, { height }]}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
        <Rect x={0} y={0} width={W} height={H} fill="#101014" />

        <G transform={`rotate(${angle} ${PIN_X} ${PIN_Y}) translate(${shiftX} ${shiftY})`}>
          {/* City blocks */}
          {Array.from({ length: 6 }, (_, col) =>
            Array.from({ length: 4 }, (_, row) => (
              <Rect
                key={`${col}-${row}`}
                x={-60 + col * 76}
                y={-40 + row * 58}
                width={64}
                height={46}
                rx={6}
                fill="#16161B"
              />
            )),
          )}

          {/* A park */}
          <Rect x={92} y={76} width={64} height={46} rx={10} fill="#15201A" />

          {/* A river */}
          <Path
            d={
              riverHigh
                ? `M -80 ${H * 0.12} C 60 ${H * 0.4}, 180 ${-H * 0.05}, ${W + 80} ${H * 0.22}`
                : `M -80 ${H * 0.95} C 80 ${H * 0.62}, 200 ${H * 1.15}, ${W + 80} ${H * 0.78}`
            }
            stroke="#142130"
            strokeWidth={16}
            fill="none"
            strokeLinecap="round"
          />

          {/* Streets: the gaps between blocks, plus one avenue cutting across */}
          {Array.from({ length: 6 }, (_, i) => (
            <Path key={`v${i}`} d={`M ${-66 + i * 76} -60 V ${H + 60}`} stroke="#1F1F26" strokeWidth={5} />
          ))}
          {Array.from({ length: 5 }, (_, i) => (
            <Path key={`h${i}`} d={`M -80 ${-46 + i * 58} H ${W + 80}`} stroke="#1F1F26" strokeWidth={5} />
          ))}
          <Path d={`M -80 ${H + 30} L ${W + 80} -30`} stroke="#26262E" strokeWidth={9} />
        </G>

        {/* The way there — a dotted route into the pin */}
        <Path
          d={`M ${W * 0.08} ${H * 0.92} C ${W * 0.3} ${H * 0.9}, ${W * 0.36} ${H * 0.6}, ${PIN_X} ${PIN_Y + 6}`}
          stroke="rgba(255,255,255,0.45)"
          strokeWidth={2.5}
          strokeDasharray="1 7"
          strokeLinecap="round"
          fill="none"
        />

        {/* Pin: a soft halo, then the drop itself */}
        <Circle cx={PIN_X} cy={PIN_Y + 4} r={26} fill="rgba(255,255,255,0.06)" />
        <Circle cx={PIN_X} cy={PIN_Y + 4} r={14} fill="rgba(255,255,255,0.12)" />
        <Path
          d={`M ${PIN_X} ${PIN_Y + 6}
              C ${PIN_X - 3} ${PIN_Y - 2}, ${PIN_X - 11} ${PIN_Y - 8}, ${PIN_X - 11} ${PIN_Y - 17}
              A 11 11 0 1 1 ${PIN_X + 11} ${PIN_Y - 17}
              C ${PIN_X + 11} ${PIN_Y - 8}, ${PIN_X + 3} ${PIN_Y - 2}, ${PIN_X} ${PIN_Y + 6} Z`}
          fill="#FFFFFF"
        />
        <Circle cx={PIN_X} cy={PIN_Y - 17} r={4.2} fill="#101014" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { width: '100%', overflow: 'hidden' },
});

export const MapPreview = memo(MapPreviewImpl);
