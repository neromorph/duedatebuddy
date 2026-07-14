import { startOfDay } from 'date-fns';
import { isSweepEligible, planCatchUp } from '../../lib/recurrence/sweep';
import { normalizeRecurrenceRule } from '../../lib/recurrence';
import type { Reminder } from '../../types';

const baseReminder = (over: Partial<Reminder>): Reminder => ({
  id: 'r1',
  user_id: 'u',
  asset_id: null,
  title: 'Listrik',
  category: 'tagihan',
  due_date: '2026-07-20',
  recurrence: 'monthly',
  recurrence_rule: null,
  amount: null,
  notes: null,
  remind_before_days: [7, 3, 1, 0],
  status: 'pending',
  priority: 'normal',
  paid_at: null,
  parent_reminder_id: null,
  created_at: '',
  updated_at: '',
  ...over,
});

describe('isSweepEligible', () => {
  it('is eligible when pending + enabled + past-due', () => {
    const r = baseReminder({ due_date: '2026-07-20' });
    expect(isSweepEligible(r, new Date('2026-08-15T12:00:00'))).toBe(true);
  });

  it('is not eligible when status is paid', () => {
    const r = baseReminder({ status: 'paid' });
    expect(isSweepEligible(r, new Date('2026-08-15'))).toBe(false);
  });

  it('is not eligible when recurrence is disabled', () => {
    const r = baseReminder({
      recurrence: 'none',
      recurrence_rule: { version: 1, enabled: false },
    });
    expect(isSweepEligible(r, new Date('2026-08-15'))).toBe(false);
  });

  it('is not eligible when due date is today or future', () => {
    const r = baseReminder({ due_date: '2026-08-15' });
    expect(isSweepEligible(r, new Date('2026-08-15T12:00:00'))).toBe(false);
  });
});

describe('planCatchUp', () => {
  const monthly = normalizeRecurrenceRule('monthly', '2026-07-20');

  it('returns empty for a disabled rule', () => {
    expect(
      planCatchUp({ version: 1, enabled: false }, '2026-07-20', new Date('2026-08-15')),
    ).toEqual([]);
  });

  it('plans a single upcoming next when one period has passed', () => {
    const steps = planCatchUp(monthly, '2026-07-20', new Date('2026-08-15'));
    expect(steps).toEqual([{ dueDate: '2026-08-20', isUpcoming: true }]);
  });

  it('plans full history across multiple missed periods', () => {
    const steps = planCatchUp(monthly, '2026-07-20', new Date('2026-11-15'));
    expect(steps).toEqual([
      { dueDate: '2026-08-20', isUpcoming: false },
      { dueDate: '2026-09-20', isUpcoming: false },
      { dueDate: '2026-10-20', isUpcoming: false },
      { dueDate: '2026-11-20', isUpcoming: true },
    ]);
  });

  it('stops when a count end is reached, even if more periods are missed', () => {
    const rule = { ...monthly, end: { type: 'count' as const, occurrences: 2 } };
    const steps = planCatchUp(rule, '2026-07-20', new Date('2026-11-15'));
    // occurrence 1 = start (Jul 20), occurrence 2 = Aug 20 -> count exhausted, no further
    expect(steps).toEqual([{ dueDate: '2026-08-20', isUpcoming: false }]);
  });

  it('stops when an end date is reached', () => {
    const rule = { ...monthly, end: { type: 'date' as const, until: '2026-09-15' } };
    const steps = planCatchUp(rule, '2026-07-20', new Date('2026-11-15'));
    // next after Jul 20 is Aug 20 (<= until) ok; next after Aug 20 is Sep 20 (> until) -> null -> stop
    expect(steps).toEqual([{ dueDate: '2026-08-20', isUpcoming: false }]);
  });

  it('honors maxSteps as a safety bound', () => {
    const steps = planCatchUp(monthly, '2026-07-20', new Date('2030-11-15'), 3);
    expect(steps.length).toBe(3);
  });
});

describe('planCatchUp edge cases', () => {
  it('treats a next-occurrence that lands exactly on today as upcoming', () => {
    const monthly = normalizeRecurrenceRule('monthly', '2026-07-20');
    const steps = planCatchUp(monthly, '2026-07-20', new Date('2026-08-20T12:00:00'));
    expect(steps).toEqual([{ dueDate: '2026-08-20', isUpcoming: true }]);
  });

  it('does not include the start row itself', () => {
    const monthly = normalizeRecurrenceRule('monthly', '2026-07-20');
    const steps = planCatchUp(monthly, '2026-07-20', new Date('2026-09-01'));
    const dates = steps.map((s) => s.dueDate);
    expect(dates).not.toContain('2026-07-20');
    expect(dates).toContain('2026-08-20');
  });
});

describe('isSweepEligible date boundary', () => {
  it('treats a reminder due today as not eligible (still upcoming today)', () => {
    const r = baseReminder({ due_date: '2026-08-15' });
    expect(isSweepEligible(r, new Date('2026-08-15T00:00:01'))).toBe(false);
  });

  it('treats a reminder due yesterday as eligible', () => {
    const r = baseReminder({ due_date: '2026-08-14' });
    expect(isSweepEligible(r, new Date('2026-08-15T00:00:01'))).toBe(true);
  });
});
