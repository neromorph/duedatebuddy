import { isBefore, isSameDay, differenceInDays } from 'date-fns';
import { Reminder, NotificationPreferences } from '@/types';

export type ActionableState = 'upcoming' | 'today' | 'overdue' | 'completed';

export function computeState(reminder: Reminder, now: Date = new Date()): ActionableState {
  if (reminder.status === 'paid') return 'completed';
  const dueDate = new Date(reminder.due_date + 'T00:00:00');
  if (isSameDay(dueDate, now)) return 'today';
  if (isBefore(dueDate, now)) return 'overdue';
  return 'upcoming';
}

export function shouldRenotify(
  reminder: Reminder,
  prefs: NotificationPreferences,
  lastNotifiedAt: Date | null,
  now: Date = new Date(),
): boolean {
  if (reminder.status !== 'pending') return false;
  const dueDate = new Date(reminder.due_date + 'T00:00:00');
  if (!isBefore(dueDate, now)) return false;
  if (prefs.overdue_frequency === 'none') return false;
  if (!lastNotifiedAt) return true;
  const daysSince = differenceInDays(now, lastNotifiedAt);
  switch (prefs.overdue_frequency) {
    case 'daily': return daysSince >= 1;
    case 'every_other_day': return daysSince >= 2;
    case 'weekly': return daysSince >= 7;
    default: return false;
  }
}

export function detectOverdue(reminders: Reminder[], now: Date = new Date()): Reminder[] {
  return reminders.filter(
    (r) => r.status === 'pending' && isBefore(new Date(r.due_date + 'T00:00:00'), now),
  );
}
