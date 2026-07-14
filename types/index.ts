export type Profile = {
  id: string;
  full_name: string | null;
  created_at: string;
};

export type AssetTemplate = {
  id: string;
  name: string;
  category: string;
  icon_name: string;
  default_fields: Record<string, unknown>[];
  is_system: boolean;
  created_at: string;
};

export type Asset = {
  id: string;
  user_id: string;
  template_id: string | null;
  name: string;
  category: string;
  icon_name: string;
  description: string | null;
  custom_fields: Record<string, unknown>;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

import type { ReminderRecurrence } from '@/lib/recurrence';

export type Reminder = {
  id: string;
  user_id: string;
  asset_id: string | null;
  title: string;
  category: string;
  due_date: string;
  /** @deprecated Use recurrence_rule. Kept for rollback and legacy migration only. */
  recurrence: string;
  recurrence_rule: ReminderRecurrence | null;
  amount: number | null;
  notes: string | null;
  remind_before_days: number[];
  status: string;
  priority: Priority;
  paid_at: string | null;
  parent_reminder_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ReminderCategory = 'tagihan' | 'pajak' | 'asuransi' | 'cicilan' | 'langganan' | 'lainnya';
/** @deprecated Use ReminderRecurrence. */
export type RecurrenceType = 'none' | 'monthly' | 'yearly' | 'custom';
export type ReminderStatus = 'pending' | 'paid' | 'overdue';
export type AssetCategory = 'property' | 'vehicle' | 'subscription' | 'utility' | 'insurance' | 'loan' | 'custom';

export type Priority = 'critical' | 'high' | 'normal' | 'low';
export type ReminderPriority = Priority;
export type OverdueFrequency = 'daily' | 'every_other_day' | 'weekly' | 'none';

export type NotificationPreferences = {
  id: string;
  user_id: string;
  notification_time: string;
  reminder_schedule: number[];
  grouping_enabled: boolean;
  weekend_reminders: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  overdue_frequency: OverdueFrequency;
  auto_archive_days: number | null;
  created_at: string;
  updated_at: string;
};
