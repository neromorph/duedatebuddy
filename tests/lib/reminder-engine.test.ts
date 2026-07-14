import { computeState, shouldRenotify, detectOverdue } from '../../lib/reminder-engine';
import { Reminder, NotificationPreferences } from '../../types';

const baseReminder: Reminder = {
  id: '1',
  user_id: 'u1',
  asset_id: null,
  title: 'Test Reminder',
  category: 'tagihan',
  due_date: '2026-07-10',
  recurrence: 'none',
  recurrence_rule: { version: 1, enabled: false },
  amount: 100000,
  notes: null,
  remind_before_days: [7, 3, 1],
  priority: 'normal',
  parent_reminder_id: null,
  status: 'pending',
  paid_at: null,
  created_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-07-01T00:00:00Z',
};

const prefs: NotificationPreferences = {
  id: 'p1',
  user_id: 'u1',
  notification_time: '08:00',
  reminder_schedule: [30, 14, 7, 3, 1],
  grouping_enabled: true,
  weekend_reminders: true,
  quiet_hours_start: null,
  quiet_hours_end: null,
  overdue_frequency: 'daily',
  auto_archive_days: 90,
  created_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-07-01T00:00:00Z',
};

describe('computeState', () => {
  it('returns "upcoming" for pending reminder with future due_date', () => {
    const now = new Date('2026-07-05T00:00:00');
    expect(computeState(baseReminder, now)).toBe('upcoming');
  });

  it('returns "today" for pending reminder due today', () => {
    const now = new Date('2026-07-10T00:00:00');
    expect(computeState(baseReminder, now)).toBe('today');
  });

  it('returns "overdue" for pending reminder past due_date', () => {
    const now = new Date('2026-07-11T00:00:00');
    expect(computeState(baseReminder, now)).toBe('overdue');
  });

  it('returns "completed" for paid reminder', () => {
    const paidReminder = { ...baseReminder, status: 'paid' as const, paid_at: '2026-07-10T08:00:00Z' };
    const now = new Date('2026-07-11T00:00:00');
    expect(computeState(paidReminder, now)).toBe('completed');
  });
});

describe('shouldRenotify', () => {
  it('returns false for non-pending reminder', () => {
    const paidReminder = { ...baseReminder, status: 'paid' as const };
    expect(shouldRenotify(paidReminder, prefs, null, new Date('2026-07-15T00:00:00'))).toBe(false);
  });

  it('returns false if reminder is not overdue yet', () => {
    const now = new Date('2026-07-05T00:00:00');
    expect(shouldRenotify(baseReminder, prefs, null, now)).toBe(false);
  });

  it('returns true for overdue reminder with no last notification', () => {
    const now = new Date('2026-07-15T00:00:00');
    expect(shouldRenotify(baseReminder, prefs, null, now)).toBe(true);
  });

  it('returns true when last notified >1 day ago with daily frequency', () => {
    const lastNotified = new Date('2026-07-13T00:00:00');
    const now = new Date('2026-07-15T00:00:00');
    expect(shouldRenotify(baseReminder, prefs, lastNotified, now)).toBe(true);
  });

  it('returns false when last notified today with daily frequency', () => {
    const lastNotified = new Date('2026-07-15T08:00:00');
    const now = new Date('2026-07-15T10:00:00');
    expect(shouldRenotify(baseReminder, prefs, lastNotified, now)).toBe(false);
  });

  it('returns false when overdue_frequency is none', () => {
    const quietPrefs = { ...prefs, overdue_frequency: 'none' as const };
    const now = new Date('2026-07-15T00:00:00');
    expect(shouldRenotify(baseReminder, quietPrefs, null, now)).toBe(false);
  });
});

describe('detectOverdue', () => {
  it('returns empty array when no reminders are overdue', () => {
    const now = new Date('2026-07-05T00:00:00');
    expect(detectOverdue([baseReminder], now)).toEqual([]);
  });

  it('returns reminders with pending status and past due_date', () => {
    const now = new Date('2026-07-15T00:00:00');
    const overdue = detectOverdue([baseReminder], now);
    expect(overdue).toHaveLength(1);
    expect(overdue[0].id).toBe('1');
  });

  it('excludes paid reminders', () => {
    const paidReminder = { ...baseReminder, status: 'paid' as const };
    const now = new Date('2026-07-15T00:00:00');
    expect(detectOverdue([paidReminder], now)).toEqual([]);
  });
});
