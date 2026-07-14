import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarMonths,
  differenceInCalendarWeeks,
  differenceInCalendarYears,
  endOfMonth,
  getDay,
  isAfter,
  isBefore,
  setDate,
  startOfMonth,
} from 'date-fns';
import { formatLocalDate, parseLocalDate } from './normalize';
import { ReminderRecurrence } from './types';

function asDate(value: string | Date): Date {
  return typeof value === 'string' ? parseLocalDate(value) : value;
}

function clampDay(year: number, monthIndex: number, day: number): Date {
  const first = new Date(year, monthIndex, 1);
  const last = endOfMonth(first).getDate();
  return setDate(first, Math.min(day, last));
}

function addMonthsUsingRuleDay(from: Date, months: number, dayOfMonth: number): Date {
  const target = addMonths(new Date(from.getFullYear(), from.getMonth(), 1), months);
  return clampDay(target.getFullYear(), target.getMonth(), dayOfMonth);
}

function addYearsUsingAnchorDay(from: Date, years: number, anchor: Date): Date {
  return clampDay(from.getFullYear() + years, anchor.getMonth(), anchor.getDate());
}

function nthWeekdayOfMonth(year: number, monthIndex: number, weekday: number, weekOfMonth: number): Date {
  const first = startOfMonth(new Date(year, monthIndex, 1));
  if (weekOfMonth === -1) {
    const last = endOfMonth(first);
    const offset = (getDay(last) - weekday + 7) % 7;
    return addDays(last, -offset);
  }

  const offset = (weekday - getDay(first) + 7) % 7;
  return addDays(first, offset + (weekOfMonth - 1) * 7);
}

function nextWeekly(
  rule: Extract<ReminderRecurrence, { enabled: true }>,
  from: Date,
): Date {
  const weekdays = (
    rule.daysOfWeek?.length ? rule.daysOfWeek : [getDay(parseLocalDate(rule.startDate))]
  )
    .slice()
    .sort((a, b) => a - b);
  const start = parseLocalDate(rule.startDate);

  for (let offset = 1; offset <= rule.interval * 7 + 7; offset += 1) {
    const candidate = addDays(from, offset);
    const weeksSinceStart = differenceInCalendarWeeks(candidate, start, { weekStartsOn: 0 });
    if (weeksSinceStart < 0 || weeksSinceStart % rule.interval !== 0) continue;
    if (weekdays.includes(getDay(candidate))) return candidate;
  }

  return addWeeks(from, rule.interval);
}

function nextMonthly(
  rule: Extract<ReminderRecurrence, { enabled: true }>,
  from: Date,
): Date {
  if (rule.monthlyMode === 'weekday') {
    const base = addMonths(new Date(from.getFullYear(), from.getMonth(), 1), rule.interval);
    return nthWeekdayOfMonth(base.getFullYear(), base.getMonth(), rule.weekday!, rule.weekOfMonth!);
  }

  const day = rule.dayOfMonth ?? parseLocalDate(rule.startDate).getDate();
  return addMonthsUsingRuleDay(from, rule.interval, day);
}

function rawNextOccurrence(
  rule: Extract<ReminderRecurrence, { enabled: true }>,
  from: Date,
): Date {
  switch (rule.unit) {
    case 'day':
      return addDays(from, rule.interval);
    case 'week':
      return nextWeekly(rule, from);
    case 'month':
      return nextMonthly(rule, from);
    case 'year':
      return addYearsUsingAnchorDay(from, rule.interval, parseLocalDate(rule.startDate));
  }
}

function occurrenceIndex(
  rule: Extract<ReminderRecurrence, { enabled: true }>,
  date: Date,
): number {
  const start = parseLocalDate(rule.startDate);
  if (formatLocalDate(date) === rule.startDate) return 1;

  if (rule.unit === 'day') {
    return Math.floor((date.getTime() - start.getTime()) / 86400000 / rule.interval) + 1;
  }
  if (rule.unit === 'week') {
    return Math.floor(differenceInCalendarWeeks(date, start, { weekStartsOn: 0 }) / rule.interval) + 1;
  }
  if (rule.unit === 'month') {
    return Math.floor(differenceInCalendarMonths(date, start) / rule.interval) + 1;
  }
  return Math.floor(differenceInCalendarYears(date, start) / rule.interval) + 1;
}

function violatesEnd(
  rule: Extract<ReminderRecurrence, { enabled: true }>,
  candidate: Date,
): boolean {
  if (rule.end.type === 'never') return false;
  if (rule.end.type === 'date') return isAfter(candidate, parseLocalDate(rule.end.until));
  return occurrenceIndex(rule, candidate) > rule.end.occurrences;
}

export function nextOccurrence(
  rule: ReminderRecurrence,
  fromDate: string | Date,
): Date | null {
  if (!rule.enabled) return null;

  const from = asDate(fromDate);
  const start = parseLocalDate(rule.startDate);
  if (isBefore(from, start)) return violatesEnd(rule, start) ? null : start;

  const candidate = rawNextOccurrence(rule, from);
  return violatesEnd(rule, candidate) ? null : candidate;
}

export function getOccurrenceIndex(
  rule: ReminderRecurrence,
  date: string | Date,
): number {
  if (!rule.enabled) return 0;
  return occurrenceIndex(rule, asDate(date));
}
