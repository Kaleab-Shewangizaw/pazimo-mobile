import { useCallback, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import { useUpdateProfile } from '@/queries/account';

/** "YYYY-MM-DD" if day/month/year make a real date in the past, else null. */
function toIsoDate(day: string, month: string, year: string): string | null {
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  if (!Number.isInteger(d) || !Number.isInteger(m) || !/^\d{4}$/.test(year)) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  const now = new Date();
  if (date > now || now.getUTCFullYear() - y > 120) return null;
  return `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

const digits = (max: number) => (text: string) => text.replace(/\D/g, '').slice(0, max);

/**
 * Asks for a birth date, once. It's what opens the drink side of the recap
 * (both stores forbid showing drinking to minors) and what lets organizers
 * see — only ever in age bands, never per person — how old their crowd is.
 * The server refuses to change it after it's set, so the sheet says so.
 */
export function BirthDateSheet({
  visible,
  onClose,
  onSaved,
}: {
  visible: boolean;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const { submit, submitting, error } = useUpdateProfile();
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [showError, setShowError] = useState(false);

  const iso = toIsoDate(day, month, year);

  const save = useCallback(async () => {
    setShowError(true);
    if (!iso) return;
    Keyboard.dismiss();
    if (await submit({ birthDate: iso })) {
      onSaved?.();
      onClose();
    }
  }, [iso, onClose, onSaved, submit]);

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.container}>
        <View style={styles.intro}>
          <Text variant="title">When&apos;s your birthday?</Text>
          <Text variant="small" color="textSecondary">
            We use it to keep your recap age-appropriate and to show organizers anonymous age ranges
            for their events — never your exact age. You can only set it once.
          </Text>
        </View>

        <View style={styles.row}>
          <View style={styles.small}>
            <Field label="Day" value={day} onChangeText={(t) => setDay(digits(2)(t))} placeholder="DD" keyboardType="number-pad" />
          </View>
          <View style={styles.small}>
            <Field label="Month" value={month} onChangeText={(t) => setMonth(digits(2)(t))} placeholder="MM" keyboardType="number-pad" />
          </View>
          <View style={styles.large}>
            <Field label="Year" value={year} onChangeText={(t) => setYear(digits(4)(t))} placeholder="YYYY" keyboardType="number-pad" />
          </View>
        </View>

        {showError && !iso ? (
          <Text variant="small" color="danger" style={styles.center}>
            That doesn&apos;t look like a real date.
          </Text>
        ) : error ? (
          <Text variant="small" color="danger" style={styles.center}>
            {error}
          </Text>
        ) : null}

        <Button label="Save birthday" size="lg" loading={submitting} onPress={save} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.lg },
  intro: { gap: Spacing.xs },
  row: { flexDirection: 'row', gap: Spacing.md },
  small: { flex: 1 },
  large: { flex: 1.5 },
  center: { textAlign: 'center' },
});
