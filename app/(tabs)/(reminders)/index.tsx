import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { isPast, parseISO } from 'date-fns';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, TYPOGRAPHY, RADII } from '@/lib/theme';
import { useReminders } from '@/features/reminders/useReminders';
import ReminderCard from '@/features/reminders/ReminderCard';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import FAB from '@/components/ui/FAB';

type FilterTab = 'semua' | 'aktif' | 'terbayar' | 'terlewat';

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'semua', label: 'Semua' },
  { key: 'aktif', label: 'Aktif' },
  { key: 'terbayar', label: 'Terbayar' },
  { key: 'terlewat', label: 'Terlewat' },
];

export default function RemindersListScreen() {
  const router = useRouter();
  const { reminders, loading, error, fetchReminders } = useReminders();
  const [filter, setFilter] = useState<FilterTab>('semua');
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchReminders();
    }, [fetchReminders])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReminders();
    setRefreshing(false);
  };

  const filteredReminders = reminders.filter((r) => {
    switch (filter) {
      case 'aktif':
        return r.status === 'pending';
      case 'terbayar':
        return r.status === 'paid';
      case 'terlewat':
        return (
          r.status === 'overdue' ||
          (r.status === 'pending' && isPast(parseISO(r.due_date)))
        );
      default:
        return true;
    }
  });

  if (loading && reminders.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LoadingState />
      </SafeAreaView>
    );
  }

  if (error && reminders.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ErrorState message={error} onRetry={fetchReminders} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.filterRow}>
        {FILTER_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.filterTab, filter === tab.key && styles.filterTabActive]}
            onPress={() => setFilter(tab.key)}
          >
            <Text
              style={[
                styles.filterText,
                filter === tab.key && styles.filterTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        contentContainerStyle={styles.listContent}
        data={filteredReminders}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
        renderItem={({ item }) => (
          <ReminderCard
            reminder={item}
            onPress={() => router.push(`/(tabs)/(reminders)/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="notifications-outline"
            title="Tidak ada pengingat"
            subtitle={
              filter === 'semua'
                ? 'Belum ada pengingat. Tambah pengingat pertamamu!'
                : 'Tidak ada pengingat untuk filter ini'
            }
            ctaLabel={filter === 'semua' ? 'Tambah Pengingat' : undefined}
            onCtaPress={
              filter === 'semua'
                ? () => router.push('/(tabs)/(reminders)/tambah')
                : undefined
            }
          />
        }
        showsVerticalScrollIndicator={false}
      />

      <FAB onPress={() => router.push('/(tabs)/(reminders)/tambah')} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceContainer,
  },
  filterTab: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADII.sm,
    backgroundColor: COLORS.surfaceContainer,
  },
  filterTabActive: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    ...TYPOGRAPHY.label,
    color: COLORS.onSurfaceVariant,
  },
  filterTextActive: {
    color: COLORS.onPrimary,
    fontWeight: '600',
  },
  listContent: {
    padding: SPACING.lg,
    paddingBottom: 100,
  },
});
