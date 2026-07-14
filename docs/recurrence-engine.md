# Recurrence Engine

DueDateBuddy stores flexible reminder recurrence rules in
`reminders.recurrence_rule` as a versioned JSON object. The legacy
`reminders.recurrence` text column remains for rollback and compatibility.

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

- Weekdays use JavaScript/date-fns numbering: `0 = Sunday`, `1 = Monday`, ...,
  `6 = Saturday`.
- Weekly rules run on a single weekday if `daysOfWeek` has one entry, or
  multiple weekdays within the on-week. Bi-weekly (and larger intervals) skip
  off-weeks and resume on the next on-week.
- Monthly weekday mode uses `weekOfMonth: -1` for the last weekday of a month
  (e.g. last Friday). `1`/`2`/`3`/`4` mean first/second/third/fourth.
- Yearly recurrences derive month/day from the occurrence `due_date` and the
  rule `startDate`; no separate month is stored. This keeps yearly rules
  consistent when an occurrence is created with a different month than the
  anchor.
- Monthly day-of-month rules keep the intended `dayOfMonth`. If the target
  month is shorter, the date clamps to the last valid day (e.g. Jan 31 → Feb
  28).
- Feb 29 yearly recurrences clamp to Feb 28 on non-leap years and return
  Feb 29 on leap target years.
- `end.type === 'count'` is computed deterministically from `startDate` and
  the recurrence sequence. `occurrences: 2` means the original due date plus
  one generated next occurrence.

## Current scheduling model

## Scheduling model

Each occurrence is a separate reminder row. When a user marks an occurrence
paid, `markAsPaid` calls `nextOccurrence(rule, currentDueDate)`. If a date is
returned, the app inserts the next pending row and links it with
`parent_reminder_id`.

## Auto-advance (Phase 2)

When a recurring reminder's due date passes unpaid, a client-side lifecycle
sweep auto-advances the chain so the next bill is always visible and its
notifications are scheduled before the user has to ask.

- **Trigger:** cold boot (always runs) + warm foreground
  (`AppState` → `active`), in-memory ~5 min debounce, wired at the
  authenticated root (`app/_layout.tsx`). In-memory ref only; no
  AsyncStorage.
- **Predicate:** the sweep only acts on rows that are
  `status = 'pending' AND recurrence.enabled AND due_date < today`.
  Non-recurring reminders just display as overdue and are never advanced.
- **End state of a missed row:** the missed occurrence is flipped
  `pending → overdue`; the next occurrence is inserted as `pending` (or
  `overdue` for every subsequent missed period). No new status, no DB
  constraint migration.
- **Volume:** full history — one row per missed period until the next
  occurrence is `>= today` or the rule ends (`never` / `date` / `count`).
  `count` consumes elapsed occurrences (paid or not). The end-condition
  handling is delegated to `nextOccurrence`, which already returns `null`
  past the end.
- **Race safety:** the sweep uses a conditional-update gate
  `UPDATE reminders SET status='overdue' WHERE id=X AND status='pending'
  RETURNING *` for both the desired flip and the per-row mutex. Only the
  winner inserts the next row; the loser gets 0 rows back and stops. The
  gate repeats per catch-up step.
- **Crash resumability:** each new intermediate row is inserted as
  `pending` and then flipped `pending → overdue` in the same loop
  iteration. A mid-sweep crash leaves a `pending`-past row that the next
  foreground resumes; the chain is never silently lost.
- **`markAsPaid` idempotency:** before inserting the next occurrence,
  `markAsPaid` checks for an existing child
  (`parent_reminder_id = id AND due_date = nextDueDate`). If found (the
  sweep pre-created it), the insert is skipped and only the `paid` flip
  is applied. One rule covers both reconcile and normal advance.
- **Notifications:** the sweep calls the shared
  `notificationService.scheduleReminder(reminder, prefs)` service (the same
  one `createReminder` and `markAsPaid` use), not `markAsPaid`. Prefs are
  fetched once per sweep; the service is called per created row. No
  proactive push is fired on catch-up — the home screen's "Terlambat"
  section and existing overdue re-notify handle the user signal. Past
  triggers are no-ops.
- **Ceiling:** the per-chain loop is bounded at 120 iterations. Above
  that, the sweep stops and the next foreground resumes. This is a
  self-healing safety bound, not a product cap. A Postgres RPC that
  batches the per-chain insert server-side is the documented upgrade path
  if the per-step network round-trips ever bite.
- **Known limitation:** if the user never opens the app, the next
  occurrence's local notification is never scheduled (expo-notifications is
  device-local; Phase 2 has no background fetch). A future Phase 3
  (background fetch or server-driven push) would close this.

## File map

- `lib/recurrence/types.ts` — TypeScript types for the versioned rule.
- `lib/recurrence/schema.ts` — zod validation and `parseRecurrenceRule`.
- `lib/recurrence/normalize.ts` — `normalizeRecurrenceRule` (legacy string or
  malformed JSON → safe object) and `parseLocalDate` / `formatLocalDate`
  helpers.
- `lib/recurrence/presets.ts` — `buildRecurrencePreset` for quick chips.
- `lib/recurrence/calc.ts` — `nextOccurrence` and `getOccurrenceIndex`.
- `lib/recurrence/summary.ts` — `summarizeRecurrence` (Indonesian text).
- `lib/recurrence/sweep.ts` — pure sweep planner: `planCatchUp`
  (ordered catch-up sequence, end-aware, bounded by `maxSteps`) and
  `isSweepEligible` (predicate).
- `features/reminders/useReminderSweep.ts` — effectful lifecycle hook:
  cold boot + `AppState` warm foreground, in-memory ~5 min debounce,
  per-chain advance loop with the conditional-update gate, shared
  notification scheduling.

## Future versioning

The `version` field exists so future migrations can add business days,
exception dates, or RRULE support without guessing rule shape. If RRULE
support is added, introduce `version: 2` or an explicit `kind: 'rrule'` and
keep `normalizeRecurrenceRule` as the compatibility boundary.

<!-- ponytail: date-fns engine covers current product needs; swap to RRULE only
when exception dates or business calendars require it. -->
