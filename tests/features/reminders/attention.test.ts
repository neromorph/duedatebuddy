import { getPerluPerhatianCount } from '@/features/reminders/attention';
import { Reminder } from '@/types';

// Helpers to build test reminders relative to today (2026-07-14).
const today = '2026-07-14';

function make(due: string, status: string = 'pending'): Reminder {
  return {
    id: `r-${due}-${status}`,
    user_id: 'u1',
    asset_id: null,
    title: `Test ${due}`,
    category: 'tagihan',
    due_date: due,
    recurrence: 'none',
    recurrence_rule: null,
    amount: 10000,
    notes: null,
    remind_before_days: [7, 3, 1],
    status,
    priority: 'normal',
    paid_at: null,
    parent_reminder_id: null,
    created_at: today,
    updated_at: today,
  };
}

describe('getPerluPerhatianCount', () => {
  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-14T12:00:00'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('ignores paid reminders', () => {
    const list = [make(today, 'paid')];
    expect(getPerluPerhatianCount(list)).toBe(0);
  });

  it('ignores reminders due in 8+ days', () => {
    // 2026-07-22 is 8 days away
    const list = [make('2026-07-22')];
    expect(getPerluPerhatianCount(list)).toBe(0);
  });

  it('counts pending reminder due within 7 days', () => {
    // 2026-07-17 is 3 days away
    const list = [make('2026-07-17')];
    expect(getPerluPerhatianCount(list)).toBe(1);
  });

  it('counts pending reminder due today', () => {
    const list = [make(today)];
    expect(getPerluPerhatianCount(list)).toBe(1);
  });

  it('counts reminder with overdue status even if date is in future', () => {
    // Reminder was manually marked overdue; date not yet past
    const list = [make('2026-07-20', 'overdue')];
    expect(getPerluPerhatianCount(list)).toBe(1);
  });

  it('counts reminder overdue by date', () => {
    // 2026-07-10 is 4 days in the past
    const list = [make('2026-07-10')];
    expect(getPerluPerhatianCount(list)).toBe(1);
  });

  it('counts each reminder once even if overdue by both status and date', () => {
    // Due yesterday and marked overdue — should count once, not twice
    const list = [make('2026-07-13', 'overdue')];
    expect(getPerluPerhatianCount(list)).toBe(1);
  });

  it('returns correct count for mixed list', () => {
    const list = [
      make(today),        // counts (today)
      make('2026-07-17'), // counts (3 days)
      make('2026-07-22'), // ignored (8 days)
      make('2026-07-10'), // counts (overdue by date)
      make('2026-07-20', 'overdue'), // counts (overdue by status)
      make(today, 'paid'), // ignored (paid)
    ];
    expect(getPerluPerhatianCount(list)).toBe(4);
  });

  it('returns 0 for empty list', () => {
    expect(getPerluPerhatianCount([])).toBe(0);
  });
});
