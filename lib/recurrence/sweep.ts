import { isBefore, startOfDay } from 'date-fns';
import type { Reminder } from '@/types';
import { nextOccurrence, normalizeRecurrenceRule, formatLocalDate, parseLocalDate } from './index';
import type { ReminderRecurrence } from './types';

export type CatchUpStep = {
  dueDate: string;
  isUpcoming: boolean;
};

export function isSweepEligible(reminder: Reminder, now: Date = new Date()): boolean {
  if (reminder.status !== 'pending') return false;
  const rule = normalizeRecurrenceRule(
    reminder.recurrence_rule ?? reminder.recurrence,
    reminder.due_date,
  );
  if (!rule.enabled) return false;
  const due = parseLocalDate(reminder.due_date);
  return isBefore(due, startOfDay(now));
}

export function planCatchUp(
  rule: ReminderRecurrence,
  fromDueDate: string,
  now: Date = new Date(),
  maxSteps = 120,
): CatchUpStep[] {
  if (!rule.enabled) return [];
  const today = startOfDay(now);
  const steps: CatchUpStep[] = [];
  let current = fromDueDate;

  for (let i = 0; i < maxSteps; i += 1) {
    const next = nextOccurrence(rule, current);
    if (next === null) break;
    const dueDate = formatLocalDate(next);
    const nextDate = parseLocalDate(dueDate);
    const isUpcoming = !isBefore(nextDate, today);
    steps.push({ dueDate, isUpcoming });
    if (isUpcoming) break;
    current = dueDate;
  }

  return steps;
}
