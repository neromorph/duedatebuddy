import type { ReminderRecurrence } from './types';

export * from './types';
export * from './schema';
export * from './normalize';
export * from './presets';
export * from './calc';
export * from './summary';
export * from './sweep';

export function legacyRecurrenceFromRule(rule: ReminderRecurrence): string {
  if (!rule.enabled) return 'none';
  if (rule.unit === 'month') return 'monthly';
  if (rule.unit === 'year') return 'yearly';
  return 'custom';
}
