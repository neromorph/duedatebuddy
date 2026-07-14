import { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { supabase } from '@/lib/supabase';
import { safeQuery, safeQuerySingle } from '@/lib/supabase-safe';
import { logger } from '@/lib/logger';
import { useAuth } from '@/features/auth/useAuth';
import { Reminder, NotificationPreferences } from '@/types';
import { notificationService } from '@/lib/notifications';
import { getOrCreateNotificationPreferences } from '@/lib/notification-preferences';
import {
  isSweepEligible,
  legacyRecurrenceFromRule,
  normalizeRecurrenceRule,
  planCatchUp,
} from '@/lib/recurrence';

const WARM_FOREGROUND_DEBOUNCE_MS = 5 * 60 * 1000;
// ponytail: 120-step safety bound; weekly+multi-year absence could otherwise loop forever.
// RPC-batch per chain is the documented upgrade path.
const MAX_CATCHUP_STEPS = 120;

async function advanceChain(
  reminder: Reminder,
  prefs: NotificationPreferences,
  userId: string,
): Promise<void> {
  const rule = normalizeRecurrenceRule(
    reminder.recurrence_rule ?? reminder.recurrence,
    reminder.due_date,
  );

  const { data: claimed } = await safeQuerySingle<Reminder | null>(
    () =>
      supabase
        .from('reminders')
        .update({ status: 'overdue' })
        .eq('id', reminder.id)
        .eq('user_id', userId)
        .eq('status', 'pending')
        .select()
        .maybeSingle(),
    'sweep:gate',
  );

  if (!claimed) return;

  let parentId = reminder.id;
  const steps = planCatchUp(rule, reminder.due_date, new Date(), MAX_CATCHUP_STEPS);

  for (const step of steps) {
    const { data: created } = await safeQuerySingle<Reminder | null>(
      () =>
        supabase
          .from('reminders')
          .insert({
            user_id: userId,
            title: reminder.title,
            category: reminder.category,
            due_date: step.dueDate,
            recurrence: legacyRecurrenceFromRule(rule),
            recurrence_rule: rule,
            amount: reminder.amount,
            notes: reminder.notes,
            remind_before_days: reminder.remind_before_days,
            asset_id: reminder.asset_id,
            parent_reminder_id: parentId,
            priority: reminder.priority || 'normal',
            status: 'pending',
          })
          .select()
          .single(),
      'sweep:insert',
    );

    if (!created) {
      logger.error('sweep', 'insert failed; partial catch-up, next foreground resumes', {
        parentId,
        dueDate: step.dueDate,
      });
      return;
    }

    await notificationService.scheduleReminder(created, prefs);

    parentId = created.id;

    if (step.isUpcoming) return;

    const { data: flipped } = await safeQuerySingle<Reminder | null>(
      () =>
        supabase
          .from('reminders')
          .update({ status: 'overdue' })
          .eq('id', created.id)
          .eq('user_id', userId)
          .eq('status', 'pending')
          .select()
          .maybeSingle(),
      'sweep:flip',
    );

    if (!flipped) return;
  }
}

export function useReminderSweep() {
  const { user } = useAuth();
  const lastWarmSweepAt = useRef<number>(0);

  const runSweep = useCallback(async () => {
    if (!user) return;

    const { data: pending, error: fetchErr } = await safeQuery<Reminder>(
      () =>
        supabase
          .from('reminders')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .order('due_date', { ascending: true }),
      'sweep:fetch',
    );

    if (fetchErr || !pending) return;

    const now = new Date();
    const eligible = pending.filter((r) => isSweepEligible(r, now));
    if (eligible.length === 0) return;

    const prefs = await getOrCreateNotificationPreferences(user.id);
    if (!prefs) return;

    for (const reminder of eligible) {
      try {
        await advanceChain(reminder, prefs, user.id);
      } catch (e) {
        logger.error('sweep', 'advanceChain threw', { reminderId: reminder.id }, e);
      }
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    void runSweep();
  }, [user, runSweep]);

  useEffect(() => {
    if (!user) return;
    const onChange = (state: AppStateStatus) => {
      if (state !== 'active') return;
      const now = Date.now();
      if (now - lastWarmSweepAt.current < WARM_FOREGROUND_DEBOUNCE_MS) return;
      lastWarmSweepAt.current = now;
      void runSweep();
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [user, runSweep]);
}
