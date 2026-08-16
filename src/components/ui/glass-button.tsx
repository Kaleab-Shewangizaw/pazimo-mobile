import { Ionicons } from '@expo/vector-icons';
import { type RefObject, memo } from 'react';
import { StyleSheet, type StyleProp, View, type ViewStyle } from 'react-native';

import { Glass } from '@/components/ui/glass';
import { Touchable, type TouchableProps } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * The floating controls from the design: a pill of real glass that the artwork
 * behind it shows through, carrying its icon in a disc.
 *
 * Two things do the heavy lifting. The `tint` is what keeps it reading as glass
 * over *any* photo — blur alone only softens what is behind it, so an untinted
 * pill over a blue sky is just a blue pill. And the drop shadow is what lifts it
 * off the surface: without it the pill looks painted onto the image rather than
 * hovering over it.
 *
 * All three share one recipe so the same material reads across the app, whether
 * it is chrome floating over a page or a chip riding on a card's cover art. Note
 * the blur budget in ui/glass.tsx: none of these pass a `blurTarget`, so on
 * Android they settle for the tint rather than sampling live content — which is
 * what makes them affordable inside a list row.
 */

type IconName = keyof typeof Ionicons.glyphMap;

/**
 * Washed into the glass, not stacked on top of it. Exported so surfaces that
 * can't use these components — a text field, say — still land on the same
 * material instead of eyeballing their own.
 */
export const GLASS_TINT = 'rgba(255, 255, 255, 0.14)';

/** The lift that separates floating chrome from the page under it. */
export const GLASS_SHADOW = {
  shadowColor: '#000000',
  shadowOpacity: 0.38,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 6 },
  elevation: 8,
} as const;

const metrics = {
  md: { disc: 24, padding: 7, text: Spacing.md, gap: Spacing.sm },
  lg: { disc: 32, padding: 8, text: Spacing.lg, gap: Spacing.sm + 2 },
} as const;

export type GlassButtonProps = Omit<TouchableProps, 'children'> & {
  label: string;
  icon?: IconName;
  /**
   * `solid` gives the icon a white disc — reserved for the one action a screen
   * is really asking for. `subtle` draws it bare on the glass, for quiet chrome.
   */
  iconTone?: 'solid' | 'subtle';
  size?: 'md' | 'lg';
  blurTarget?: RefObject<View | null>;
  /**
   * Fills the pill solid white instead of glass. For a control that holds a
   * chosen state — the app reserves solid white for exactly that (see the note
   * on the palette in constants/theme).
   */
  selected?: boolean;
};

function GlassButtonImpl({
  label,
  icon,
  iconTone = 'subtle',
  size = 'md',
  blurTarget,
  selected = false,
  disabled,
  style,
  ...rest
}: GlassButtonProps) {
  const theme = useTheme();
  const solid = iconTone === 'solid';
  const m = metrics[size];
  const foreground = selected ? theme.onBrand : '#FFFFFF';

  const bodyStyle = [
    styles.body,
    {
      // A bare glyph reads as part of the label, so it sits closer to it than a
      // disc does.
      gap: icon && !solid ? 4 : m.gap,
      paddingVertical: m.padding,
      // A disc sits flush against the pill's inner edge; anything else needs
      // the full optical inset.
      paddingLeft: icon ? (solid ? m.padding : m.text - 2) : m.text,
      paddingRight: m.text,
    },
  ];

  const content = (
    <>
      {icon && solid ? (
        <View style={[styles.disc, { width: m.disc, height: m.disc, backgroundColor: theme.brand }]}>
          <Ionicons name={icon} size={Math.round(m.disc * 0.54)} color={theme.onBrand} />
        </View>
      ) : icon ? (
        <Ionicons name={icon} size={Math.round(m.disc * 0.75)} color={foreground} />
      ) : null}
      <Text
        variant={size === 'lg' ? 'callout' : 'body'}
        // The label's drop shadow exists to hold it against artwork; on a solid
        // white fill it only smudges the dark text.
        style={[styles.label, selected && { color: foreground, textShadowColor: 'transparent' }]}
        numberOfLines={1}>
        {label}
      </Text>
    </>
  );

  return (
    <Touchable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled), selected }}
      haptic
      pressedScale={0.94}
      disabled={disabled}
      style={[styles.shadow, disabled ? styles.disabled : null, style]}
      {...rest}>
      {selected ? (
        <View style={[bodyStyle, styles.selected, { backgroundColor: theme.brand }]}>{content}</View>
      ) : (
        <Glass
          variant="clear"
          intensity={28}
          tint={GLASS_TINT}
          radius={Radius.pill}
          blurTarget={blurTarget}
          style={bodyStyle}>
          {content}
        </Glass>
      )}
    </Touchable>
  );
}

export const GlassButton = memo(GlassButtonImpl);

export type GlassIconButtonProps = Omit<TouchableProps, 'children'> & {
  icon: IconName;
  accessibilityLabel: string;
  /** Diameter. */
  size?: number;
  color?: string;
  blurTarget?: RefObject<View | null>;
};

function GlassIconButtonImpl({
  icon,
  size = 38,
  color = '#FFFFFF',
  blurTarget,
  style,
  ...rest
}: GlassIconButtonProps) {
  return (
    <Touchable accessibilityRole="button" pressedScale={0.88} style={[styles.shadow, style]} {...rest}>
      <Glass
        variant="clear"
        intensity={28}
        tint={GLASS_TINT}
        radius={Radius.pill}
        blurTarget={blurTarget}
        style={[styles.iconBody, { width: size, height: size }]}>
        <Ionicons name={icon} size={Math.round(size * 0.5)} color={color} />
      </Glass>
    </Touchable>
  );
}

export const GlassIconButton = memo(GlassIconButtonImpl);

export type GlassChipProps = {
  label: string;
  style?: StyleProp<ViewStyle>;
};

/** The same material as the buttons above, for a label that isn't pressable. */
function GlassChipImpl({ label, style }: GlassChipProps) {
  return (
    <View style={[styles.shadow, style]}>
      <Glass
        variant="clear"
        intensity={28}
        tint={GLASS_TINT}
        radius={Radius.pill}
        style={styles.chipBody}>
        <Text variant="caption" style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      </Glass>
    </View>
  );
}

export const GlassChip = memo(GlassChipImpl);

const styles = StyleSheet.create({
  // The radius has to be repeated here: on Android the elevation shadow is cast
  // from this view's own shape, not from the rounded glass nested inside it.
  shadow: { borderRadius: Radius.pill, ...GLASS_SHADOW },
  disabled: { opacity: 0.5 },
  body: { flexDirection: 'row', alignItems: 'center' },
  /** The glass path gets its radius from `<Glass>`; the solid fill needs its own. */
  selected: { borderRadius: Radius.pill },
  iconBody: { alignItems: 'center', justifyContent: 'center' },
  chipBody: { paddingHorizontal: Spacing.md, paddingVertical: 6, alignItems: 'center' },
  disc: { borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  label: {
    color: '#FFFFFF',
    fontFamily: FontFamily.semibold,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
