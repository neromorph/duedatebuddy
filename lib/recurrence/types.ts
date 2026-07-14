export const RECURRENCE_VERSION = 1 as const;

export type RecurrenceUnit = 'day' | 'week' | 'month' | 'year';
export type MonthlyMode = 'dayOfMonth' | 'weekday';
export type WeekOfMonth = 1 | 2 | 3 | 4 | -1;

export type RecurrenceEnd =
  | { type: 'never' }
  | { type: 'date'; until: string }
  | { type: 'count'; occurrences: number };

export type DisabledReminderRecurrence = {
  version: typeof RECURRENCE_VERSION;
  enabled: false;
};

export type EnabledReminderRecurrence = {
  version: typeof RECURRENCE_VERSION;
  enabled: true;
  interval: number;
  unit: RecurrenceUnit;
  startDate: string;
  daysOfWeek?: number[];
  monthlyMode?: MonthlyMode;
  dayOfMonth?: number;
  weekOfMonth?: WeekOfMonth;
  weekday?: number;
  end: RecurrenceEnd;
};

export type ReminderRecurrence = DisabledReminderRecurrence | EnabledReminderRecurrence;

export type RecurrencePreset = 'none' | 'weekly' | 'monthly' | 'yearly';
export type LegacyRecurrence = 'none' | 'monthly' | 'yearly';
