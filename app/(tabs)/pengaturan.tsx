import React from 'react';
import { View, Text, ScrollView, Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY, RADII } from '@/lib/theme';
import { useAuth } from '@/features/auth/useAuth';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();

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

        <Card style={styles.sectionCard}>
          <View style={styles.menuItem}>
            <Ionicons name="notifications-outline" size={22} color={COLORS.onSurfaceVariant} />
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>Notifikasi</Text>
              <Text style={styles.menuDesc}>Kelola pengaturan notifikasi</Text>
            </View>
          </View>
          <View style={styles.divider} />
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
