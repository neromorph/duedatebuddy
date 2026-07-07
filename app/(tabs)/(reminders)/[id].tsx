import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY, RADII } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/useAuth';
import { Reminder } from '@/types';
import {
  formatDate,
  formatCurrency,
  formatDaysRemaining,
  daysRemaining,
} from '@/lib/date';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import Button from '@/components/ui/Button';
import { cancelReminderNotifications } from '@/lib/notifications';
import { useReminders } from '@/features/reminders/useReminders';

export default function DetailPengingatScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { markAsPaid } = useReminders();
  const [reminder, setReminder] = useState<Reminder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReminder();
  }, [id]);

  const fetchReminder = async () => {
    if (!id || !user) return;
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('reminders')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (fetchError) throw fetchError;
      setReminder(data);
    } catch (e: any) {
      setError(e.message || 'Gagal memuat pengingat');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!id) return;
    try {
      const { error: markError } = await markAsPaid(id);
      if (markError) throw new Error(markError);
      await cancelReminderNotifications(id);
      fetchReminder();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Gagal memperbarui status');
    }
  };

  const handleDelete = () => {
    Alert.alert('Hapus Pengingat', 'Yakin ingin menghapus pengingat ini?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          if (!id) return;
          await supabase.from('reminders').delete().eq('id', id).eq('user_id', user!.id);
          await cancelReminderNotifications(id);
          router.back();
        },
      },
    ]);
  };

  if (loading) return <SafeAreaView style={styles.container}><LoadingState /></SafeAreaView>;
  if (error) return <SafeAreaView style={styles.container}><ErrorState message={error} onRetry={fetchReminder} /></SafeAreaView>;
  if (!reminder) return null;

  const days = daysRemaining(reminder.due_date);
  const isPaid = reminder.status === 'paid';

  const getBadgeVariant = () => {
    if (isPaid) return 'active' as const;
    if (days < 0) return 'critical' as const;
    if (days <= 7) return 'critical' as const;
    if (days <= 30) return 'warning' as const;
    return 'active' as const;
  };

  const getStatusLabel = () => {
    if (isPaid) return 'Terbayar';
    if (days < 0) return 'Terlewat';
    return formatDaysRemaining(days);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.statusCard}>
          <View style={styles.statusRow}>
            <Badge label={getStatusLabel()} variant={getBadgeVariant()} />
            {reminder.recurrence !== 'none' && (
              <Badge
                label={reminder.recurrence === 'monthly' ? 'Bulanan' : 'Tahunan'}
                variant="neutral"
              />
            )}
          </View>
        </Card>

        <Card style={styles.detailCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Kategori</Text>
            <Text style={styles.detailValue}>{reminder.category}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Tanggal Jatuh Tempo</Text>
            <Text style={styles.detailValue}>{formatDate(reminder.due_date)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Jumlah</Text>
            <Text style={styles.detailValue}>
              {reminder.amount ? formatCurrency(reminder.amount) : '-'}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Pengulangan</Text>
            <Text style={styles.detailValue}>
              {reminder.recurrence === 'none'
                ? 'Tidak'
                : reminder.recurrence === 'monthly'
                  ? 'Bulanan'
                  : 'Tahunan'}
            </Text>
          </View>
          {reminder.notes && (
            <>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Catatan</Text>
                <Text style={styles.detailValue}>{reminder.notes}</Text>
              </View>
            </>
          )}
        </Card>

        <View style={styles.actions}>
          {!isPaid && (
            <Button
              title="Tandai Dibayar"
              onPress={handleMarkPaid}
              variant="primary"
              style={styles.actionButton}
            />
          )}
          <Button
            title="Edit"
            onPress={() => router.push(`/(tabs)/(reminders)/${id}/edit`)}
            variant="secondary"
            style={styles.actionButton}
          />
          <Button
            title="Hapus"
            onPress={handleDelete}
            variant="text"
            style={styles.deleteButton}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  content: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  statusCard: {
    marginBottom: SPACING.md,
  },
  statusRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  detailCard: {
    marginBottom: SPACING.lg,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  detailLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.onSurfaceVariant,
    flex: 1,
  },
  detailValue: {
    ...TYPOGRAPHY.body,
    color: COLORS.onSurface,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.outline + '40',
  },
  actions: {
    gap: SPACING.md,
  },
  actionButton: {
    marginBottom: 0,
  },
  deleteButton: {
    marginTop: SPACING.sm,
  },
});
