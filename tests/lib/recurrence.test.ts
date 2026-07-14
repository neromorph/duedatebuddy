import {
  buildRecurrencePreset,
  formatLocalDate,
  getOccurrenceIndex,
  nextOccurrence,
  normalizeRecurrenceRule,
  parseRecurrenceRule,
  ReminderRecurrence,
  summarizeRecurrence,
} from '../../lib/recurrence';

describe('recurrence normalization and presets', () => {
  it('normalizes legacy none to a versioned disabled rule', () => {
    expect(normalizeRecurrenceRule('none', '2026-07-14')).toEqual({
      version: 1,
      enabled: false,
    });
  });

  it('normalizes legacy monthly using the due date day', () => {
    expect(normalizeRecurrenceRule('monthly', '2026-07-31')).toEqual({
      version: 1,
      enabled: true,
      interval: 1,
      unit: 'month',
      startDate: '2026-07-31',
      monthlyMode: 'dayOfMonth',
      dayOfMonth: 31,
      end: { type: 'never' },
    });
  });

  it('normalizes legacy yearly without storing month', () => {
    expect(normalizeRecurrenceRule('yearly', '2026-02-28')).toEqual({
      version: 1,
      enabled: true,
      interval: 1,
      unit: 'year',
      startDate: '2026-02-28',
      end: { type: 'never' },
    });
  });

  it('builds weekly preset from due date weekday', () => {
    expect(buildRecurrencePreset('weekly', '2026-07-14')).toMatchObject({
      version: 1,
      enabled: true,
      interval: 1,
      unit: 'week',
      startDate: '2026-07-14',
      daysOfWeek: [2],
      end: { type: 'never' },
    });
  });

  it('rejects invalid intervals', () => {
    expect(() =>
      parseRecurrenceRule({
        version: 1,
        enabled: true,
        interval: 0,
        unit: 'week',
        startDate: '2026-07-14',
        end: { type: 'never' },
      }),
    ).toThrow();
  });

  it('falls back to disabled rule for corrupt input', () => {
    expect(normalizeRecurrenceRule({ version: 99, enabled: true }, '2026-07-14')).toEqual({
      version: 1,
      enabled: false,
    });
  });

  it('falls back to disabled rule for null input', () => {
    expect(normalizeRecurrenceRule(null, '2026-07-14')).toEqual({
      version: 1,
      enabled: false,
    });
  });
});

describe('nextOccurrence', () => {
  it('returns null for disabled recurrence', () => {
    expect(nextOccurrence({ version: 1, enabled: false }, '2026-07-14')).toBeNull();
  });

  it('supports every 2 days', () => {
    const result = nextOccurrence(
      {
        version: 1,
        enabled: true,
        interval: 2,
        unit: 'day',
        startDate: '2026-07-14',
        end: { type: 'never' },
      },
      '2026-07-14',
    );
    expect(formatLocalDate(result!)).toBe('2026-07-16');
  });

  it('supports every 6 weeks', () => {
    const result = nextOccurrence(
      {
        version: 1,
        enabled: true,
        interval: 6,
        unit: 'week',
        startDate: '2026-07-14',
        daysOfWeek: [2],
        end: { type: 'never' },
      },
      '2026-07-14',
    );
    expect(formatLocalDate(result!)).toBe('2026-08-25');
  });

  it('supports weekly Monday and Friday within on-weeks', () => {
    const rule: ReminderRecurrence = {
      version: 1,
      enabled: true,
      interval: 1,
      unit: 'week',
      startDate: '2026-07-13',
      daysOfWeek: [1, 5],
      end: { type: 'never' },
    };
    expect(formatLocalDate(nextOccurrence(rule, '2026-07-13')!)).toBe('2026-07-17');
    expect(formatLocalDate(nextOccurrence(rule, '2026-07-17')!)).toBe('2026-07-20');
  });

  it('supports bi-weekly Monday and Friday by skipping off-weeks', () => {
    const rule: ReminderRecurrence = {
      version: 1,
      enabled: true,
      interval: 2,
      unit: 'week',
      startDate: '2026-07-13',
      daysOfWeek: [1, 5],
      end: { type: 'never' },
    };
    expect(formatLocalDate(nextOccurrence(rule, '2026-07-13')!)).toBe('2026-07-17');
    expect(formatLocalDate(nextOccurrence(rule, '2026-07-17')!)).toBe('2026-07-27');
  });

  it('clamps monthly day-of-month from 31st to shorter months without losing intended day', () => {
    const rule: ReminderRecurrence = {
      version: 1,
      enabled: true,
      interval: 1,
      unit: 'month',
      startDate: '2026-01-31',
      monthlyMode: 'dayOfMonth',
      dayOfMonth: 31,
      end: { type: 'never' },
    };
    expect(formatLocalDate(nextOccurrence(rule, '2026-01-31')!)).toBe('2026-02-28');
    expect(formatLocalDate(nextOccurrence(rule, '2026-02-28')!)).toBe('2026-03-31');
  });

  it('supports every 3 months', () => {
    const rule: ReminderRecurrence = {
      version: 1,
      enabled: true,
      interval: 3,
      unit: 'month',
      startDate: '2026-01-15',
      monthlyMode: 'dayOfMonth',
      dayOfMonth: 15,
      end: { type: 'never' },
    };
    expect(formatLocalDate(nextOccurrence(rule, '2026-01-15')!)).toBe('2026-04-15');
  });

  it('supports second Tuesday monthly', () => {
    const rule: ReminderRecurrence = {
      version: 1,
      enabled: true,
      interval: 1,
      unit: 'month',
      startDate: '2026-07-14',
      monthlyMode: 'weekday',
      weekOfMonth: 2,
      weekday: 2,
      end: { type: 'never' },
    };
    expect(formatLocalDate(nextOccurrence(rule, '2026-07-14')!)).toBe('2026-08-11');
  });

  it('supports last Friday monthly', () => {
    const rule: ReminderRecurrence = {
      version: 1,
      enabled: true,
      interval: 1,
      unit: 'month',
      startDate: '2026-07-31',
      monthlyMode: 'weekday',
      weekOfMonth: -1,
      weekday: 5,
      end: { type: 'never' },
    };
    expect(formatLocalDate(nextOccurrence(rule, '2026-07-31')!)).toBe('2026-08-28');
  });

  it('treats fifth weekday as last via -1 only, not weekOfMonth 5', () => {
    expect(() =>
      parseRecurrenceRule({
        version: 1,
        enabled: true,
        interval: 1,
        unit: 'month',
        startDate: '2026-07-31',
        monthlyMode: 'weekday',
        weekOfMonth: 5,
        weekday: 5,
        end: { type: 'never' },
      }),
    ).toThrow();
  });

  it('clamps Feb 29 yearly to Feb 28 on non-leap years', () => {
    const rule: ReminderRecurrence = {
      version: 1,
      enabled: true,
      interval: 1,
      unit: 'year',
      startDate: '2024-02-29',
      end: { type: 'never' },
    };
    expect(formatLocalDate(nextOccurrence(rule, '2024-02-29')!)).toBe('2025-02-28');
  });

  it('keeps Feb 29 when target year is leap', () => {
    const rule: ReminderRecurrence = {
      version: 1,
      enabled: true,
      interval: 4,
      unit: 'year',
      startDate: '2024-02-29',
      end: { type: 'never' },
    };
    expect(formatLocalDate(nextOccurrence(rule, '2024-02-29')!)).toBe('2028-02-29');
  });

  it('honors end date inclusively', () => {
    const rule: ReminderRecurrence = {
      version: 1,
      enabled: true,
      interval: 1,
      unit: 'month',
      startDate: '2026-01-15',
      monthlyMode: 'dayOfMonth',
      dayOfMonth: 15,
      end: { type: 'date', until: '2026-02-15' },
    };
    expect(formatLocalDate(nextOccurrence(rule, '2026-01-15')!)).toBe('2026-02-15');
    expect(nextOccurrence(rule, '2026-02-15')).toBeNull();
  });

  it('honors count-based endings', () => {
    const rule: ReminderRecurrence = {
      version: 1,
      enabled: true,
      interval: 1,
      unit: 'month',
      startDate: '2026-01-15',
      monthlyMode: 'dayOfMonth',
      dayOfMonth: 15,
      end: { type: 'count', occurrences: 2 },
    };
    expect(formatLocalDate(nextOccurrence(rule, '2026-01-15')!)).toBe('2026-02-15');
    expect(nextOccurrence(rule, '2026-02-15')).toBeNull();
  });
});

describe('summarizeRecurrence', () => {
  it('summarizes disabled recurrence', () => {
    expect(summarizeRecurrence({ version: 1, enabled: false }, '2026-07-14')).toBe(
      'Tidak Berulang',
    );
  });

  it('summarizes quick presets', () => {
    expect(
      summarizeRecurrence(
        {
          version: 1,
          enabled: true,
          interval: 1,
          unit: 'week',
          startDate: '2026-07-14',
          daysOfWeek: [2],
          end: { type: 'never' },
        },
        '2026-07-14',
      ),
    ).toBe('Setiap Minggu');
    expect(
      summarizeRecurrence(
        {
          version: 1,
          enabled: true,
          interval: 2,
          unit: 'week',
          startDate: '2026-07-14',
          daysOfWeek: [2],
          end: { type: 'never' },
        },
        '2026-07-14',
      ),
    ).toBe('Setiap 2 Minggu');
    expect(
      summarizeRecurrence(
        {
          version: 1,
          enabled: true,
          interval: 6,
          unit: 'month',
          startDate: '2026-07-14',
          monthlyMode: 'dayOfMonth',
          dayOfMonth: 14,
          end: { type: 'never' },
        },
        '2026-07-14',
      ),
    ).toBe('Setiap 6 Bulan');
    expect(
      summarizeRecurrence(
        {
          version: 1,
          enabled: true,
          interval: 2,
          unit: 'year',
          startDate: '2026-07-14',
          end: { type: 'never' },
        },
        '2026-07-14',
      ),
    ).toBe('Setiap 2 Tahun');
  });

  it('summarizes weekly multiple weekdays', () => {
    expect(
      summarizeRecurrence(
        {
          version: 1,
          enabled: true,
          interval: 2,
          unit: 'week',
          startDate: '2026-07-13',
          daysOfWeek: [1, 5],
          end: { type: 'never' },
        },
        '2026-07-13',
      ),
    ).toBe('Senin dan Jumat setiap 2 minggu');
  });

  it('summarizes monthly day of month', () => {
    expect(
      summarizeRecurrence(
        {
          version: 1,
          enabled: true,
          interval: 1,
          unit: 'month',
          startDate: '2026-07-15',
          monthlyMode: 'dayOfMonth',
          dayOfMonth: 15,
          end: { type: 'never' },
        },
        '2026-07-15',
      ),
    ).toBe('Tanggal 15 setiap bulan');
  });

  it('summarizes monthly weekday occurrence', () => {
    expect(
      summarizeRecurrence(
        {
          version: 1,
          enabled: true,
          interval: 1,
          unit: 'month',
          startDate: '2026-07-14',
          monthlyMode: 'weekday',
          weekOfMonth: 2,
          weekday: 2,
          end: { type: 'never' },
        },
        '2026-07-14',
      ),
    ).toBe('Selasa kedua setiap bulan');
    expect(
      summarizeRecurrence(
        {
          version: 1,
          enabled: true,
          interval: 1,
          unit: 'month',
          startDate: '2026-07-31',
          monthlyMode: 'weekday',
          weekOfMonth: -1,
          weekday: 5,
          end: { type: 'never' },
        },
        '2026-07-31',
      ),
    ).toBe('Jumat terakhir setiap bulan');
  });
});

describe('getOccurrenceIndex', () => {
  it('returns 0 for disabled recurrence', () => {
    expect(
      getOccurrenceIndex({ version: 1, enabled: false }, '2026-07-14'),
    ).toBe(0);
  });

  it('returns 1 for the start date', () => {
    expect(
      getOccurrenceIndex(
        {
          version: 1,
          enabled: true,
          interval: 1,
          unit: 'month',
          startDate: '2026-01-15',
          monthlyMode: 'dayOfMonth',
          dayOfMonth: 15,
          end: { type: 'never' },
        },
        '2026-01-15',
      ),
    ).toBe(1);
  });

  it('counts monthly intervals from the start date', () => {
    expect(
      getOccurrenceIndex(
        {
          version: 1,
          enabled: true,
          interval: 1,
          unit: 'month',
          startDate: '2026-01-15',
          monthlyMode: 'dayOfMonth',
          dayOfMonth: 15,
          end: { type: 'never' },
        },
        '2026-03-15',
      ),
    ).toBe(3);
  });
});
