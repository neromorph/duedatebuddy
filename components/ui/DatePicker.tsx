import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { COLORS, RADII, SPACING, TYPOGRAPHY } from '@/lib/theme';
import { formatDate } from '@/lib/date';

interface DatePickerProps {
  label?: string;
  value: Date;
  onChange: (date: Date) => void;
  error?: string;
}

export default function DatePicker({
  label,
  value,
  onChange,
  error,
}: DatePickerProps) {
  const [show, setShow] = useState(false);

  const handleChange = (_: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShow(false);
    }
    if (selectedDate) {
      onChange(selectedDate);
    }
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        style={[styles.trigger, error && styles.triggerError]}
        onPress={() => setShow(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.text}>{formatDate(value, 'dd MMMM yyyy')}</Text>
      </TouchableOpacity>
      {error && <Text style={styles.error}>{error}</Text>}

      {show && (
        <DateTimePicker
          value={value}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleChange}
        />
      )}

      {Platform.OS === 'ios' && show && (
        <TouchableOpacity
          style={styles.doneButton}
          onPress={() => setShow(false)}
        >
          <Text style={styles.doneText}>Selesai</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.lg,
  },
  label: {
    ...TYPOGRAPHY.label,
    color: COLORS.onSurfaceVariant,
    marginBottom: SPACING.xs,
  },
  trigger: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.outline,
    borderRadius: RADII.sm,
    padding: SPACING.md + 2,
    minHeight: 48,
    justifyContent: 'center',
  },
  triggerError: {
    borderColor: COLORS.statusCritical,
  },
  text: {
    ...TYPOGRAPHY.body,
    color: COLORS.onSurface,
  },
  error: {
    ...TYPOGRAPHY.label,
    color: COLORS.statusCritical,
    marginTop: SPACING.xs,
  },
  doneButton: {
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: RADII.sm,
    marginTop: SPACING.xs,
  },
  doneText: {
    ...TYPOGRAPHY.title,
    color: COLORS.primary,
  },
});
