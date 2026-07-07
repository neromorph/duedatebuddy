import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY } from '@/lib/theme';
import { Reminder } from '@/types';
import { daysRemaining, formatCurrency, formatDaysRemaining, formatDate } from '@/lib/date';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

interface ReminderCardProps {
  reminder: Reminder;
  onPress: () => void;
}

const categoryIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  tagihan: 'document-text',
  pajak: 'receipt',
  asuransi: 'shield-checkmark',
  cicilan: 'card',
  langganan: 'repeat',
  lainnya: 'ellipsis-horizontal-circle',
};

export default function ReminderCard({ reminder, onPress }: ReminderCardProps) {
  const days = daysRemaining(reminder.due_date);

  const getBadgeVariant = () => {
    if (reminder.status === 'paid') return 'active' as const;
    if (days < 0) return 'critical' as const;
    if (days <= 7) return 'critical' as const;
    if (days <= 30) return 'warning' as const;
    return 'active' as const;
  };

  const getStatusLabel = () => {
    if (reminder.status === 'paid') return 'Terbayar';
    if (days < 0) return 'Terlewat';
    return formatDaysRemaining(days);
  };

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card style={styles.card}>
        <View style={styles.row}>
          <View style={styles.iconContainer}>
            <Ionicons
              name={categoryIcons[reminder.category] || 'calendar-outline'}
              size={22}
              color={COLORS.primary}
            />
          </View>
          <View style={styles.content}>
            <Text style={styles.title} numberOfLines={1}>
              {reminder.title}
            </Text>
            <Text style={styles.date}>
              {formatDate(reminder.due_date)}
            </Text>
            {reminder.amount !== null && reminder.amount !== undefined && (
              <Text style={styles.amount}>{formatCurrency(reminder.amount)}</Text>
            )}
          </View>
          <Badge label={getStatusLabel()} variant={getBadgeVariant()} />
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.primaryContainer + '40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  title: {
    ...TYPOGRAPHY.title,
    color: COLORS.onSurface,
  },
  date: {
    ...TYPOGRAPHY.body,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
  },
  amount: {
    ...TYPOGRAPHY.amount,
    color: COLORS.onSurface,
    marginTop: 2,
  },
});
