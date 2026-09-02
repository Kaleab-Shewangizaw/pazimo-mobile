import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Field } from '@/components/ui/field';
import { Spacing } from '@/constants/theme';
import type { Attendee } from '@/lib/rsvp';

function AttendeeStepImpl({
  attendee,
  onChange,
  errors,
}: {
  attendee: Attendee;
  onChange: (patch: Partial<Attendee>) => void;
  errors: Partial<Record<keyof Attendee, string>>;
}) {
  return (
    <View style={styles.stack}>
      <Field
        label="Full name"
        value={attendee.fullName}
        onChangeText={(fullName) => onChange({ fullName })}
        error={errors.fullName}
        autoCapitalize="words"
      />
      <Field
        label="Email"
        value={attendee.email}
        onChangeText={(email) => onChange({ email })}
        error={errors.email}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <Field
        label="Phone"
        value={attendee.phone}
        onChangeText={(phone) => onChange({ phone })}
        error={errors.phone}
        keyboardType="phone-pad"
      />
    </View>
  );
}

const styles = StyleSheet.create({ stack: { gap: Spacing.lg } });

export const AttendeeStep = memo(AttendeeStepImpl);
