import * as Notifications from 'expo-notifications';
import { NotificationInfo, computeTriggers } from './notification-scheduler';
import { Reminder, NotificationPreferences } from '@/types';

export async function schedule(info: NotificationInfo): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: info.title,
      body: info.body,
      data: info.data,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: info.triggerDate,
    },
  });
}

export async function cancel(reminderId: string): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const toCancel = scheduled
    .filter((n) => n.content.data?.reminderId === reminderId)
    .map((n) => n.identifier);

  for (const id of toCancel) {
    await Notifications.cancelScheduledNotificationAsync(id);
  }
}

export async function cancelAll(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function scheduleReminder(
  reminder: Reminder,
  prefs: NotificationPreferences,
): Promise<void> {
  await cancel(reminder.id);
  const dueDate = new Date(reminder.due_date + 'T00:00:00');
  const triggers = computeTriggers(dueDate, prefs.reminder_schedule, prefs.notification_time);

  for (const t of triggers) {
    await schedule({
      title: 'Pengingat',
      body: reminder.title,
      data: { reminderId: reminder.id },
      triggerDate: t.date,
    });
  }
}

export async function rescheduleAll(
  reminders: Reminder[],
  prefs: NotificationPreferences,
): Promise<void> {
  await cancelAll();

  for (const reminder of reminders) {
    if (reminder.status === 'pending') {
      await scheduleReminder(reminder, prefs);
    }
  }
}

export const notificationService = {
  schedule,
  cancel,
  cancelAll,
  scheduleReminder,
  rescheduleAll,
};
