import React, { useEffect, useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/useAuth';
import { Reminder } from '@/types';
import ReminderForm from '@/features/reminders/ReminderForm';
import LoadingState from '@/components/ui/LoadingState';
import { requestNotificationPermissions, notificationService } from '@/lib/notifications';
import { logger } from '@/lib/logger';

export default function EditPengingatScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [reminder, setReminder] = useState<Reminder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !user) return;
    supabase
      .from('reminders')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        setReminder(data);
        setLoading(false);
      });
  }, [id, user]);

  const handleSubmit = async (formData: any) => {
    if (!id || !user) return;

    const { error: updateErr } = await supabase
      .from('reminders')
      .update({
        title: formData.title,
        category: formData.category,
        due_date: formData.due_date,
        recurrence: formData.recurrence,
        amount: formData.amount,
        notes: formData.notes,
        remind_before_days: formData.remind_before_days,
        asset_id: formData.asset_id,
        priority: formData.priority || 'normal',
      })
      .eq('id', id)
      .eq('user_id', user.id);

    if (updateErr) {
      logger.error('reminders', 'Gagal menyimpan perubahan pengingat', { reminderId: id }, updateErr);
      Alert.alert('Error', 'Gagal menyimpan perubahan pengingat');
      return;
    }

    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (prefs) {
      const fullReminder = { ...reminder!, ...formData, priority: formData.priority || 'normal' };
      await notificationService.scheduleReminder(fullReminder, prefs);
    }

    await requestNotificationPermissions();

    router.back();
  };

  if (loading) {
    return <SafeAreaView style={styles.container}><LoadingState /></SafeAreaView>;
  }

  if (!reminder) return null;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.content}>
          <ReminderForm
          onSubmit={handleSubmit}
          defaultValues={reminder}
          submitLabel="Simpan Perubahan"
        />
        </View>
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
    flex: 1,
    padding: SPACING.lg,
  },
});
