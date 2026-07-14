import { format, isValid, parse } from 'date-fns';
import { parseRecurrenceRule } from './schema';
import { buildRecurrencePreset } from './presets';
import { RECURRENCE_VERSION, LegacyRecurrence, ReminderRecurrence } from './types';

export function parseLocalDate(value: string): Date {
  const parsed = parse(value, 'yyyy-MM-dd', new Date());
  return isValid(parsed) ? parsed : new Date(value + 'T00:00:00');
}

export function formatLocalDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

function isLegacyRecurrence(value: unknown): value is LegacyRecurrence {
  return value === 'none' || value === 'monthly' || value === 'yearly';
}

export function normalizeRecurrenceRule(value: unknown, dueDate: string): ReminderRecurrence {
  if (value == null) {
    return { version: RECURRENCE_VERSION, enabled: false };
  }
  if (isLegacyRecurrence(value)) {
    if (value === 'none') return { version: RECURRENCE_VERSION, enabled: false };
    return buildRecurrencePreset(value, dueDate);
  }

  try {
    return parseRecurrenceRule(value);
  } catch {
    return { version: RECURRENCE_VERSION, enabled: false };
  }
}
