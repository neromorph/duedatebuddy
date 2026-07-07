import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, RADII, SPACING, TYPOGRAPHY } from '@/lib/theme';

type BadgeVariant = 'critical' | 'warning' | 'active' | 'neutral';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

const badgeColors: Record<BadgeVariant, string> = {
  critical: COLORS.statusCritical,
  warning: COLORS.statusWarning,
  active: COLORS.statusActive,
  neutral: COLORS.statusNeutral,
};

export default function Badge({ label, variant = 'neutral' }: BadgeProps) {
  const color = badgeColors[variant];

  return (
    <View style={[styles.badge, { backgroundColor: color + '20' }]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 2,
    borderRadius: RADII.full,
    alignSelf: 'flex-start',
  },
  text: {
    ...TYPOGRAPHY.label,
  },
});
