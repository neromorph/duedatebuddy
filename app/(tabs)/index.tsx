import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, TYPOGRAPHY, RADII } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { safeQuery } from '@/lib/supabase-safe';
import { useAuth } from '@/features/auth/useAuth';
import { Reminder } from '@/types';
import {
  daysRemaining,
  isOverdue,
  isThisMonth,
  formatCurrency,
  formatDaysRemaining,
  formatDate,
} from '@/lib/date';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import EmptyState from '@/components/ui/EmptyState';
import FAB from '@/components/ui/FAB';

type SummaryItem = {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
};

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReminders = useCallback(async () => {
    if (!user) return;
    setError(null);
    const { data, error: err } = await safeQuery<Reminder>(
      () => supabase
        .from('reminders')
        .select('*')
        .eq('user_id', user.id)
        .order('due_date', { ascending: true }),
      'dashboard:fetchReminders',
    );
    if (err) {
      setError('Gagal memuat data');
    } else {
      setReminders(data || []);
    }
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchReminders();
    }, [fetchReminders])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchReminders();
  };

  const criticalReminders = reminders.filter(
    (r) => r.status === 'pending' && r.priority === 'critical',
  );

  const dueThisWeek = reminders.filter((r) => {
    const days = daysRemaining(r.due_date);
    return r.status === 'pending' && days >= 0 && days <= 7;
  });

  const dueThisWeekTotal = dueThisWeek.reduce((sum, r) => sum + (r.amount || 0), 0);

  const summaryItems: SummaryItem[] = [
    {
      label: 'Jatuh Tempo Minggu Ini',
      value: `${dueThisWeek.length} \u00B7 ${formatCurrency(dueThisWeekTotal)}`,
      icon: 'alarm',
      color: COLORS.statusCritical,
    },
    {
      label: 'Terlewat',
      value: reminders.filter((r) => r.status === 'overdue' || (r.status === 'pending' && isOverdue(r.due_date))).length.toString(),
      icon: 'alert-circle',
      color: COLORS.statusCritical,
    },
    {
      label: 'Bulan Ini',
      value: reminders.filter((r) => isThisMonth(r.due_date)).length.toString(),
      icon: 'calendar',
      color: COLORS.primary,
    },
    {
      label: 'Estimasi',
      value: formatCurrency(
        reminders
          .filter((r) => r.status === 'pending' && r.amount)
          .reduce((sum, r) => sum + (r.amount || 0), 0)
      ),
      icon: 'wallet',
      color: COLORS.statusActive,
    },
  ];

  const upcomingReminders = reminders
    .filter((r) => r.status === 'pending')
    .slice(0, 5);

  const getBadgeVariant = (reminder: Reminder) => {
    if (reminder.status === 'paid') return 'active' as const;
    const days = daysRemaining(reminder.due_date);
    if (days < 0 || reminder.status === 'overdue') return 'critical' as const;
    if (days <= 7) return 'critical' as const;
    if (days <= 30) return 'warning' as const;
    return 'active' as const;
  };

  const getStatusLabel = (reminder: Reminder) => {
    if (reminder.status === 'paid') return 'Terbayar';
    const days = daysRemaining(reminder.due_date);
    if (days < 0) return 'Terlewat';
    return formatDaysRemaining(days);
  };

  if (loading) return <SafeAreaView style={styles.container}><LoadingState /></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Ringkasan</Text>
        <Text style={styles.subtitle}>Pantau tenggat waktumu</Text>
      </View>

      <FlatList
        contentContainerStyle={styles.listContent}
        data={upcomingReminders}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
        ListHeaderComponent={
          <>
            <View style={styles.summaryGrid}>
              {summaryItems.map((item, index) => (
                <View key={index} style={styles.summaryCard}>
                  <View style={[styles.summaryIcon, { backgroundColor: item.color + '15' }]}>
                    <Ionicons name={item.icon} size={20} color={item.color} />
                  </View>
                  <Text style={[styles.summaryValue, { color: item.color }]}>
                    {item.value}
                  </Text>
                  <Text style={styles.summaryLabel}>{item.label}</Text>
                </View>
              ))}
            </View>

            {criticalReminders.length > 0 && (
              <View style={styles.criticalSection}>
                <Text style={[styles.sectionTitle, { color: COLORS.statusCritical }]}>
                  {'\u26A0'} Prioritas Critical
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.criticalScroll}>
                  {criticalReminders.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => router.push(`/(tabs)/(reminders)/${item.id}`)}
                      activeOpacity={0.7}
                    >
                      <Card style={styles.criticalCard}>
                        <Text style={styles.criticalTitle}>{item.title}</Text>
                        <Text style={styles.criticalDate}>{formatDate(item.due_date)}</Text>
                        {item.amount != null && (
                          <Text style={styles.criticalAmount}>{formatCurrency(item.amount)}</Text>
                        )}
                      </Card>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <Text style={styles.sectionTitle}>Segera Jatuh Tempo</Text>
          </>
        }
        ListEmptyComponent={
          <EmptyState
            icon="checkmark-circle-outline"
            title="Semua pengingat beres"
            subtitle="Belum ada pengingat yang akan jatuh tempo"
            ctaLabel="Tambah Pengingat"
            onCtaPress={() => router.push('/(tabs)/(reminders)/tambah')}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push(`/(tabs)/(reminders)/${item.id}`)}
            activeOpacity={0.7}
          >
            <Card style={styles.reminderCard}>
              <View style={styles.reminderHeader}>
                <View style={styles.reminderLeft}>
                  <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
                  <Text style={styles.reminderTitle}>{item.title}</Text>
                </View>
                <Badge
                  label={getStatusLabel(item)}
                  variant={getBadgeVariant(item)}
                />
              </View>
              <View style={styles.reminderFooter}>
                <Text style={styles.reminderDate}>
                  {formatDate(item.due_date)}
                </Text>
                {item.amount !== null && item.amount !== undefined && (
                  <Text style={styles.reminderAmount}>
                    {formatCurrency(item.amount)}
                  </Text>
                )}
              </View>
            </Card>
          </TouchableOpacity>
        )}
        showsVerticalScrollIndicator={false}
      />

      {error && (
        <View style={styles.errorBar}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <FAB onPress={() => router.push('/(tabs)/(reminders)/tambah')} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  greeting: {
    ...TYPOGRAPHY.headline,
    color: COLORS.onSurface,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.onSurfaceVariant,
    marginTop: SPACING.xs,
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 100,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  summaryCard: {
    width: '47%',
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: RADII.md,
    padding: SPACING.lg,
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: RADII.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  summaryValue: {
    ...TYPOGRAPHY.headline,
    fontSize: 20,
  },
  summaryLabel: {
    ...TYPOGRAPHY.label,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
  },
  sectionTitle: {
    ...TYPOGRAPHY.title,
    color: COLORS.onSurface,
    marginBottom: SPACING.md,
  },
  reminderCard: {
    marginBottom: SPACING.sm,
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reminderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  reminderTitle: {
    ...TYPOGRAPHY.title,
    color: COLORS.onSurface,
    flex: 1,
  },
  reminderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  reminderDate: {
    ...TYPOGRAPHY.body,
    color: COLORS.onSurfaceVariant,
  },
  reminderAmount: {
    ...TYPOGRAPHY.amount,
    color: COLORS.onSurface,
  },
  criticalSection: {
    marginBottom: SPACING.lg,
  },
  criticalScroll: {
    marginBottom: SPACING.sm,
  },
  criticalCard: {
    width: 160,
    marginRight: SPACING.sm,
    backgroundColor: COLORS.statusCritical + '08',
    borderWidth: 1,
    borderColor: COLORS.statusCritical + '30',
  },
  criticalTitle: {
    ...TYPOGRAPHY.title,
    color: COLORS.statusCritical,
  },
  criticalDate: {
    ...TYPOGRAPHY.body,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
  },
  criticalAmount: {
    ...TYPOGRAPHY.amount,
    color: COLORS.statusCritical,
    marginTop: 4,
  },
  errorBar: {
    position: 'absolute',
    bottom: 80,
    left: SPACING.lg,
    right: SPACING.lg,
    backgroundColor: COLORS.statusCritical + '15',
    borderRadius: RADII.sm,
    padding: SPACING.md,
  },
  errorText: {
    ...TYPOGRAPHY.body,
    color: COLORS.statusCritical,
    textAlign: 'center',
  },
});
