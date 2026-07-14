import { Reminder } from '@/types';
import { daysRemaining, isOverdue } from '@/lib/date';

/**
 * Counts reminders that need attention right now.
 * A reminder counts once when:
 * - status is 'pending' or 'overdue', AND
 * - due within 7 days OR already overdue by date/status
 *
 * Each reminder is counted at most once — overdue reminders due yesterday
 * count once, not twice.
 */
export function isPerluPerhatian(reminder: Reminder): boolean {
  if (reminder.status !== 'pending' && reminder.status !== 'overdue') return false;
  return reminder.status === 'overdue' || isOverdue(reminder.due_date) || daysRemaining(reminder.due_date) <= 7;
}

export function getPerluPerhatianReminders(reminders: Reminder[]): Reminder[] {
  return reminders.filter(isPerluPerhatian);
}

export function getPerluPerhatianCount(reminders: Reminder[]): number {
  return getPerluPerhatianReminders(reminders).length;
}
