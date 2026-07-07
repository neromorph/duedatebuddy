import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Alert, StyleSheet, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY, RADII } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/useAuth';
import { NotificationPreferences } from '@/types';
import { useReminders } from '@/features/reminders/useReminders';
import { notificationService } from '@/lib/notifications';
import { getOrCreateNotificationPreferences } from '@/lib/notification-preferences';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { reminders } = useReminders();
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [prefsLoading, setPrefsLoading] = useState(true);

  const loadPrefs = async () => {
    if (!user) {
      setPrefsLoading(false);
      return;
    }

    setPrefs(await getOrCreateNotificationPreferences(user.id));
    setPrefsLoading(false);
  };

  const updatePref = async (key: string, value: any) => {
    if (!user || !prefs) return;
    const { error } = await supabase
      .from('notification_preferences')
      .update({ [key]: value })
      .eq('user_id', user.id);
    if (!error) {
      const updated = { ...prefs, [key]: value };
      setPrefs(updated);
      await notificationService.rescheduleAll(reminders, updated);
    }
  };

  useEffect(() => {
    loadPrefs();
  }, [user]);

  const handleLogout = () => {
    Alert.alert(
      'Keluar',
      'Yakin ingin keluar?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Keluar',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/login');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.pageTitle}>Pengaturan</Text>

        <Card style={styles.profileCard}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={32} color={COLORS.onPrimary} />
          </View>
          <Text style={styles.name}>{user?.user_metadata?.full_name || 'Pengguna'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </Card>

        {!prefsLoading && prefs && (
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Notifikasi</Text>

            <View style={styles.prefRow}>
              <Text style={styles.prefLabel}>Waktu pengingat</Text>
              <Text style={styles.prefValue}>{prefs.notification_time}</Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.prefRow}>
              <Text style={styles.prefLabel}>Gabung notifikasi</Text>
              <Switch
                value={prefs.grouping_enabled}
                onValueChange={(v) => updatePref('grouping_enabled', v)}
                trackColor={{ false: COLORS.outline, true: COLORS.primaryContainer }}
                thumbColor={prefs.grouping_enabled ? COLORS.primary : COLORS.onSurfaceVariant}
              />
            </View>
            <View style={styles.divider} />

            <View style={styles.prefRow}>
              <Text style={styles.prefLabel}>Pengingat akhir pekan</Text>
              <Switch
                value={prefs.weekend_reminders}
                onValueChange={(v) => updatePref('weekend_reminders', v)}
                trackColor={{ false: COLORS.outline, true: COLORS.primaryContainer }}
                thumbColor={prefs.weekend_reminders ? COLORS.primary : COLORS.onSurfaceVariant}
              />
            </View>
            <View style={styles.divider} />

            <View style={styles.prefRow}>
              <Text style={styles.prefLabel}>Frekuensi pengingat terlewat</Text>
              <Text style={styles.prefValue}>
                {prefs.overdue_frequency === 'daily' ? 'Setiap hari' :
                 prefs.overdue_frequency === 'every_other_day' ? '2 hari sekali' :
                 prefs.overdue_frequency === 'weekly' ? 'Mingguan' : 'Tidak ada'}
              </Text>
            </View>
          </Card>
        )}

        <Card style={styles.sectionCard}>
          <View style={styles.menuItem}>
            <Ionicons name="color-palette-outline" size={22} color={COLORS.onSurfaceVariant} />
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>Tampilan</Text>
              <Text style={styles.menuDesc}>Mode terang saja</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.menuItem}>
            <Ionicons name="information-circle-outline" size={22} color={COLORS.onSurfaceVariant} />
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>Tentang</Text>
              <Text style={styles.menuDesc}>Versi 1.0.0</Text>
            </View>
          </View>
        </Card>

        <View style={styles.logoutSection}>
          <Button
            title="Keluar"
            onPress={handleLogout}
            variant="text"
            style={styles.logoutButton}
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
  pageTitle: {
    ...TYPOGRAPHY.headline,
    color: COLORS.onSurface,
    marginBottom: SPACING.xl,
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  name: {
    ...TYPOGRAPHY.title,
    color: COLORS.onSurface,
    marginBottom: 2,
  },
  email: {
    ...TYPOGRAPHY.body,
    color: COLORS.onSurfaceVariant,
  },
  sectionCard: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    ...TYPOGRAPHY.title,
    color: COLORS.onSurface,
    marginBottom: SPACING.md,
  },
  prefRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  prefLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.onSurface,
    flex: 1,
  },
  prefValue: {
    ...TYPOGRAPHY.body,
    color: COLORS.onSurfaceVariant,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
  },
  menuContent: {
    flex: 1,
  },
  menuLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.onSurface,
    fontWeight: '600',
  },
  menuDesc: {
    ...TYPOGRAPHY.label,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.outline + '40',
  },
  logoutSection: {
    marginTop: SPACING.lg,
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: COLORS.statusCritical + '30',
    borderRadius: RADII.md,
  },
});
