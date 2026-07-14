import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { safeQuery, safeQuerySingle } from '@/lib/supabase-safe';
import { useAuth } from '@/features/auth/useAuth';
import { Reminder } from '@/types';
import { notificationService } from '@/lib/notifications';
import { getOrCreateNotificationPreferences } from '@/lib/notification-preferences';
import {
  formatLocalDate,
  legacyRecurrenceFromRule,
  nextOccurrence,
  normalizeRecurrenceRule,
} from '@/lib/recurrence';

export function useReminders() {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReminders = useCallback(async () => {
    if (!user) return;
    setError(null);
    setLoading(true);
    const { data, error: err } = await safeQuery<Reminder>(
      () => supabase
        .from('reminders')
        .select('*')
        .eq('user_id', user.id)
        .order('due_date', { ascending: true }),
      'fetchReminders',
    );
    if (err) {
      setError('Gagal memuat pengingat');
    } else {
      setReminders(data || []);
    }
    setLoading(false);
  }, [user]);

  const createReminder = async (reminder: Omit<Reminder, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'paid_at' | 'status'>) => {
    if (!user) return { error: 'Not authenticated' };

    const parsedAmount = reminder.amount !== undefined ? reminder.amount : null;
    const recurrenceRule = normalizeRecurrenceRule(
      reminder.recurrence_rule ?? reminder.recurrence ?? 'none',
      reminder.due_date,
    );

    const { data, error: err } = await safeQuerySingle<Reminder>(
      () => supabase
        .from('reminders')
        .insert({
          user_id: user.id,
          title: reminder.title,
          category: reminder.category,
          due_date: reminder.due_date,
          recurrence: legacyRecurrenceFromRule(recurrenceRule),
          recurrence_rule: recurrenceRule,
          amount: parsedAmount,
          notes: reminder.notes || null,
          remind_before_days: reminder.remind_before_days || [7, 3, 1, 0],
          asset_id: reminder.asset_id || null,
          priority: reminder.priority || 'normal',
          status: 'pending',
        })
        .select()
        .single(),
      'createReminder',
    );

    if (err) return { error: 'Gagal menyimpan pengingat' };

    if (data) {
      const prefs = await getOrCreateNotificationPreferences(user.id);
      if (prefs) {
        await notificationService.scheduleReminder(data, prefs);
      }
    }

    return { data };
  };

  const updateReminder = async (id: string, updates: Partial<Reminder>) => {
    const { error: err } = await safeQuerySingle(
      () => supabase
        .from('reminders')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user?.id)
        .single(),
      'updateReminder',
    );

    if (err) return { error: 'Gagal memperbarui pengingat' };
    return {};
  };

  const deleteReminder = async (id: string) => {
    const { error: err } = await safeQuerySingle(
      () => supabase
        .from('reminders')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id)
        .single(),
      'deleteReminder',
    );

    if (!err) {
      await notificationService.cancel(id);
    }

    if (err) return { error: 'Gagal menghapus pengingat' };
    return {};
  };

  const markAsPaid = async (id: string) => {
    const { data: reminder, error: fetchErr } = await safeQuerySingle<Reminder>(
      () => supabase
        .from('reminders')
        .select('*')
        .eq('id', id)
        .eq('user_id', user?.id)
        .single(),
      'markAsPaid:fetch',
    );

    if (fetchErr || !reminder) return { error: 'Pengingat tidak ditemukan' };

    const { data: paid, error: updateErr } = await safeQuerySingle<Reminder | null>(
      () => supabase
        .from('reminders')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user?.id)
        .eq('status', 'pending')
        .select()
        .maybeSingle(),
      'markAsPaid:update',
    );

    if (updateErr) return { error: 'Gagal memperbarui status' };
    if (!paid) return {};

    const recurrenceRule = normalizeRecurrenceRule(
      reminder.recurrence_rule ?? reminder.recurrence,
      reminder.due_date,
    );
    const nextDueDate = nextOccurrence(recurrenceRule, reminder.due_date);

    if (nextDueDate) {
      const nextDueDateString = formatLocalDate(nextDueDate);
      const { data: existingChild } = await safeQuerySingle<{ id: string } | null>(
        () => supabase
          .from('reminders')
          .select('id')
          .eq('parent_reminder_id', reminder.id)
          .eq('user_id', user?.id)
          .eq('due_date', nextDueDateString)
          .maybeSingle(),
        'markAsPaid:childCheck',
      );

      if (!existingChild) {
        const { data: newReminder } = await safeQuerySingle<Reminder>(
          () => supabase
            .from('reminders')
            .insert({
              user_id: reminder.user_id,
              title: reminder.title,
              category: reminder.category,
              due_date: nextDueDateString,
              recurrence: legacyRecurrenceFromRule(recurrenceRule),
              recurrence_rule: recurrenceRule,
              amount: reminder.amount,
              notes: reminder.notes,
              remind_before_days: reminder.remind_before_days,
              asset_id: reminder.asset_id,
              parent_reminder_id: reminder.id,
              priority: reminder.priority || 'normal',
              status: 'pending',
            })
            .select()
            .single(),
          'markAsPaid:next',
        );

        if (newReminder) {
          const prefs = user ? await getOrCreateNotificationPreferences(user.id) : null;
          if (prefs) {
            await notificationService.scheduleReminder(newReminder, prefs);
          }
        }
      }
    }

    return {};
  };

  return {
    reminders,
    loading,
    error,
    fetchReminders,
    createReminder,
    updateReminder,
    deleteReminder,
    markAsPaid,
  };
}
