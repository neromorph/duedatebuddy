import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { logger } from './logger';
export { notificationService } from './notification-service';

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
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Pengingat',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isServiceUnavailable(e: unknown): boolean {
  return String(e instanceof Error ? e.message : e).includes('SERVICE_NOT_AVAILABLE');
}

export async function getExpoPushToken(): Promise<string | null> {
  const granted = await requestNotificationPermissions();
  if (!granted) return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    logger.error('notifications', 'EAS projectId not found');
    return null;
  }

  for (const delay of [0, 1000, 3000, 10000, 30000]) {
    if (delay > 0) await wait(delay);
    try {
      const token = await Notifications.getExpoPushTokenAsync({ projectId });
      return token.data;
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      logger.warn('notifications', 'Expo push token attempt failed', { error }, e);
      if (!isServiceUnavailable(e)) throw e;
    }
  }

  logger.warn('notifications', 'Expo push token unavailable; will retry on next app start');
  return null;
}
