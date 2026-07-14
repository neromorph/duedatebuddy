import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, FlatList, RefreshControl, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, TYPOGRAPHY, RADII } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { safeQuery } from '@/lib/supabase-safe';
import { useAuth } from '@/features/auth/useAuth';
import { Reminder } from '@/types';
import { daysRemaining, isOverdue, isThisMonth, formatCurrency, formatDaysRemaining, formatDate } from '@/lib/date';
import { getPerluPerhatianCount } from '@/features/reminders/attention';
import Badge from '@/components/ui/Badge';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';
import FAB from '@/components/ui/FAB';

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
      () => supabase.from('reminders').select('*').eq('user_id', user.id).order('due_date', { ascending: true }),
      'dashboard:fetchReminders',
    );
    if (err) setError('Gagal memuat data');
    else setReminders(data || []);
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useFocusEffect(useCallback(() => { fetchReminders(); }, [fetchReminders]));

  const pending = useMemo(
    () => reminders.filter((r) => r.status === 'pending' || r.status === 'overdue').sort((a, b) => daysRemaining(a.due_date) - daysRemaining(b.due_date)),
    [reminders],
  );
  const hero = pending[0];
  const today = pending.filter((r) => daysRemaining(r.due_date) === 0);
  const week = pending.filter((r) => { const days = daysRemaining(r.due_date); return days >= 0 && days <= 7; });
  const overdue = pending.filter((r) => r.status === 'overdue' || isOverdue(r.due_date));
  const month = pending.filter((r) => isThisMonth(r.due_date));
  const notificationCount = getPerluPerhatianCount(reminders);
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Teman';

  // [label, items]
  const summary = [
    ['Hari ini', today],
    ['Minggu ini', week],
    ['Terlambat', overdue],
    ['Bulan ini', month],
  ] as const;

  if (loading) return <SafeAreaView style={styles.container}><LoadingState /></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={pending.slice(0, 6)}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchReminders(); }} tintColor={COLORS.primary} />}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <View>
                <Text style={styles.greeting}>Selamat datang,</Text>
                <Text style={styles.title}>{displayName}</Text>
                <Text style={styles.date}>{formatDate(new Date(), 'd MMMM yyyy')}</Text>
              </View>
              <TouchableOpacity style={styles.bell} onPress={() => router.push('/notifications')} accessibilityLabel={`Buka notifikasi, ${notificationCount} perlu perhatian`}>
                <Ionicons name="notifications" size={22} color={COLORS.onSurface} />
                {notificationCount > 0 && <Text style={styles.badgeDot}>{Math.min(notificationCount, 9)}</Text>}
              </TouchableOpacity>
            </View>

            {hero ? (
              <TouchableOpacity style={styles.hero} onPress={() => router.push(`/(tabs)/(reminders)/${hero.id}`)} activeOpacity={0.8}>
                <Text style={styles.eyebrow}>Perlu perhatian</Text>
                <View style={styles.heroTop}>
                  <View style={styles.signal}><Text style={styles.signalText}>!</Text></View>
                  <Text style={styles.heroTitle}>{hero.title}</Text>
                </View>
                <Text style={styles.heroSub}>{hero.category} · {formatDaysRemaining(daysRemaining(hero.due_date))} · {formatDate(hero.due_date)}</Text>
                {hero.amount != null && <Text style={styles.amount}>{formatCurrency(hero.amount)}</Text>}
                <View style={styles.heroButton}><Text style={styles.heroButtonText}>Lihat detail</Text></View>
              </TouchableOpacity>
            ) : null}

            <Text style={styles.sectionTitle}>Ringkasan</Text>
            <View style={styles.summaryGrid}>
              {summary.map(([label, items]) => (
                <View key={label} style={styles.summaryCard}>
                  <Text style={styles.summaryCount}>{items.length}</Text>
                  <Text style={styles.summaryLabel}>{label}</Text>
                  <Text style={styles.summaryAmount}>{formatCurrency(items.reduce((sum, r) => sum + (r.amount || 0), 0))}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.sectionTitle}>Akan datang</Text>
          </>
        }
        ListEmptyComponent={<EmptyState icon="checkmark-circle-outline" title="Semua pengingat beres" subtitle="Belum ada pengingat yang perlu perhatian" ctaLabel="Tambah Pengingat" onCtaPress={() => router.push('/(tabs)/(reminders)/tambah')} />}
        renderItem={({ item }) => {
          const days = daysRemaining(item.due_date);
          const variant = days <= 7 || item.status === 'overdue' ? 'critical' : days <= 30 ? 'warning' : 'active';
          return (
            <TouchableOpacity style={styles.timelineItem} onPress={() => router.push(`/(tabs)/(reminders)/${item.id}`)} activeOpacity={0.75}>
              <View style={[styles.glyph, variant === 'critical' && styles.glyphCritical, variant === 'warning' && styles.glyphWarning]}>
                <Ionicons name="calendar-outline" size={20} color={variant === 'critical' ? COLORS.statusCritical : variant === 'warning' ? '#8F4E00' : COLORS.primary} />
              </View>
              <View style={styles.timelineText}>
                <Text style={styles.reminderTitle}>{item.title}</Text>
                <Text style={styles.reminderSub}>{formatDate(item.due_date)}{item.amount != null ? ` · ${formatCurrency(item.amount)}` : ''}</Text>
              </View>
              <Badge label={formatDaysRemaining(days)} variant={variant} />
            </TouchableOpacity>
          );
        }}
        showsVerticalScrollIndicator={false}
      />
      {error && <View style={styles.errorBar}><Text style={styles.errorText}>{error}</Text></View>}
      <FAB onPress={() => router.push('/(tabs)/(reminders)/tambah')} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  content: { padding: SPACING.lg, paddingBottom: 104 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.lg },
  greeting: { ...TYPOGRAPHY.body, color: COLORS.onSurfaceVariant },
  title: { ...TYPOGRAPHY.headline, fontSize: 30, lineHeight: 36, color: COLORS.onSurface },
  date: { ...TYPOGRAPHY.label, color: COLORS.onSurfaceVariant, marginTop: SPACING.xs },
  bell: { width: 48, height: 48, borderRadius: RADII.lg, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.outline, alignItems: 'center', justifyContent: 'center' },
  badgeDot: { position: 'absolute', top: 5, right: 5, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: COLORS.statusCritical, color: COLORS.onPrimary, fontSize: 10, fontWeight: '700', textAlign: 'center', lineHeight: 18, overflow: 'hidden' },
  hero: { backgroundColor: COLORS.onSurface, borderRadius: 30, padding: SPACING.lg, marginBottom: SPACING.lg },
  eyebrow: { ...TYPOGRAPHY.label, color: '#D9A441', textTransform: 'uppercase', marginBottom: SPACING.sm },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  signal: { width: 48, height: 48, borderRadius: RADII.lg, backgroundColor: '#3B3322', alignItems: 'center', justifyContent: 'center' },
  signalText: { color: '#D9A441', fontSize: 22, fontWeight: '800' },
  heroTitle: { ...TYPOGRAPHY.headline, color: COLORS.onPrimary, flex: 1 },
  heroSub: { ...TYPOGRAPHY.body, color: COLORS.surfaceContainerHigh, marginTop: SPACING.md },
  amount: { fontSize: 32, fontWeight: '700', color: COLORS.onPrimary, marginTop: SPACING.md },
  heroButton: { alignSelf: 'flex-start', marginTop: SPACING.md, backgroundColor: COLORS.primary, borderRadius: RADII.lg, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  heroButtonText: { ...TYPOGRAPHY.title, color: COLORS.onPrimary },
  sectionTitle: { ...TYPOGRAPHY.title, color: COLORS.onSurface, marginBottom: SPACING.md },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.lg },
  summaryCard: { width: '48%', backgroundColor: '#FFFFFF', borderRadius: RADII.xl, borderWidth: 1, borderColor: COLORS.surfaceContainerHigh, padding: SPACING.md, minHeight: 104 },
  summaryCount: { ...TYPOGRAPHY.headline, fontSize: 28, color: COLORS.onSurface },
  summaryLabel: { ...TYPOGRAPHY.label, color: COLORS.onSurfaceVariant, marginTop: SPACING.xs },
  summaryAmount: { ...TYPOGRAPHY.title, color: COLORS.onSurface, marginTop: SPACING.sm },
  timelineItem: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: '#FFFFFF', borderRadius: RADII.xl, borderWidth: 1, borderColor: COLORS.surfaceContainerHigh, padding: SPACING.md, marginBottom: SPACING.sm },
  glyph: { width: 46, height: 46, borderRadius: RADII.lg, backgroundColor: COLORS.primaryContainer, alignItems: 'center', justifyContent: 'center' },
  glyphCritical: { backgroundColor: '#FDECEC' },
  glyphWarning: { backgroundColor: '#FFF1D6' },
  timelineText: { flex: 1 },
  reminderTitle: { ...TYPOGRAPHY.title, color: COLORS.onSurface },
  reminderSub: { ...TYPOGRAPHY.label, color: COLORS.onSurfaceVariant, marginTop: 2 },
  errorBar: { position: 'absolute', bottom: 80, left: SPACING.lg, right: SPACING.lg, backgroundColor: COLORS.statusCritical + '15', borderRadius: RADII.sm, padding: SPACING.md },
  errorText: { ...TYPOGRAPHY.body, color: COLORS.statusCritical, textAlign: 'center' },
});
