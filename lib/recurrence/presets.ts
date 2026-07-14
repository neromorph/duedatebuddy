import { getDay } from 'date-fns';
import { parseLocalDate } from './normalize';
import { RECURRENCE_VERSION, RecurrencePreset, ReminderRecurrence } from './types';

export function buildRecurrencePreset(preset: RecurrencePreset, dueDate: string): ReminderRecurrence {
  if (preset === 'none') return { version: RECURRENCE_VERSION, enabled: false };

  const startDate = dueDate;
  const base = {
    version: RECURRENCE_VERSION,
    enabled: true,
    interval: 1,
    startDate,
    end: { type: 'never' as const },
  };

  if (preset === 'weekly') {
    return { ...base, unit: 'week', daysOfWeek: [getDay(parseLocalDate(dueDate))] };
  }

  if (preset === 'monthly') {
    return {
      ...base,
      unit: 'month',
      monthlyMode: 'dayOfMonth',
      dayOfMonth: parseLocalDate(dueDate).getDate(),
    };
  }

  return { ...base, unit: 'year' };
}
