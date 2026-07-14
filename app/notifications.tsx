import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, RADII, SPACING, TYPOGRAPHY } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { safeQuery } from '@/lib/supabase-safe';
import { useAuth } from '@/features/auth/useAuth';
import { Reminder } from '@/types';
import { daysRemaining, formatCurrency, formatDate, formatDaysRemaining, isOverdue } from '@/lib/date';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [filter, setFilter] = useState<'all' | 'urgent' | 'today'>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReminders = useCallback(async () => {
    if (!user) return;
    setError(null);
    const { data, error: err } = await safeQuery<Reminder>(
      () => supabase.from('reminders').select('*').eq('user_id', user.id).order('due_date', { ascending: true }),
      'notifications:fetchReminders',
    );
    if (err) setError('Gagal memuat notifikasi');
    else setReminders(data || []);
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useFocusEffect(useCallback(() => { fetchReminders(); }, [fetchReminders]));

  const notices = reminders
    .filter((r) => r.status === 'pending' || r.status === 'overdue')
    .sort((a, b) => daysRemaining(a.due_date) - daysRemaining(b.due_date))
    .filter((r) => filter === 'urgent' ? (r.priority === 'critical' || r.priority === 'high' || isOverdue(r.due_date)) : filter === 'today' ? daysRemaining(r.due_date) <= 0 : true);

  if (loading) return <SafeAreaView style={styles.container}><LoadingState /></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={notices}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchReminders(); }} tintColor={COLORS.primary} />}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <TouchableOpacity style={styles.back} onPress={() => router.back()} accessibilityLabel="Kembali ke Beranda">
                <Ionicons name="chevron-back" size={26} color={COLORS.onSurface} />
              </TouchableOpacity>
              <View style={styles.headerText}>
                <Text style={styles.title}>Notifikasi</Text>
                <Text style={styles.subtitle}>Pengingat penting dari daftar jatuh tempo.</Text>
              </View>
            </View>
            <View style={styles.filters}>
              <TouchableOpacity style={[styles.chip, filter === 'all' && styles.chipActive]} onPress={() => setFilter('all')}>
                <Text style={[styles.chipText, filter === 'all' && styles.chipTextActive]}>Semua</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.chip, filter === 'urgent' && styles.chipActive]} onPress={() => setFilter('urgent')}>
                <Text style={[styles.chipText, filter === 'urgent' && styles.chipTextActive]}>Penting</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.chip, filter === 'today' && styles.chipActive]} onPress={() => setFilter('today')}>
                <Text style={[styles.chipText, filter === 'today' && styles.chipTextActive]}>Hari ini</Text>
              </TouchableOpacity>
            </View>
            {error && <View style={styles.errorBar}><Text style={styles.errorText}>{error}</Text></View>}
          </>
        }
        ListEmptyComponent={<EmptyState icon="notifications-off-outline" title="Tidak ada notifikasi" subtitle="Pengingat yang perlu perhatian akan muncul di sini." />}
        renderItem={({ item }) => {
          const days = daysRemaining(item.due_date);
          const urgent = days <= 0 || item.status === 'overdue' || item.priority === 'critical';
          return (
            <TouchableOpacity style={[styles.notice, urgent && styles.noticeUrgent]} onPress={() => router.push(`/(tabs)/(reminders)/${item.id}`)} activeOpacity={0.75}>
              <View style={[styles.glyph, urgent && styles.glyphUrgent]}>
                <Ionicons name="notifications-outline" size={22} color={urgent ? COLORS.statusCritical : COLORS.primary} />
              </View>
              <View style={styles.noticeBody}>
                <Text style={styles.meta}>{formatDaysRemaining(days)} · {formatDate(item.due_date)}</Text>
                <Text style={styles.noticeTitle}>{item.title}</Text>
                <Text style={styles.noticeText}>{item.amount != null ? `${formatCurrency(item.amount)} perlu disiapkan.` : 'Buka detail untuk melihat pengingat.'}</Text>
                <Text style={styles.open}>Buka pengingat</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xl },
  header: { flexDirection: 'row', gap: SPACING.md, alignItems: 'flex-start', marginBottom: SPACING.lg },
  back: { width: 44, height: 44, borderRadius: RADII.lg, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.outline, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1 },
  title: { ...TYPOGRAPHY.headline, fontSize: 30, color: COLORS.onSurface },
  subtitle: { ...TYPOGRAPHY.body, color: COLORS.onSurfaceVariant, marginTop: SPACING.xs },
  filters: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  chip: { borderWidth: 1, borderColor: COLORS.outline, borderRadius: RADII.full, backgroundColor: '#FFFFFF', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  chipActive: { backgroundColor: COLORS.primaryContainer, borderColor: COLORS.primary },
  chipText: { ...TYPOGRAPHY.label, color: COLORS.onSurfaceVariant, fontWeight: '700' },
  chipTextActive: { color: COLORS.onSurface },
  notice: { flexDirection: 'row', gap: SPACING.md, backgroundColor: '#FFFFFF', borderRadius: RADII.xl, borderWidth: 1, borderColor: COLORS.surfaceContainerHigh, padding: SPACING.md, marginBottom: SPACING.sm },
  noticeUrgent: { borderColor: COLORS.statusCritical + '55', backgroundColor: '#FFF7F7' },
  glyph: { width: 42, height: 42, borderRadius: RADII.lg, backgroundColor: COLORS.primaryContainer, alignItems: 'center', justifyContent: 'center' },
  glyphUrgent: { backgroundColor: '#FDECEC' },
  noticeBody: { flex: 1 },
  meta: { ...TYPOGRAPHY.label, color: COLORS.onSurfaceVariant, marginBottom: SPACING.xs },
  noticeTitle: { ...TYPOGRAPHY.title, color: COLORS.onSurface },
  noticeText: { ...TYPOGRAPHY.body, color: COLORS.onSurfaceVariant, marginTop: SPACING.xs },
  open: { ...TYPOGRAPHY.label, color: COLORS.primary, fontWeight: '700', marginTop: SPACING.sm },
  errorBar: { backgroundColor: COLORS.statusCritical + '15', borderRadius: RADII.lg, padding: SPACING.md, marginBottom: SPACING.md },
  errorText: { ...TYPOGRAPHY.body, color: COLORS.statusCritical, textAlign: 'center' },
});
