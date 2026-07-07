import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { COLORS, RADII, SPACING, TYPOGRAPHY } from '@/lib/theme';

interface AmountInputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  placeholder?: string;
}

export default function AmountInput({
  label,
  value,
  onChangeText,
  error,
  placeholder = '0',
}: AmountInputProps) {
  const handleChange = (text: string) => {
    // Only allow digits
    const cleaned = text.replace(/[^0-9]/g, '');
    onChangeText(cleaned);
  };

  const displayValue = value ? `Rp ${Number(value).toLocaleString('id-ID')}` : '';

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputWrapper, error && styles.inputError]}>
        <Text style={styles.prefix}>Rp</Text>
        <TextInput
          style={styles.input}
          value={displayValue}
          onChangeText={handleChange}
          placeholder={placeholder}
          placeholderTextColor={COLORS.outline}
          keyboardType="numeric"
        />
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
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
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.outline,
    borderRadius: RADII.sm,
    paddingHorizontal: SPACING.md + 2,
    minHeight: 48,
  },
  inputError: {
    borderColor: COLORS.statusCritical,
  },
  prefix: {
    ...TYPOGRAPHY.title,
    color: COLORS.onSurfaceVariant,
    marginRight: SPACING.sm,
  },
  input: {
    ...TYPOGRAPHY.title,
    flex: 1,
    color: COLORS.onSurface,
  },
  error: {
    ...TYPOGRAPHY.label,
    color: COLORS.statusCritical,
    marginTop: SPACING.xs,
  },
});
