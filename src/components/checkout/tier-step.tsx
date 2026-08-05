import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Touchable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatPrice, isTierBuyable, tierUnitPrice } from '@/lib/pricing';
import type { Currency, TicketTier } from '@/types/api';

/** Step one of the sheet: which ticket, and how many. */

export type TierStepProps = {
  tiers: TicketTier[];
  currency: Currency;
  currencies: Currency[];
  onChangeCurrency: (currency: Currency) => void;
  selectedTierId: string | null;
  onSelectTier: (id: string) => void;
  quantity: number;
  onChangeQuantity: (quantity: number) => void;
  onContinue: () => void;
};

function TierStepImpl({
  tiers,
  currency,
  currencies,
  onChangeCurrency,
  selectedTierId,
  onSelectTier,
  quantity,
  onChangeQuantity,
  onContinue,
}: TierStepProps) {
  const theme = useTheme();
  const selectedTier = tiers.find((t) => t._id === selectedTierId) ?? null;
  const total = selectedTier ? tierUnitPrice(selectedTier, currency) * quantity : 0;

  return (
    <View>
      {currencies.length > 1 ? (
        <View style={[styles.currencyToggle, { backgroundColor: theme.surfaceMuted }]}>
          {currencies.map((code) => {
            const active = code === currency;
            return (
              <Touchable
                key={code}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => onChangeCurrency(code)}
                pressedScale={0.95}
                style={[styles.currencyOption, active && { backgroundColor: theme.brand }]}>
                <Text
                  variant="caption"
                  style={{ color: active ? theme.onBrand : theme.textSecondary }}>
                  {code}
                </Text>
              </Touchable>
            );
          })}
        </View>
      ) : null}

      <View style={styles.tierList}>
        {tiers.map((tier) => (
          <TierRow
            key={tier._id}
            tier={tier}
            currency={currency}
            selected={tier._id === selectedTierId}
            quantity={quantity}
            onChangeQuantity={onChangeQuantity}
            onSelect={() => onSelectTier(tier._id)}
          />
        ))}
      </View>

      <Button
        label={selectedTier ? `Continue - ${formatPrice(total, currency)}` : 'Select a ticket'}
        disabled={!selectedTier}
        size="lg"
        onPress={onContinue}
      />
    </View>
  );
}

function TierRow({
  tier,
  currency,
  selected,
  quantity,
  onChangeQuantity,
  onSelect,
}: {
  tier: TicketTier;
  currency: Currency;
  selected: boolean;
  quantity: number;
  onChangeQuantity: (quantity: number) => void;
  onSelect: () => void;
}) {
  const theme = useTheme();
  const buyable = isTierBuyable(tier);
  // `quantity` is remaining stock — there is no separate sold/remaining field.
  const scarce = buyable && tier.quantity <= 10;

  return (
    <Touchable
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled: !buyable }}
      disabled={!buyable}
      onPress={onSelect}
      haptic
      pressedScale={0.98}
      style={[
        styles.tier,
        {
          backgroundColor: selected ? theme.brandTint : theme.surface,
          borderColor: selected ? 'rgba(255,255,255,0.85)' : theme.hairline,
          borderWidth: selected ? 1.5 : StyleSheet.hairlineWidth,
          opacity: buyable ? 1 : 0.55,
        },
      ]}>
      <View style={styles.tierTop}>
        <View style={styles.tierMain}>
          <Text variant="callout" numberOfLines={1}>
            {tier.name}
          </Text>
          {tier.description ? (
            <Text variant="caption" color="textMuted" numberOfLines={2}>
              {tier.description}
            </Text>
          ) : null}
          {!buyable ? (
            <Text variant="caption" color="danger">
              Unavailable
            </Text>
          ) : scarce ? (
            <Text variant="caption" color="warning">
              Only {tier.quantity} left
            </Text>
          ) : null}
        </View>

        <View style={styles.tierRight}>
          <Text variant="callout">{formatPrice(tierUnitPrice(tier, currency), currency)}</Text>
          <Ionicons
            name={selected ? 'checkmark-circle' : 'ellipse-outline'}
            size={22}
            color={selected ? theme.brand : theme.textMuted}
          />
        </View>
      </View>

      {/* The stepper lives inside the selected card — choosing a tier and
          choosing how many are one decision, not two screens. */}
      {selected && buyable ? (
        <View style={[styles.qtyRow, { borderTopColor: theme.hairline }]}>
          <Text variant="small" color="textSecondary">
            Tickets
          </Text>
          <Stepper value={quantity} max={tier.quantity} onChange={onChangeQuantity} />
        </View>
      ) : null}
    </Touchable>
  );
}

function Stepper({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const canDecrement = value > 1;
  const canIncrement = value < max;

  return (
    <View style={styles.stepper}>
      <Touchable
        accessibilityRole="button"
        accessibilityLabel="Remove one ticket"
        disabled={!canDecrement}
        onPress={() => onChange(value - 1)}
        haptic
        pressedScale={0.88}
        style={[styles.stepButton, !canDecrement && styles.stepButtonDisabled]}>
        <Ionicons name="remove" size={16} color="#FFFFFF" />
      </Touchable>
      <Text
        variant="callout"
        style={styles.stepValue}
        accessibilityLiveRegion="polite"
        accessibilityLabel={`${value} tickets`}>
        {value}
      </Text>
      <Touchable
        accessibilityRole="button"
        accessibilityLabel="Add one ticket"
        disabled={!canIncrement}
        onPress={() => onChange(value + 1)}
        haptic
        pressedScale={0.88}
        style={[styles.stepButton, !canIncrement && styles.stepButtonDisabled]}>
        <Ionicons name="add" size={16} color="#FFFFFF" />
      </Touchable>
    </View>
  );
}

const styles = StyleSheet.create({
  currencyToggle: {
    flexDirection: 'row',
    borderRadius: Radius.pill,
    padding: 3,
    gap: 2,
    alignSelf: 'flex-start',
    marginBottom: Spacing.lg,
  },
  currencyOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
  },
  tierList: { gap: Spacing.md, marginBottom: Spacing.lg },
  tier: { padding: Spacing.md, borderRadius: Radius.lg },
  tierTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  tierMain: { flex: 1, gap: 2 },
  tierRight: { alignItems: 'flex-end', gap: Spacing.xs },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  stepButton: {
    width: 32,
    height: 32,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  stepButtonDisabled: { opacity: 0.35 },
  stepValue: { minWidth: 22, textAlign: 'center', fontVariant: ['tabular-nums'] },
});

export const TierStep = memo(TierStepImpl);
