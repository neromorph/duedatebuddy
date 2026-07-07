import React from 'react';
import { ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useBottomTabBarHeight } from 'expo-router/build/react-navigation/bottom-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '@/lib/theme';
import { useReminders } from '@/features/reminders/useReminders';
import ReminderForm from '@/features/reminders/ReminderForm';
import { requestNotificationPermissions, scheduleReminderNotification } from '@/lib/notifications';

export default function TambahPengingatScreen() {
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
  const { createReminder } = useReminders();

  const handleSubmit = async (data: any) => {
    const result = await createReminder(data);
    if (result.data) {
      await requestNotificationPermissions();
      await scheduleReminderNotification({
        id: result.data.id,
        title: result.data.title,
        due_date: result.data.due_date,
        remind_before_days: result.data.remind_before_days,
      });
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + SPACING.lg }]}
        >
          <ReminderForm onSubmit={handleSubmit} submitLabel="Tambah Pengingat" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  kav: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: SPACING.lg,
  },
});
