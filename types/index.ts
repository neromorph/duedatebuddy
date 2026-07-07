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

export type Reminder = {
  id: string;
  user_id: string;
  asset_id: string | null;
  title: string;
  category: string;
  due_date: string;
  recurrence: string;
  amount: number | null;
  notes: string | null;
  remind_before_days: number[];
  status: string;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ReminderCategory = 'tagihan' | 'pajak' | 'asuransi' | 'cicilan' | 'langganan' | 'lainnya';
export type RecurrenceType = 'none' | 'monthly' | 'yearly';
export type ReminderStatus = 'pending' | 'paid' | 'overdue';
export type AssetCategory = 'property' | 'vehicle' | 'subscription' | 'utility' | 'insurance' | 'loan' | 'custom';
