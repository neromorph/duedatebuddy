import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { parseISO, subDays } from 'date-fns';
import { logger } from '@/lib/logger';

try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch (e) {
  logger.warn('notifications', 'Failed to set notification handler', undefined, e);
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Pengingat',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  return true;
}

export async function scheduleReminderNotification(reminder: {
  id: string;
  title: string;
  due_date: string;
  remind_before_days: number[];
}): Promise<void> {
  await cancelReminderNotifications(reminder.id);

  const dueDate = parseISO(reminder.due_date);

  for (const daysBefore of reminder.remind_before_days) {
    const triggerDate = subDays(dueDate, daysBefore);
    // Schedule at 01:00 UTC = 08:00 WIB (UTC+7) — ponytail: WIB-only, no DST in Indonesia
    // Set hours in UTC: 01:00 UTC = 08:00 WIB
    triggerDate.setUTCHours(1, 0, 0, 0);

    if (triggerDate <= new Date()) continue;

    const trigger = {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    } as Notifications.NotificationTriggerInput;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Pengingat',
        body: reminder.title,
        data: { reminderId: reminder.id },
      },
      trigger,
    });
  }
}

export async function cancelReminderNotifications(reminderId: string): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const toCancel = scheduled
    .filter((n) => n.content.data?.reminderId === reminderId)
    .map((n) => n.identifier);

  if (toCancel.length > 0) {
    for (const id of toCancel) {
    await Notifications.cancelScheduledNotificationAsync(id);
  }
  }
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
