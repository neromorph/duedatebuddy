import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS, RADII, SPACING, TYPOGRAPHY } from '@/lib/theme';

type ButtonVariant = 'primary' | 'secondary' | 'text';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: object;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'text' && styles.text,
        isDisabled && styles.disabled,
        style,
      ]}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? COLORS.onPrimary : COLORS.primary}
          size="small"
        />
      ) : (
        <Text
          style={[
            styles.textBase,
            variant === 'primary' && styles.primaryText,
            variant === 'secondary' && styles.secondaryText,
            variant === 'text' && styles.textVariantText,
            isDisabled && styles.disabledText,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: SPACING.md + 2,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADII.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primary: {
    backgroundColor: COLORS.primary,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.outline,
  },
  text: {
    backgroundColor: 'transparent',
    paddingHorizontal: SPACING.sm,
    minHeight: 32,
  },
  disabled: {
    opacity: 0.5,
  },
  textBase: {
    ...TYPOGRAPHY.title,
  },
  primaryText: {
    color: COLORS.onPrimary,
  },
  secondaryText: {
    color: COLORS.primary,
  },
  textVariantText: {
    color: COLORS.primary,
  },
  disabledText: {
    opacity: 0.7,
  },
});
