import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/useAuth';
import { Asset, Reminder } from '@/types';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import Button from '@/components/ui/Button';
import { formatDate } from '@/lib/date';

const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
  home: 'home',
  car: 'car',
  motorcycle: 'bicycle',
  wifi: 'wifi',
  flash: 'flash',
  shield: 'shield-checkmark',
  'credit-card': 'card',
  'file-text': 'document-text',
};

export default function DetailAsetScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    if (!id || !user) return;
    try {
      setLoading(true);
      setError(null);

      const { data: assetData, error: assetError } = await supabase
        .from('assets')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();
      if (assetError) throw assetError;
      setAsset(assetData);

      const { data: reminderData } = await supabase
        .from('reminders')
        .select('*')
        .eq('asset_id', id)
        .eq('user_id', user.id)
        .order('due_date', { ascending: true });
      setReminders(reminderData || []);
    } catch (e: any) {
      setError(e.message || 'Gagal memuat aset');
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = () => {
    Alert.alert('Arsipkan Aset', 'Aset akan diarsipkan dan tidak muncul di daftar utama.', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Arsipkan',
        style: 'destructive',
        onPress: async () => {
          if (!id) return;
          await supabase.from('assets').update({ is_archived: true }).eq('id', id).eq('user_id', user!.id);
          router.back();
        },
      },
    ]);
  };

  if (loading) return <SafeAreaView style={styles.container}><LoadingState /></SafeAreaView>;
  if (error) return <SafeAreaView style={styles.container}><ErrorState message={error} onRetry={fetchData} /></SafeAreaView>;
  if (!asset) return null;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.headerCard}>
          <View style={styles.headerRow}>
            <View style={styles.iconContainer}>
              <Ionicons
                name={iconMap[asset.icon_name] || 'folder-outline'}
                size={36}
                color={COLORS.primary}
              />
            </View>
            <View>
              <Text style={styles.assetName}>{asset.name}</Text>
              <Badge label={asset.category} variant="neutral" />
            </View>
          </View>
        </Card>

        {asset.description && (
          <Card style={styles.descCard}>
            <Text style={styles.descTitle}>Deskripsi</Text>
            <Text style={styles.descText}>{asset.description}</Text>
          </Card>
        )}

        {reminders.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Pengingat Terkait</Text>
            {reminders.map((reminder) => (
              <Card key={reminder.id} style={styles.reminderCard}>
                <View style={styles.reminderRow}>
                  <View style={styles.reminderInfo}>
                    <Text style={styles.reminderTitle}>{reminder.title}</Text>
                    <Text style={styles.reminderDate}>
                      {formatDate(reminder.due_date)}
                    </Text>
                  </View>
                  <Badge
                    label={reminder.status === 'paid' ? 'Terbayar' : reminder.status === 'overdue' ? 'Terlewat' : 'Aktif'}
                    variant={reminder.status === 'paid' ? 'active' : reminder.status === 'overdue' ? 'critical' : 'warning'}
                  />
                </View>
              </Card>
            ))}
          </>
        )}

        <View style={styles.actions}>
          <Button
            title="Edit Aset"
            onPress={() => router.push(`/(tabs)/(assets)/${id}/edit`)}
            variant="secondary"
            style={styles.actionButton}
          />
          <Button
            title="Arsipkan Aset"
            onPress={handleArchive}
            variant="text"
            style={styles.archiveButton}
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
  headerCard: {
    marginBottom: SPACING.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: COLORS.primaryContainer + '40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  assetName: {
    ...TYPOGRAPHY.headline,
    color: COLORS.onSurface,
    marginBottom: SPACING.xs,
  },
  descCard: {
    marginBottom: SPACING.md,
  },
  descTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.onSurfaceVariant,
    marginBottom: SPACING.xs,
  },
  descText: {
    ...TYPOGRAPHY.body,
    color: COLORS.onSurface,
  },
  sectionTitle: {
    ...TYPOGRAPHY.title,
    color: COLORS.onSurface,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  reminderCard: {
    marginBottom: SPACING.sm,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reminderInfo: {
    flex: 1,
  },
  reminderTitle: {
    ...TYPOGRAPHY.title,
    color: COLORS.onSurface,
  },
  reminderDate: {
    ...TYPOGRAPHY.body,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
  },
  actions: {
    marginTop: SPACING.xl,
    gap: SPACING.md,
  },
  actionButton: {},
  archiveButton: {
    marginTop: SPACING.sm,
  },
});
