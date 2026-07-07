import { NotificationPreferences } from '@/types';
import { logger } from './logger';
import { supabase } from './supabase';

export async function getOrCreateNotificationPreferences(userId: string) {
  const { data } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (data) return data as NotificationPreferences;

  const { data: created, error } = await supabase
    .from('notification_preferences')
    .upsert({ user_id: userId }, { onConflict: 'user_id' })
    .select('*')
    .single();

  if (error) {
    logger.error('notification_preferences', 'Gagal membuat preferensi notifikasi', { userId }, error);
    return null;
  }

  return created as NotificationPreferences;
}
