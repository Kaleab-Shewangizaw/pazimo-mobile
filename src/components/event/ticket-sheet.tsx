import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Touchable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatPrice, isTierBuyable, tierUnitPrice } from '@/lib/pricing';
import type { Currency, TicketTier } from '@/types/api';

export function TicketSheet({
  visible,
  onClose,
  tiers,
  currency,
  currencies,
  onChangeCurrency,
  selectedTierId,
  onSelectTier,
  onContinue,
}: {
  visible: boolean;
  onClose: () => void;
  tiers: TicketTier[];
  currency: Currency;
  currencies: Currency[];
  onChangeCurrency: (currency: Currency) => void;
  selectedTierId: string | null;
  onSelectTier: (id: string) => void;
  onContinue: () => void;
}) {
  const theme = useTheme();
  const selectedTier = tiers.find((t) => t._id === selectedTierId) ?? null;

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.header}>
        <Text variant="title">Select tickets</Text>
        <Touchable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={onClose}
          pressedScale={0.9}
          style={[styles.closeButton, { backgroundColor: theme.surfaceMuted }]}>
          <Ionicons name="close" size={18} color={theme.text} />
        </Touchable>
      </View>

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
            onSelect={() => onSelectTier(tier._id)}
          />
        ))}
      </View>

      <Button
        label={
          selectedTier
            ? `Continue — ${formatPrice(tierUnitPrice(selectedTier, currency), currency)}`
            : 'Select a ticket'
        }
        disabled={!selectedTier}
        size="lg"
        onPress={onContinue}
      />
    </BottomSheet>
  );
}

function TierRow({
  tier,
  currency,
  selected,
  onSelect,
}: {
  tier: TicketTier;
  currency: Currency;
  selected: boolean;
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
      style={[
        styles.tier,
        {
          backgroundColor: theme.surface,
          borderColor: selected ? theme.brand : theme.hairline,
          borderWidth: selected ? 1.5 : StyleSheet.hairlineWidth,
          opacity: buyable ? 1 : 0.55,
        },
      ]}>
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
        <Text variant="callout" color="brand">
          {formatPrice(tierUnitPrice(tier, currency), currency)}
        </Text>
        <Ionicons
          name={selected ? 'radio-button-on' : 'radio-button-off'}
          size={20}
          color={selected ? theme.brand : theme.textMuted}
        />
      </View>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  tier: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
  },
  tierMain: { flex: 1, gap: 2 },
  tierRight: { alignItems: 'flex-end', gap: Spacing.xs },
});
