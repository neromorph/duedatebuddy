import * as Notifications from 'expo-notifications';
import { NotificationInfo } from './notification-scheduler';
import { Reminder, NotificationPreferences } from '@/types';
import { computeTriggers } from './notification-scheduler';

export interface NotificationProvider {
  schedule(info: NotificationInfo): Promise<void>;
  cancel(reminderId: string): Promise<void>;
  cancelAll(): Promise<void>;
}

export class LocalNotificationProvider implements NotificationProvider {
  async schedule(info: NotificationInfo): Promise<void> {
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

  async cancel(reminderId: string): Promise<void> {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const toCancel = scheduled
      .filter((n) => n.content.data?.reminderId === reminderId)
      .map((n) => n.identifier);
    for (const id of toCancel) {
      await Notifications.cancelScheduledNotificationAsync(id);
    }
  }

  async cancelAll(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }
}

export class NotificationService {
  private provider: NotificationProvider;

  constructor(provider: NotificationProvider) {
    this.provider = provider;
  }

  setProvider(provider: NotificationProvider): void {
    this.provider = provider;
  }

  async schedule(info: NotificationInfo): Promise<void> {
    await this.provider.schedule(info);
  }

  async cancel(reminderId: string): Promise<void> {
    await this.provider.cancel(reminderId);
  }

  async cancelAll(): Promise<void> {
    await this.provider.cancelAll();
  }

  async scheduleReminder(
    reminder: Reminder,
    prefs: NotificationPreferences,
  ): Promise<void> {
    await this.cancel(reminder.id);
    const dueDate = new Date(reminder.due_date + 'T00:00:00');
    const triggers = computeTriggers(dueDate, prefs.reminder_schedule, prefs.notification_time);
    for (const t of triggers) {
      await this.schedule({
        title: 'Pengingat',
        body: reminder.title,
        data: { reminderId: reminder.id },
        triggerDate: t.date,
      });
    }
  }

  async rescheduleAll(
    reminders: Reminder[],
    prefs: NotificationPreferences,
  ): Promise<void> {
    await this.cancelAll();
    for (const r of reminders) {
      if (r.status === 'pending') {
        await this.scheduleReminder(r, prefs);
      }
    }
  }
}
