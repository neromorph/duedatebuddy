import { subDays, differenceInDays } from 'date-fns';
import { Reminder } from '@/types';

export type TriggerInfo = {
  date: Date;
  type: 'reminder' | 'digest' | 'overdue';
};

export type NotificationInfo = {
  title: string;
  body: string;
  data: { reminderId: string };
  triggerDate: Date;
};

export function computeTriggers(
  dueDate: Date,
  schedule: number[],
  notificationTime: string,
): TriggerInfo[] {
  const [hours, minutes] = notificationTime.split(':').map(Number);
  const now = new Date();
  return schedule
    .map((daysBefore) => {
      const d = subDays(dueDate, daysBefore);
      d.setHours(hours, minutes, 0, 0);
      return { date: d, type: 'reminder' as const };
    })
    .filter((t) => t.date > now);
}

export function buildDigestBody(
  reminders: { title: string; amount?: number | null }[],
): string {
  const lines = reminders.map(
    (r) =>
      `${r.title}${r.amount != null ? ` — Rp${r.amount.toLocaleString('id-ID')}` : ''}`,
  );
  return [`📅 ${reminders.length} pengingat hari ini`, ...lines].join('\n');
}

export function buildOverdueBody(reminder: {
  title: string;
  amount?: number | null;
  due_date: string;
}): string {
  const days = differenceInDays(new Date(), new Date(reminder.due_date + 'T00:00:00'));
  const amount = reminder.amount != null
    ? ` — Rp${reminder.amount.toLocaleString('id-ID')}`
    : '';
  return `Terlewat! ${reminder.title}${amount} (${days} hari lewat)`;
}
