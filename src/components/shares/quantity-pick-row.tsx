import { memo } from 'react';

import { PickableItemRow } from '@/components/shares/pickable-item-row';

export type QuantityPickRowProps = {
  title: string;
  subtitle: string;
  /** How many of this purchase you have. */
  available: number;
  /** How many you're sending — 0 means not picked. */
  value: number;
  onChange: (value: number) => void;
  /** "drink", "snack" — used in the keep/send hint. */
  noun: [singular: string, plural: string];
};

/**
 * A purchase of several of the same thing (3 beers, 2 popcorns) — tick it
 * to send one, then +/− to send more, keeping the rest. The same row the
 * event-ticket picker uses for multi-admission tickets; a purchase of just
 * one stays a plain checkbox.
 */
function QuantityPickRowImpl({ title, subtitle, available, value, onChange, noun }: QuantityPickRowProps) {
  const selected = value > 0;
  const kept = available - value;
  const word = (n: number) => (n === 1 ? noun[0] : noun[1]);

  return (
    <PickableItemRow
      title={title}
      subtitle={subtitle}
      selected={selected}
      onToggle={() => onChange(selected ? 0 : 1)}
      stepper={
        available > 1
          ? {
              value,
              min: 1,
              max: available,
              onChange,
              hint:
                kept === 0
                  ? `Sending all ${available} — you'll no longer have ${available === 1 ? 'it' : 'them'}.`
                  : `Sending ${value} ${word(value)}, you'll keep ${kept}.`,
            }
          : undefined
      }
    />
  );
}

export const QuantityPickRow = memo(QuantityPickRowImpl);
