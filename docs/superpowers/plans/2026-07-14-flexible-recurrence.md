# Flexible Reminder Recurrence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current `none/monthly/yearly` recurrence string with a flexible, versioned recurrence object, reusable recurrence engine, simple preset UX, custom recurrence modal, migration, and comprehensive recurrence tests.

**Architecture:** Keep the existing one-row-per-occurrence reminder chain and continue generating the next occurrence from `markAsPaid`. Add a pure `lib/recurrence/` module for types, validation, normalization, presets, next-date calculation, and Indonesian summaries. Store the new rule in `reminders.recurrence_rule jsonb` while keeping the old `recurrence text` column deprecated for rollback/compatibility.

**Tech Stack:** Expo / React Native, TypeScript, Supabase Postgres jsonb, date-fns, zod, Jest.

## Global Constraints

- Phase 1 only: no missed-reminder auto-advance sweep and no app foreground/reboot lifecycle sweep.
- No new dependency: use date-fns, do not add rrule.js or a bottom-sheet package.
- Keep one row per occurrence and `parent_reminder_id` chain.
- Generate next recurrence on `markAsPaid`, matching current behavior.
- Store recurrence as a versioned object with `version: 1` from day one.
- Keep deprecated `recurrence text` column; add `recurrence_rule jsonb`.
- Weekdays use JS/date-fns numbering: `0 = Sunday` through `6 = Saturday`.
- Monthly weekday mode uses `weekOfMonth: -1` for “last”.
- Yearly month/day is derived from the occurrence `due_date`, not stored separately.
- Invalid target month dates clamp to the target month’s last valid day using intended `dayOfMonth`.
- `end.type === 'count'` uses `startDate` and the recurrence sequence to decide whether a next row may be generated.
- Summary text is generated, never stored.
- Use centralized logging/error handling rules; do not add `console.log`.
- After implementation run: `npm test`, `npm run typecheck`; run `npm run lint` only if the script exists.

---

## File Structure

- Create `lib/recurrence/types.ts` — TypeScript types for versioned recurrence rules.
- Create `lib/recurrence/schema.ts` — zod validation schema and parser.
- Create `lib/recurrence/normalize.ts` — legacy string/object normalization and due-date defaults.
- Create `lib/recurrence/calc.ts` — pure next-occurrence engine.
- Create `lib/recurrence/summary.ts` — Indonesian human-readable summaries.
- Create `lib/recurrence/presets.ts` — quick preset builders from a due date.
- Create `lib/recurrence/index.ts` — public exports.
- Create `tests/lib/recurrence.test.ts` — comprehensive recurrence engine tests.
- Create `docs/recurrence-engine.md` — engine behavior and future extension notes.
- Create `supabase/migrations/00002_flexible_recurrence.sql` — add/backfill `recurrence_rule`.
- Modify `types/index.ts` — add `ReminderRecurrence`; add `recurrence_rule` to `Reminder`; keep old `recurrence` string deprecated.
- Modify `features/reminders/useReminders.ts` — write `recurrence_rule`; generate next row using recurrence engine.
- Modify `features/reminders/ReminderForm.tsx` — replace dropdown with recurrence summary card and custom modal integration.
- Create `features/reminders/RecurrenceEditorModal.tsx` — custom recurrence editor modal.
- Modify `app/(tabs)/(reminders)/[id]/edit.tsx` — write `recurrence_rule`, not just legacy string.
- Modify `app/(tabs)/(reminders)/[id].tsx` — display generated recurrence summary.
- Optionally modify `features/reminders/ReminderCard.tsx` only if design wants recurrence shown on cards; Phase 1 can leave cards unchanged.

---

### Task 1: Add Recurrence Types, Schema, Presets, and Normalization

**Files:**
- Create: `lib/recurrence/types.ts`
- Create: `lib/recurrence/schema.ts`
- Create: `lib/recurrence/normalize.ts`
- Create: `lib/recurrence/presets.ts`
- Create: `lib/recurrence/index.ts`
- Modify: `types/index.ts`
- Test: `tests/lib/recurrence.test.ts`

**Interfaces:**
- Produces: `ReminderRecurrence`, `RecurrenceUnit`, `MonthlyMode`, `RecurrenceEnd`, `parseRecurrenceRule`, `normalizeRecurrenceRule`, `buildRecurrencePreset`, `RECURRENCE_VERSION`.
- Consumes later: UI, migration fallback, `markAsPaid`, summaries, calc engine.

- [ ] **Step 1: Write failing normalization/schema tests**

Add this initial block to `tests/lib/recurrence.test.ts`:

```ts
import {
  buildRecurrencePreset,
  normalizeRecurrenceRule,
  parseRecurrenceRule,
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
    expect(() => parseRecurrenceRule({
      version: 1,
      enabled: true,
      interval: 0,
      unit: 'week',
      startDate: '2026-07-14',
      end: { type: 'never' },
    })).toThrow();
  });

  it('falls back to disabled rule for corrupt input', () => {
    expect(normalizeRecurrenceRule({ version: 99, enabled: true }, '2026-07-14')).toEqual({
      version: 1,
      enabled: false,
    });
  });
});
```

- [ ] **Step 2: Run the new test and verify it fails**

Run:

```bash
npm test -- tests/lib/recurrence.test.ts
```

Expected: fail because `lib/recurrence` does not exist.

- [ ] **Step 3: Add recurrence TypeScript types**

Create `lib/recurrence/types.ts`:

```ts
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
```

- [ ] **Step 4: Add zod schema**

Create `lib/recurrence/schema.ts`:

```ts
import { z } from 'zod';
import { RECURRENCE_VERSION, ReminderRecurrence } from './types';

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const recurrenceEndSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('never') }),
  z.object({ type: z.literal('date'), until: dateString }),
  z.object({ type: z.literal('count'), occurrences: z.number().int().min(1) }),
]);

const disabledSchema = z.object({
  version: z.literal(RECURRENCE_VERSION),
  enabled: z.literal(false),
});

const enabledSchema = z.object({
  version: z.literal(RECURRENCE_VERSION),
  enabled: z.literal(true),
  interval: z.number().int().min(1),
  unit: z.enum(['day', 'week', 'month', 'year']),
  startDate: dateString,
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  monthlyMode: z.enum(['dayOfMonth', 'weekday']).optional(),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
  weekOfMonth: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(-1)]).optional(),
  weekday: z.number().int().min(0).max(6).optional(),
  end: recurrenceEndSchema,
}).superRefine((rule, ctx) => {
  if (rule.unit === 'month') {
    if (!rule.monthlyMode) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['monthlyMode'], message: 'monthlyMode is required for monthly recurrence' });
    }
    if (rule.monthlyMode === 'dayOfMonth' && !rule.dayOfMonth) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['dayOfMonth'], message: 'dayOfMonth is required' });
    }
    if (rule.monthlyMode === 'weekday' && (rule.weekOfMonth == null || rule.weekday == null)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['weekOfMonth'], message: 'weekOfMonth and weekday are required' });
    }
  }
});

export const reminderRecurrenceSchema = z.discriminatedUnion('enabled', [disabledSchema, enabledSchema]);

export function parseRecurrenceRule(value: unknown): ReminderRecurrence {
  return reminderRecurrenceSchema.parse(value);
}
```

- [ ] **Step 5: Add presets and normalization**

Create `lib/recurrence/presets.ts`:

```ts
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
```

Create `lib/recurrence/normalize.ts`:

```ts
import { parse, isValid, format } from 'date-fns';
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
```

Create `lib/recurrence/index.ts`:

```ts
export * from './types';
export * from './schema';
export * from './normalize';
export * from './presets';
```

- [ ] **Step 6: Update shared Reminder type**

Modify `types/index.ts`:

```ts
import { ReminderRecurrence } from '@/lib/recurrence';

export type Reminder = {
  id: string;
  user_id: string;
  asset_id: string | null;
  title: string;
  category: string;
  due_date: string;
  /** @deprecated Use recurrence_rule. Kept for rollback and legacy migration only. */
  recurrence: string;
  recurrence_rule: ReminderRecurrence | null;
  amount: number | null;
  notes: string | null;
  remind_before_days: number[];
  status: string;
  priority: Priority;
  paid_at: string | null;
  parent_reminder_id: string | null;
  created_at: string;
  updated_at: string;
};
```

Keep the existing `RecurrenceType = 'none' | 'monthly' | 'yearly'` export for compatibility, but add a deprecation comment.

- [ ] **Step 7: Run tests**

Run:

```bash
npm test -- tests/lib/recurrence.test.ts
npm run typecheck
```

Expected: recurrence test passes; typecheck may expose files that assume `recurrence_rule` missing in test fixtures. Fix fixtures by adding `recurrence_rule: { version: 1, enabled: false }`.

---

### Task 2: Implement Recurrence Calculation Engine With Comprehensive Tests

**Files:**
- Create: `lib/recurrence/calc.ts`
- Modify: `lib/recurrence/index.ts`
- Modify: `tests/lib/recurrence.test.ts`

**Interfaces:**
- Consumes: `ReminderRecurrence`, `parseLocalDate`, `formatLocalDate`.
- Produces: `nextOccurrence(rule: ReminderRecurrence, fromDate: string | Date): Date | null` and `getOccurrenceIndex(rule, date): number`.

- [ ] **Step 1: Add failing recurrence calculation tests**

Append to `tests/lib/recurrence.test.ts`:

```ts
import { nextOccurrence } from '../../lib/recurrence';

describe('nextOccurrence', () => {
  it('returns null for disabled recurrence', () => {
    expect(nextOccurrence({ version: 1, enabled: false }, '2026-07-14')).toBeNull();
  });

  it('supports every 2 days', () => {
    expect(nextOccurrence({ version: 1, enabled: true, interval: 2, unit: 'day', startDate: '2026-07-14', end: { type: 'never' } }, '2026-07-14')?.toISOString().slice(0, 10)).toBe('2026-07-16');
  });

  it('supports every 6 weeks', () => {
    expect(nextOccurrence({ version: 1, enabled: true, interval: 6, unit: 'week', startDate: '2026-07-14', daysOfWeek: [2], end: { type: 'never' } }, '2026-07-14')?.toISOString().slice(0, 10)).toBe('2026-08-25');
  });

  it('supports weekly Monday and Friday within on-weeks', () => {
    const rule = { version: 1 as const, enabled: true as const, interval: 1, unit: 'week' as const, startDate: '2026-07-13', daysOfWeek: [1, 5], end: { type: 'never' as const } };
    expect(nextOccurrence(rule, '2026-07-13')?.toISOString().slice(0, 10)).toBe('2026-07-17');
    expect(nextOccurrence(rule, '2026-07-17')?.toISOString().slice(0, 10)).toBe('2026-07-20');
  });

  it('supports bi-weekly Monday and Friday by skipping off-weeks', () => {
    const rule = { version: 1 as const, enabled: true as const, interval: 2, unit: 'week' as const, startDate: '2026-07-13', daysOfWeek: [1, 5], end: { type: 'never' as const } };
    expect(nextOccurrence(rule, '2026-07-13')?.toISOString().slice(0, 10)).toBe('2026-07-17');
    expect(nextOccurrence(rule, '2026-07-17')?.toISOString().slice(0, 10)).toBe('2026-07-27');
  });

  it('clamps monthly day-of-month from 31st to shorter months without losing intended day', () => {
    const rule = { version: 1 as const, enabled: true as const, interval: 1, unit: 'month' as const, startDate: '2026-01-31', monthlyMode: 'dayOfMonth' as const, dayOfMonth: 31, end: { type: 'never' as const } };
    expect(nextOccurrence(rule, '2026-01-31')?.toISOString().slice(0, 10)).toBe('2026-02-28');
    expect(nextOccurrence(rule, '2026-02-28')?.toISOString().slice(0, 10)).toBe('2026-03-31');
  });

  it('supports every 3 months', () => {
    const rule = { version: 1 as const, enabled: true as const, interval: 3, unit: 'month' as const, startDate: '2026-01-15', monthlyMode: 'dayOfMonth' as const, dayOfMonth: 15, end: { type: 'never' as const } };
    expect(nextOccurrence(rule, '2026-01-15')?.toISOString().slice(0, 10)).toBe('2026-04-15');
  });

  it('supports second Tuesday monthly', () => {
    const rule = { version: 1 as const, enabled: true as const, interval: 1, unit: 'month' as const, startDate: '2026-07-14', monthlyMode: 'weekday' as const, weekOfMonth: 2 as const, weekday: 2, end: { type: 'never' as const } };
    expect(nextOccurrence(rule, '2026-07-14')?.toISOString().slice(0, 10)).toBe('2026-08-11');
  });

  it('supports last Friday monthly', () => {
    const rule = { version: 1 as const, enabled: true as const, interval: 1, unit: 'month' as const, startDate: '2026-07-31', monthlyMode: 'weekday' as const, weekOfMonth: -1 as const, weekday: 5, end: { type: 'never' as const } };
    expect(nextOccurrence(rule, '2026-07-31')?.toISOString().slice(0, 10)).toBe('2026-08-28');
  });

  it('treats fifth weekday as last via -1 only, not weekOfMonth 5', () => {
    expect(() => parseRecurrenceRule({ version: 1, enabled: true, interval: 1, unit: 'month', startDate: '2026-07-31', monthlyMode: 'weekday', weekOfMonth: 5, weekday: 5, end: { type: 'never' } })).toThrow();
  });

  it('clamps Feb 29 yearly to Feb 28 on non-leap years', () => {
    const rule = { version: 1 as const, enabled: true as const, interval: 1, unit: 'year' as const, startDate: '2024-02-29', end: { type: 'never' as const } };
    expect(nextOccurrence(rule, '2024-02-29')?.toISOString().slice(0, 10)).toBe('2025-02-28');
  });

  it('keeps Feb 29 when target year is leap', () => {
    const rule = { version: 1 as const, enabled: true as const, interval: 4, unit: 'year' as const, startDate: '2024-02-29', end: { type: 'never' as const } };
    expect(nextOccurrence(rule, '2024-02-29')?.toISOString().slice(0, 10)).toBe('2028-02-29');
  });

  it('honors end date inclusively', () => {
    const rule = { version: 1 as const, enabled: true as const, interval: 1, unit: 'month' as const, startDate: '2026-01-15', monthlyMode: 'dayOfMonth' as const, dayOfMonth: 15, end: { type: 'date' as const, until: '2026-02-15' } };
    expect(nextOccurrence(rule, '2026-01-15')?.toISOString().slice(0, 10)).toBe('2026-02-15');
    expect(nextOccurrence(rule, '2026-02-15')).toBeNull();
  });

  it('honors count-based endings', () => {
    const rule = { version: 1 as const, enabled: true as const, interval: 1, unit: 'month' as const, startDate: '2026-01-15', monthlyMode: 'dayOfMonth' as const, dayOfMonth: 15, end: { type: 'count' as const, occurrences: 2 } };
    expect(nextOccurrence(rule, '2026-01-15')?.toISOString().slice(0, 10)).toBe('2026-02-15');
    expect(nextOccurrence(rule, '2026-02-15')).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
npm test -- tests/lib/recurrence.test.ts
```

Expected: fail because `nextOccurrence` is missing.

- [ ] **Step 3: Implement calculation engine**

Create `lib/recurrence/calc.ts`:

```ts
import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
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
import { ReminderRecurrence } from './types';
import { formatLocalDate, parseLocalDate } from './normalize';

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

function nextWeekly(rule: Extract<ReminderRecurrence, { enabled: true }>, from: Date): Date {
  const weekdays = (rule.daysOfWeek?.length ? rule.daysOfWeek : [getDay(parseLocalDate(rule.startDate))])
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

function nextMonthly(rule: Extract<ReminderRecurrence, { enabled: true }>, from: Date): Date {
  if (rule.monthlyMode === 'weekday') {
    const base = addMonths(new Date(from.getFullYear(), from.getMonth(), 1), rule.interval);
    return nthWeekdayOfMonth(base.getFullYear(), base.getMonth(), rule.weekday!, rule.weekOfMonth!);
  }

  const day = rule.dayOfMonth ?? parseLocalDate(rule.startDate).getDate();
  return addMonthsUsingRuleDay(from, rule.interval, day);
}

function rawNextOccurrence(rule: Extract<ReminderRecurrence, { enabled: true }>, from: Date): Date {
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

function occurrenceIndex(rule: Extract<ReminderRecurrence, { enabled: true }>, date: Date): number {
  const start = parseLocalDate(rule.startDate);
  if (formatLocalDate(date) === rule.startDate) return 1;

  if (rule.unit === 'day') return Math.floor((date.getTime() - start.getTime()) / 86400000 / rule.interval) + 1;
  if (rule.unit === 'week') return Math.floor(differenceInCalendarWeeks(date, start, { weekStartsOn: 0 }) / rule.interval) + 1;
  if (rule.unit === 'month') return Math.floor(differenceInCalendarMonths(date, start) / rule.interval) + 1;
  return Math.floor(differenceInCalendarYears(date, start) / rule.interval) + 1;
}

function violatesEnd(rule: Extract<ReminderRecurrence, { enabled: true }>, candidate: Date): boolean {
  if (rule.end.type === 'never') return false;
  if (rule.end.type === 'date') return isAfter(candidate, parseLocalDate(rule.end.until));
  return occurrenceIndex(rule, candidate) > rule.end.occurrences;
}

export function nextOccurrence(rule: ReminderRecurrence, fromDate: string | Date): Date | null {
  if (!rule.enabled) return null;

  const from = asDate(fromDate);
  const start = parseLocalDate(rule.startDate);
  if (isBefore(from, start)) return violatesEnd(rule, start) ? null : start;

  const candidate = rawNextOccurrence(rule, from);
  return violatesEnd(rule, candidate) ? null : candidate;
}

export function getOccurrenceIndex(rule: ReminderRecurrence, date: string | Date): number {
  if (!rule.enabled) return 0;
  return occurrenceIndex(rule, asDate(date));
}
```

Add export to `lib/recurrence/index.ts`:

```ts
export * from './calc';
```

- [ ] **Step 4: Run recurrence tests**

Run:

```bash
npm test -- tests/lib/recurrence.test.ts
```

Expected: all recurrence tests pass. If timezone causes `toISOString().slice(0, 10)` failures locally, change tests to compare `formatLocalDate(nextOccurrence(...)!)` instead and import `formatLocalDate`.

---

### Task 3: Add Indonesian Summary Generation

**Files:**
- Create: `lib/recurrence/summary.ts`
- Modify: `lib/recurrence/index.ts`
- Modify: `tests/lib/recurrence.test.ts`

**Interfaces:**
- Produces: `summarizeRecurrence(rule: ReminderRecurrence, dueDate: string): string`.
- Consumes: UI detail/form summary card.

- [ ] **Step 1: Add failing summary tests**

Append to `tests/lib/recurrence.test.ts`:

```ts
import { summarizeRecurrence } from '../../lib/recurrence';

describe('summarizeRecurrence', () => {
  it('summarizes disabled recurrence', () => {
    expect(summarizeRecurrence({ version: 1, enabled: false }, '2026-07-14')).toBe('Tidak Berulang');
  });

  it('summarizes quick presets', () => {
    expect(summarizeRecurrence({ version: 1, enabled: true, interval: 1, unit: 'week', startDate: '2026-07-14', daysOfWeek: [2], end: { type: 'never' } }, '2026-07-14')).toBe('Setiap Minggu');
    expect(summarizeRecurrence({ version: 1, enabled: true, interval: 2, unit: 'week', startDate: '2026-07-14', daysOfWeek: [2], end: { type: 'never' } }, '2026-07-14')).toBe('Setiap 2 Minggu');
    expect(summarizeRecurrence({ version: 1, enabled: true, interval: 6, unit: 'month', startDate: '2026-07-14', monthlyMode: 'dayOfMonth', dayOfMonth: 14, end: { type: 'never' } }, '2026-07-14')).toBe('Setiap 6 Bulan');
    expect(summarizeRecurrence({ version: 1, enabled: true, interval: 2, unit: 'year', startDate: '2026-07-14', end: { type: 'never' } }, '2026-07-14')).toBe('Setiap 2 Tahun');
  });

  it('summarizes weekly multiple weekdays', () => {
    expect(summarizeRecurrence({ version: 1, enabled: true, interval: 2, unit: 'week', startDate: '2026-07-13', daysOfWeek: [1, 5], end: { type: 'never' } }, '2026-07-13')).toBe('Senin dan Jumat setiap 2 minggu');
  });

  it('summarizes monthly day of month', () => {
    expect(summarizeRecurrence({ version: 1, enabled: true, interval: 1, unit: 'month', startDate: '2026-07-15', monthlyMode: 'dayOfMonth', dayOfMonth: 15, end: { type: 'never' } }, '2026-07-15')).toBe('Tanggal 15 setiap bulan');
  });

  it('summarizes monthly weekday occurrence', () => {
    expect(summarizeRecurrence({ version: 1, enabled: true, interval: 1, unit: 'month', startDate: '2026-07-14', monthlyMode: 'weekday', weekOfMonth: 2, weekday: 2, end: { type: 'never' } }, '2026-07-14')).toBe('Selasa kedua setiap bulan');
    expect(summarizeRecurrence({ version: 1, enabled: true, interval: 1, unit: 'month', startDate: '2026-07-31', monthlyMode: 'weekday', weekOfMonth: -1, weekday: 5, end: { type: 'never' } }, '2026-07-31')).toBe('Jumat terakhir setiap bulan');
  });
});
```

- [ ] **Step 2: Run summary tests and verify failure**

Run:

```bash
npm test -- tests/lib/recurrence.test.ts
```

Expected: fail because `summarizeRecurrence` is missing.

- [ ] **Step 3: Implement summary generation**

Create `lib/recurrence/summary.ts`:

```ts
import { getDay } from 'date-fns';
import { ReminderRecurrence } from './types';
import { parseLocalDate } from './normalize';

const WEEKDAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const ORDINALS: Record<number, string> = { 1: 'pertama', 2: 'kedua', 3: 'ketiga', 4: 'keempat', [-1]: 'terakhir' };
const UNITS = { day: 'Hari', week: 'Minggu', month: 'Bulan', year: 'Tahun' } as const;

function joinIndonesian(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} dan ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, dan ${items[items.length - 1]}`;
}

function everyUnit(rule: Extract<ReminderRecurrence, { enabled: true }>): string {
  return rule.interval === 1 ? `Setiap ${UNITS[rule.unit]}` : `Setiap ${rule.interval} ${UNITS[rule.unit]}`;
}

export function summarizeRecurrence(rule: ReminderRecurrence, dueDate: string): string {
  if (!rule.enabled) return 'Tidak Berulang';

  if (rule.unit === 'week' && rule.daysOfWeek && rule.daysOfWeek.length > 1) {
    const days = joinIndonesian(rule.daysOfWeek.slice().sort((a, b) => a - b).map((day) => WEEKDAYS[day]));
    return rule.interval === 1
      ? `${days} setiap minggu`
      : `${days} setiap ${rule.interval} minggu`;
  }

  if (rule.unit === 'month') {
    if (rule.monthlyMode === 'dayOfMonth') {
      if (rule.interval === 1) return `Tanggal ${rule.dayOfMonth} setiap bulan`;
      return `Tanggal ${rule.dayOfMonth} setiap ${rule.interval} bulan`;
    }

    if (rule.monthlyMode === 'weekday') {
      const weekday = WEEKDAYS[rule.weekday ?? getDay(parseLocalDate(dueDate))];
      const ordinal = ORDINALS[rule.weekOfMonth ?? 1];
      if (rule.interval === 1) return `${weekday} ${ordinal} setiap bulan`;
      return `${weekday} ${ordinal} setiap ${rule.interval} bulan`;
    }
  }

  return everyUnit(rule);
}
```

Add export to `lib/recurrence/index.ts`:

```ts
export * from './summary';
```

- [ ] **Step 4: Run tests**

Run:

```bash
npm test -- tests/lib/recurrence.test.ts
npm run typecheck
```

Expected: recurrence tests pass; typecheck passes or only exposes fixture updates from Task 1.

---

### Task 4: Add Supabase Migration for `recurrence_rule jsonb`

**Files:**
- Create: `supabase/migrations/00002_flexible_recurrence.sql`

**Interfaces:**
- Produces DB column `public.reminders.recurrence_rule jsonb not null`.
- Keeps `public.reminders.recurrence text` deprecated.

- [ ] **Step 1: Create migration**

Create `supabase/migrations/00002_flexible_recurrence.sql`:

```sql
-- Flexible recurrence rules. Keep legacy recurrence text for rollback/compatibility.

alter table public.reminders
  add column if not exists recurrence_rule jsonb;

update public.reminders
set recurrence_rule = case
  when recurrence = 'monthly' then jsonb_build_object(
    'version', 1,
    'enabled', true,
    'interval', 1,
    'unit', 'month',
    'startDate', to_char(due_date, 'YYYY-MM-DD'),
    'monthlyMode', 'dayOfMonth',
    'dayOfMonth', extract(day from due_date)::int,
    'end', jsonb_build_object('type', 'never')
  )
  when recurrence = 'yearly' then jsonb_build_object(
    'version', 1,
    'enabled', true,
    'interval', 1,
    'unit', 'year',
    'startDate', to_char(due_date, 'YYYY-MM-DD'),
    'end', jsonb_build_object('type', 'never')
  )
  else jsonb_build_object(
    'version', 1,
    'enabled', false
  )
end
where recurrence_rule is null;

alter table public.reminders
  alter column recurrence_rule set default jsonb_build_object('version', 1, 'enabled', false),
  alter column recurrence_rule set not null;

alter table public.reminders
  add constraint reminders_recurrence_rule_is_object
  check (jsonb_typeof(recurrence_rule) = 'object');

comment on column public.reminders.recurrence is
  'Deprecated legacy recurrence string. Use recurrence_rule jsonb.';

comment on column public.reminders.recurrence_rule is
  'Versioned flexible reminder recurrence rule. Version 1 is validated in application code.';
```

- [ ] **Step 2: Verify migration syntax locally if Supabase CLI is available**

Run:

```bash
command -v supabase >/dev/null && supabase db reset --local || echo "Supabase CLI not available; migration syntax not locally verified"
```

Expected: either local reset succeeds, or command prints that Supabase CLI is unavailable. Do not invent another migration command.

---

### Task 5: Update Reminder Creation, Editing, and Next-Occurrence Generation

**Files:**
- Modify: `features/reminders/useReminders.ts`
- Modify: `app/(tabs)/(reminders)/[id]/edit.tsx`
- Modify: `tests/lib/reminder-engine.test.ts` fixture if typecheck needs `recurrence_rule`

**Interfaces:**
- Consumes: `normalizeRecurrenceRule`, `nextOccurrence`, `formatLocalDate`, `ReminderRecurrence`.
- Produces: DB writes include `recurrence_rule`; `markAsPaid` creates next occurrence using the new engine.

- [ ] **Step 1: Modify `useReminders.ts` imports**

Replace:

```ts
import { addMonths, addYears, format } from 'date-fns';
```

With:

```ts
import { formatLocalDate, nextOccurrence, normalizeRecurrenceRule } from '@/lib/recurrence';
```

- [ ] **Step 2: Write `recurrence_rule` on create**

In `createReminder`, before the insert, add:

```ts
const recurrenceRule = normalizeRecurrenceRule(
  reminder.recurrence_rule ?? reminder.recurrence ?? 'none',
  reminder.due_date,
);
```

In the insert payload, keep legacy `recurrence` for compatibility but add `recurrence_rule`:

```ts
recurrence: recurrenceRule.enabled
  ? recurrenceRule.unit === 'month' ? 'monthly' : recurrenceRule.unit === 'year' ? 'yearly' : 'custom'
  : 'none',
recurrence_rule: recurrenceRule,
```

If TypeScript complains because `Reminder.recurrence` legacy type did not include `custom`, widen `RecurrenceType` in `types/index.ts` to:

```ts
/** @deprecated Use ReminderRecurrence. */
export type RecurrenceType = 'none' | 'monthly' | 'yearly' | 'custom';
```

- [ ] **Step 3: Replace markAsPaid recurrence block**

Replace the current block starting with:

```ts
// ponytail: create next recurrence if monthly/yearly
if (reminder.recurrence === 'monthly' || reminder.recurrence === 'yearly') {
```

With:

```ts
const recurrenceRule = normalizeRecurrenceRule(
  reminder.recurrence_rule ?? reminder.recurrence,
  reminder.due_date,
);
const nextDueDate = nextOccurrence(recurrenceRule, reminder.due_date);

if (nextDueDate) {
  const { data: newReminder } = await safeQuerySingle<Reminder>(
    () => supabase
      .from('reminders')
      .insert({
        user_id: reminder.user_id,
        title: reminder.title,
        category: reminder.category,
        due_date: formatLocalDate(nextDueDate),
        recurrence: recurrenceRule.enabled
          ? recurrenceRule.unit === 'month' ? 'monthly' : recurrenceRule.unit === 'year' ? 'yearly' : 'custom'
          : 'none',
        recurrence_rule: recurrenceRule,
        amount: reminder.amount,
        notes: reminder.notes,
        remind_before_days: reminder.remind_before_days,
        asset_id: reminder.asset_id,
        parent_reminder_id: reminder.id,
        priority: reminder.priority || 'normal',
        status: 'pending',
      })
      .select()
      .single(),
    'markAsPaid:next',
  );

  if (newReminder) {
    const prefs = user ? await getOrCreateNotificationPreferences(user.id) : null;
    if (prefs) {
      await notificationService.scheduleReminder(newReminder, prefs);
    }
  }
}
```

- [ ] **Step 4: Update edit screen DB write**

In `app/(tabs)/(reminders)/[id]/edit.tsx`, import:

```ts
import { normalizeRecurrenceRule } from '@/lib/recurrence';
```

Before the update call in `handleSubmit`, add:

```ts
const recurrenceRule = normalizeRecurrenceRule(
  formData.recurrence_rule ?? formData.recurrence ?? 'none',
  formData.due_date,
);
```

In the update payload, replace `recurrence: formData.recurrence,` with:

```ts
recurrence: recurrenceRule.enabled
  ? recurrenceRule.unit === 'month' ? 'monthly' : recurrenceRule.unit === 'year' ? 'yearly' : 'custom'
  : 'none',
recurrence_rule: recurrenceRule,
```

When building `fullReminder`, include:

```ts
const fullReminder = {
  ...reminder!,
  ...formData,
  recurrence_rule: recurrenceRule,
  recurrence: recurrenceRule.enabled
    ? recurrenceRule.unit === 'month' ? 'monthly' : recurrenceRule.unit === 'year' ? 'yearly' : 'custom'
    : 'none',
  priority: formData.priority || 'normal',
};
```

- [ ] **Step 5: Run validation**

Run:

```bash
npm test -- tests/lib/recurrence.test.ts tests/lib/reminder-engine.test.ts
npm run typecheck
```

Expected: tests pass; typecheck passes after fixture/type updates.

---

### Task 6: Build Recurrence Summary Card and Custom Editor Modal

**Files:**
- Modify: `features/reminders/ReminderForm.tsx`
- Create: `features/reminders/RecurrenceEditorModal.tsx`

**Interfaces:**
- Consumes: `ReminderRecurrence`, `buildRecurrencePreset`, `normalizeRecurrenceRule`, `summarizeRecurrence`.
- Produces: form submits `recurrence_rule` object and legacy `recurrence` compatibility string.

- [ ] **Step 1: Update form schema and defaults**

In `ReminderForm.tsx`, import:

```ts
import { Ionicons } from '@expo/vector-icons';
import {
  buildRecurrencePreset,
  normalizeRecurrenceRule,
  ReminderRecurrence,
  summarizeRecurrence,
} from '@/lib/recurrence';
import RecurrenceEditorModal from './RecurrenceEditorModal';
```

Change schema field:

```ts
recurrence_rule: z.any(),
```

Remove the old `RECURRENCE_OPTIONS` constant.

Inside `useForm` defaults, set:

```ts
recurrence_rule: normalizeRecurrenceRule(
  defaultValues?.recurrence_rule ?? defaultValues?.recurrence ?? 'none',
  defaultValues?.due_date || new Date().toISOString().split('T')[0],
),
```

Add watches:

```ts
const dueDate = watch('due_date');
const recurrenceRule = watch('recurrence_rule') as ReminderRecurrence;
const [showRecurrenceEditor, setShowRecurrenceEditor] = useState(false);
```

- [ ] **Step 2: Replace recurrence Select with summary card and presets**

Replace the old `Controller name="recurrence"` block with:

```tsx
<Controller
  control={control}
  name="recurrence_rule"
  render={({ field: { onChange, value } }) => {
    const dueDateString = dueDate.toISOString().split('T')[0];
    const rule = normalizeRecurrenceRule(value, dueDateString);
    const presets = [
      { label: 'Tidak Berulang', value: 'none' as const },
      { label: 'Setiap Minggu', value: 'weekly' as const },
      { label: 'Setiap Bulan', value: 'monthly' as const },
      { label: 'Setiap Tahun', value: 'yearly' as const },
    ];

    return (
      <View style={styles.field}>
        <Text style={styles.label}>Pengulangan</Text>
        <TouchableOpacity
          style={styles.recurrenceCard}
          onPress={() => setShowRecurrenceEditor(true)}
          activeOpacity={0.7}
        >
          <View style={styles.recurrenceCardText}>
            <Text style={styles.recurrenceSummary}>{summarizeRecurrence(rule, dueDateString)}</Text>
            <Text style={styles.recurrenceHelper}>Pilih cepat atau atur kustom</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.onSurfaceVariant} />
        </TouchableOpacity>

        <View style={styles.presetRow}>
          {presets.map((preset) => (
            <Pressable
              key={preset.value}
              style={styles.presetChip}
              onPress={() => onChange(buildRecurrencePreset(preset.value, dueDateString))}
            >
              <Text style={styles.presetChipText}>{preset.label}</Text>
            </Pressable>
          ))}
          <Pressable style={styles.presetChip} onPress={() => setShowRecurrenceEditor(true)}>
            <Text style={styles.presetChipText}>Kustom...</Text>
          </Pressable>
        </View>

        <RecurrenceEditorModal
          visible={showRecurrenceEditor}
          dueDate={dueDateString}
          value={rule}
          onClose={() => setShowRecurrenceEditor(false)}
          onSave={(nextRule) => {
            onChange(nextRule);
            setShowRecurrenceEditor(false);
          }}
        />
      </View>
    );
  }}
/>
```

- [ ] **Step 3: Update submit payload**

In `handleFormSubmit`, compute due date once:

```ts
const dueDateString = data.due_date.toISOString().split('T')[0];
const recurrenceRule = normalizeRecurrenceRule(data.recurrence_rule, dueDateString);
```

Submit:

```ts
onSubmit({
  ...data,
  amount: data.amount ? parseFloat(data.amount) : null,
  due_date: dueDateString,
  recurrence_rule: recurrenceRule,
  recurrence: recurrenceRule.enabled
    ? recurrenceRule.unit === 'month' ? 'monthly' : recurrenceRule.unit === 'year' ? 'yearly' : 'custom'
    : 'none',
  asset_id: data.asset_id || null,
});
```

- [ ] **Step 4: Add modal component**

Create `features/reminders/RecurrenceEditorModal.tsx` with minimal controls:

```tsx
import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import { COLORS, RADII, SPACING, TYPOGRAPHY } from '@/lib/theme';
import { buildRecurrencePreset, ReminderRecurrence, summarizeRecurrence } from '@/lib/recurrence';

const UNITS = [
  { label: 'Hari', value: 'day' },
  { label: 'Minggu', value: 'week' },
  { label: 'Bulan', value: 'month' },
  { label: 'Tahun', value: 'year' },
];

const WEEKDAYS = [
  { label: 'Min', value: 0 },
  { label: 'Sen', value: 1 },
  { label: 'Sel', value: 2 },
  { label: 'Rab', value: 3 },
  { label: 'Kam', value: 4 },
  { label: 'Jum', value: 5 },
  { label: 'Sab', value: 6 },
];

const MONTHLY_MODES = [
  { label: 'Tanggal yang sama', value: 'dayOfMonth' },
  { label: 'Hari dalam minggu yang sama', value: 'weekday' },
];

interface Props {
  visible: boolean;
  dueDate: string;
  value: ReminderRecurrence;
  onClose: () => void;
  onSave: (value: ReminderRecurrence) => void;
}

export default function RecurrenceEditorModal({ visible, dueDate, value, onClose, onSave }: Props) {
  const initial = value.enabled ? value : buildRecurrencePreset('weekly', dueDate);
  const [draft, setDraft] = useState<ReminderRecurrence>(initial);
  const enabledDraft = draft.enabled ? draft : buildRecurrencePreset('weekly', dueDate);

  const dayOfMonth = useMemo(() => Number(dueDate.slice(8, 10)), [dueDate]);

  const update = (patch: Partial<Extract<ReminderRecurrence, { enabled: true }>>) => {
    if (!enabledDraft.enabled) return;
    setDraft({ ...enabledDraft, ...patch });
  };

  const toggleWeekday = (weekday: number) => {
    if (!enabledDraft.enabled) return;
    const current = enabledDraft.daysOfWeek || [];
    const next = current.includes(weekday)
      ? current.filter((day) => day !== weekday)
      : [...current, weekday].sort((a, b) => a - b);
    update({ daysOfWeek: next.length ? next : undefined });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Pengulangan Kustom</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.onSurface} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.label}>Ulangi setiap</Text>
            <View style={styles.intervalRow}>
              <Pressable style={styles.stepperButton} onPress={() => update({ interval: Math.max(1, enabledDraft.interval - 1) })}>
                <Text style={styles.stepperText}>-</Text>
              </Pressable>
              <Text style={styles.intervalValue}>{enabledDraft.interval}</Text>
              <Pressable style={styles.stepperButton} onPress={() => update({ interval: enabledDraft.interval + 1 })}>
                <Text style={styles.stepperText}>+</Text>
              </Pressable>
            </View>

            <Select
              label="Satuan"
              value={enabledDraft.unit}
              options={UNITS}
              onSelect={(unit) => update({
                unit: unit as any,
                monthlyMode: unit === 'month' ? 'dayOfMonth' : undefined,
                dayOfMonth: unit === 'month' ? dayOfMonth : undefined,
              })}
            />

            {enabledDraft.unit === 'week' && (
              <View style={styles.section}>
                <Text style={styles.label}>Hari</Text>
                <Text style={styles.helper}>Jika kosong, memakai hari dari tanggal jatuh tempo.</Text>
                <View style={styles.weekdayRow}>
                  {WEEKDAYS.map((day) => {
                    const selected = (enabledDraft.daysOfWeek || []).includes(day.value);
                    return (
                      <Pressable key={day.value} style={[styles.weekdayChip, selected && styles.chipSelected]} onPress={() => toggleWeekday(day.value)}>
                        <Text style={[styles.weekdayText, selected && styles.chipTextSelected]}>{day.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {enabledDraft.unit === 'month' && (
              <Select
                label="Pengaturan bulanan"
                value={enabledDraft.monthlyMode || 'dayOfMonth'}
                options={MONTHLY_MODES}
                onSelect={(monthlyMode) => update({
                  monthlyMode: monthlyMode as any,
                  dayOfMonth: monthlyMode === 'dayOfMonth' ? dayOfMonth : undefined,
                  weekOfMonth: monthlyMode === 'weekday' ? 1 : undefined,
                  weekday: monthlyMode === 'weekday' ? new Date(dueDate + 'T00:00:00').getDay() : undefined,
                })}
              />
            )}

            <View style={styles.preview}>
              <Text style={styles.label}>Pratinjau</Text>
              <Text style={styles.previewText}>{summarizeRecurrence(enabledDraft, dueDate)}</Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Button title="Simpan" onPress={() => onSave(enabledDraft)} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: RADII.xl, borderTopRightRadius: RADII.xl, maxHeight: '90%' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.outline },
  title: { ...TYPOGRAPHY.title, color: COLORS.onSurface },
  closeButton: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  content: { padding: SPACING.lg },
  label: { ...TYPOGRAPHY.label, color: COLORS.onSurfaceVariant, marginBottom: SPACING.xs },
  helper: { ...TYPOGRAPHY.body, color: COLORS.onSurfaceVariant, marginBottom: SPACING.sm },
  intervalRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.lg },
  stepperButton: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: COLORS.outline, alignItems: 'center', justifyContent: 'center' },
  stepperText: { ...TYPOGRAPHY.title, color: COLORS.onSurface },
  intervalValue: { ...TYPOGRAPHY.title, color: COLORS.onSurface, minWidth: 40, textAlign: 'center' },
  section: { marginBottom: SPACING.lg },
  weekdayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  weekdayChip: { minWidth: 44, minHeight: 44, borderRadius: 22, borderWidth: 1, borderColor: COLORS.outline, alignItems: 'center', justifyContent: 'center' },
  weekdayText: { ...TYPOGRAPHY.label, color: COLORS.onSurfaceVariant },
  chipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipTextSelected: { color: COLORS.onPrimary },
  preview: { padding: SPACING.md, backgroundColor: COLORS.surfaceContainer, borderRadius: RADII.md, marginTop: SPACING.md },
  previewText: { ...TYPOGRAPHY.body, color: COLORS.onSurface, fontWeight: '600' },
  footer: { padding: SPACING.lg, borderTopWidth: 1, borderTopColor: COLORS.outline },
});
```

- [ ] **Step 5: Add ReminderForm styles**

Add to `ReminderForm.tsx` styles:

```ts
recurrenceCard: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  backgroundColor: COLORS.surface,
  borderWidth: 1,
  borderColor: COLORS.outline,
  borderRadius: RADII.md,
  padding: SPACING.md,
  minHeight: 64,
},
recurrenceCardText: { flex: 1 },
recurrenceSummary: { ...TYPOGRAPHY.body, color: COLORS.onSurface, fontWeight: '600' },
recurrenceHelper: { ...TYPOGRAPHY.label, color: COLORS.onSurfaceVariant, marginTop: 2 },
presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.sm },
presetChip: { borderWidth: 1, borderColor: COLORS.outline, borderRadius: 20, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md },
presetChipText: { ...TYPOGRAPHY.label, color: COLORS.onSurfaceVariant },
```

- [ ] **Step 6: Run validation**

Run:

```bash
npm run typecheck
npm test -- tests/lib/recurrence.test.ts
```

Expected: typecheck catches any `z.infer` updates; fix by adding `recurrence_rule` to `ReminderFormData` inferred schema only.

---

### Task 7: Display Generated Recurrence Summaries in Detail View

**Files:**
- Modify: `app/(tabs)/(reminders)/[id].tsx`

**Interfaces:**
- Consumes: `normalizeRecurrenceRule`, `summarizeRecurrence`.

- [ ] **Step 1: Update imports**

Add:

```ts
import { normalizeRecurrenceRule, summarizeRecurrence } from '@/lib/recurrence';
```

- [ ] **Step 2: Compute summary once**

After `const isPaid = reminder.status === 'paid';`, add:

```ts
const recurrenceRule = normalizeRecurrenceRule(reminder.recurrence_rule ?? reminder.recurrence, reminder.due_date);
const recurrenceSummary = summarizeRecurrence(recurrenceRule, reminder.due_date);
```

- [ ] **Step 3: Replace legacy badge and detail text**

Replace:

```tsx
{reminder.recurrence !== 'none' && (
  <Badge
    label={reminder.recurrence === 'monthly' ? 'Bulanan' : 'Tahunan'}
    variant="neutral"
  />
)}
```

With:

```tsx
{recurrenceRule.enabled && (
  <Badge label={recurrenceSummary} variant="neutral" />
)}
```

Replace the `Pengulangan` row value with:

```tsx
<Text style={styles.detailValue}>{recurrenceSummary}</Text>
```

- [ ] **Step 4: Run validation**

Run:

```bash
npm run typecheck
```

Expected: passes.

---

### Task 8: Document the Recurrence Engine

**Files:**
- Create: `docs/recurrence-engine.md`

**Interfaces:**
- Produces future-maintainer documentation for versioning, semantics, and RRULE upgrade path.

- [ ] **Step 1: Write docs**

Create `docs/recurrence-engine.md`:

```md
# Recurrence Engine

DueDateBuddy stores flexible recurrence rules in `reminders.recurrence_rule` as a versioned JSON object.

## Version 1 shape

```ts
type ReminderRecurrence =
  | { version: 1; enabled: false }
  | {
      version: 1;
      enabled: true;
      interval: number;
      unit: 'day' | 'week' | 'month' | 'year';
      startDate: string;
      daysOfWeek?: number[];
      monthlyMode?: 'dayOfMonth' | 'weekday';
      dayOfMonth?: number;
      weekOfMonth?: 1 | 2 | 3 | 4 | -1;
      weekday?: number;
      end:
        | { type: 'never' }
        | { type: 'date'; until: string }
        | { type: 'count'; occurrences: number };
    };
```

## Semantics

- Weekdays use JavaScript/date-fns numbering: `0 = Sunday`, `1 = Monday`, ..., `6 = Saturday`.
- Monthly weekday mode uses `weekOfMonth: -1` for the last weekday of a month.
- Yearly recurrences derive month/day from the occurrence due date and the rule `startDate`; no separate month is stored.
- Monthly day-of-month rules keep the intended `dayOfMonth`. If the target month is shorter, the date clamps to the last valid day.
- Feb 29 yearly recurrences clamp to Feb 28 on non-leap years and return Feb 29 on leap target years.
- Count endings include the first occurrence. `occurrences: 2` means the original due date plus one generated next occurrence.

## Current scheduling model

Each occurrence is a separate reminder row. When a user marks an occurrence paid, `markAsPaid` calls `nextOccurrence(rule, currentDueDate)`. If a date is returned, the app inserts the next pending row and links it with `parent_reminder_id`.

Phase 1 does not auto-advance missed reminders on app restart or foreground. That requires an idempotent lifecycle sweep and is intentionally deferred.

## Future versioning

The `version` field exists so future migrations can add business days, exception dates, or RRULE support without guessing rule shape. If RRULE support is added, introduce `version: 2` or an explicit `kind: 'rrule'` and keep `normalizeRecurrenceRule` as the compatibility boundary.

<!-- ponytail: date-fns engine covers current product needs; swap to RRULE only when exception dates/business calendars require it. -->
```

- [ ] **Step 2: Run no-op docs check**

Run:

```bash
test -f docs/recurrence-engine.md && echo "recurrence docs written"
```

Expected: `recurrence docs written`.

---

### Task 9: Final Validation and Cleanup

**Files:**
- All touched files.

**Interfaces:**
- Verifies the full Phase 1 feature compiles and core tests pass.

- [ ] **Step 1: Run tests**

Run:

```bash
npm test
```

Expected: all Jest tests pass.

- [ ] **Step 2: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: `tsc --noEmit` passes.

- [ ] **Step 3: Run lint only if available**

Run:

```bash
npm run lint --if-present
```

Expected: if no lint script exists, npm exits successfully without running lint.

- [ ] **Step 4: Review diff for old recurrence UI remnants**

Run:

```bash
grep -R "Bulanan\|Tahunan\|recurrence === 'monthly'\|recurrence === 'yearly'" -n features app lib tests types | grep -v docs || true
```

Expected: no legacy display logic remains except compatibility mapping or tests intentionally covering migration.

- [ ] **Step 5: Run reviewer subagent before final summary**

Use a reviewer subagent focused on correctness, recurrence edge cases, TypeScript, Supabase migration safety, and Expo/React Native UI regressions.

---

## Self-Review

### Spec coverage

- Quick presets: Task 6.
- Custom editor modal: Task 6.
- Repeat every interval/unit: Task 6.
- Weekly weekdays: Task 2 + Task 6.
- Monthly same day / weekday / last weekday: Task 2 + Task 6.
- End conditions never/date/count: Task 1 + Task 2.
- Human-readable summary: Task 3 + Task 7.
- Flexible object model: Task 1 + Task 4.
- Version field: Task 1 + Task 4.
- Scheduler next occurrence on completion: Task 5.
- Missed reminder lifecycle sweep: explicitly deferred by Phase 1 decision.
- Leap years/month lengths/DST-local date safety: Task 2 tests local date strings; notification time behavior remains existing.
- Backward migration: Task 4 + Task 1 normalizer.
- Documentation: Task 8.
- Comprehensive recurrence tests: Task 2 + Task 3 + Task 9.

### Placeholder scan

No TBD/TODO/fill-later placeholders. Phase 2 is explicitly out of Phase 1 scope, not a placeholder.

### Type consistency

Public names used consistently: `ReminderRecurrence`, `normalizeRecurrenceRule`, `parseRecurrenceRule`, `buildRecurrencePreset`, `nextOccurrence`, `summarizeRecurrence`, `formatLocalDate`.
