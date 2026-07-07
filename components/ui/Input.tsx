import React, { useState } from 'react';
import { View, Text, TextInput as RNTextInput, StyleSheet, TextInputProps } from 'react-native';
import { COLORS, RADII, SPACING, TYPOGRAPHY } from '@/lib/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export default function Input({ label, error, style, ...props }: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <RNTextInput
        style={[
          styles.input,
          isFocused && styles.inputFocused,
          error && styles.inputError,
          style,
        ]}
        placeholderTextColor={COLORS.outline}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        {...props}
      />
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
  input: {
    ...TYPOGRAPHY.body,
    color: COLORS.onSurface,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.outline,
    borderRadius: RADII.sm,
    padding: SPACING.md + 2,
    minHeight: 48,
  },
  inputFocused: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  inputError: {
    borderColor: COLORS.statusCritical,
  },
  error: {
    ...TYPOGRAPHY.label,
    color: COLORS.statusCritical,
    marginTop: SPACING.xs,
  },
});
