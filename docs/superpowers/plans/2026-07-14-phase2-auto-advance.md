# Phase 2: Missed-Reminder Auto-Advance — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a recurring reminder's due date passes unpaid, automatically advance the chain: flip the missed occurrence `pending → overdue` and generate the next occurrence (full history), on app cold boot and warm foreground. Make `markAsPaid` idempotent so reconciling an already-advanced missed row does not duplicate the next row.

**Architecture:** Add a pure `lib/recurrence/sweep.ts` planner (`planCatchUp`, `isSweepEligible`) that computes the ordered catch-up due-date sequence from a rule + due date + now, delegating all end-condition handling to the existing `nextOccurrence`. Add an effectful `features/reminders/useReminderSweep.ts` hook that fetches eligible reminders, runs a per-chain advance loop using a conditional-update gate (`UPDATE … SET status='overdue' WHERE id=X AND status='pending' RETURNING *`) as both the desired flip and the per-row mutex, inserts each next occurrence as `pending` then gates it to `overdue` (crash-resumable), and schedules notifications via the shared `notificationService.scheduleReminder` service (not via `markAsPaid`). Wire the hook at the authenticated root for cold boot + `AppState`→`active` with an in-memory ~5 min debounce.

**Tech Stack:** Expo / React Native, TypeScript, Supabase Postgres, date-fns, expo-notifications, Jest.

## Global Constraints (from grilling session 2026-07-14)

- **Decision 1 — End-state:** Missed recurring rows stay `overdue` (existing status). No new status, no constraint migration. We do not auto-mark `paid` or `skipped`.
- **Decision 2 — Catch-up volume:** Full history — one row per missed period. No artificial cap.
- **Decision 3 — Trigger:** Cold boot (always runs) + warm foreground (`AppState` → `active`), in-memory ~5 min debounce (no AsyncStorage), hooked at the authenticated root (guard on `user`).
- **Decision 4 — Race/idempotency:** Conditional-update gate `UPDATE reminders SET status='overdue' WHERE id=X AND status='pending' RETURNING *`. Only the winner inserts the next row. The loop repeats the gate per catch-up step (crash-resumable: a `pending`-past row left by a mid-sweep crash is resumed next foreground).
- **Decision 5 — Notifications (refined):** Schedule via the shared `notificationService.scheduleReminder(reminder, prefs)` service (already used by `createReminder` + `markAsPaid`), NOT by calling `markAsPaid`. Fetch `NotificationPreferences` once per sweep, then call the shared service per created row (no-op on past triggers). No proactive push. Missed rows' existing notifications untouched. Overdue re-notify dead code (`shouldRenotify`/`detectOverdue`) stays out of scope.
- **Decision 6 — End conditions & scope:** `count` consumes elapsed occurrences (paid or not). Delegate all end handling (`never`/`date`/`count`) to `nextOccurrence`. Sweep only touches reminders where recurrence is enabled (`rule.enabled === true`, or legacy `recurrence !== 'none'`).
- **Decision 7 — Reversibility:** `markAsPaid` becomes idempotent — before inserting the next occurrence, query for an existing child (`parent_reminder_id = id AND due_date = nextDueDate`); if found, skip the insert and just mark paid. If not found, insert (normal advance).
- **Decision 8 — Module structure:** Pure `lib/recurrence/sweep.ts` (`planCatchUp`, `isSweepEligible`) under Jest + effectful `features/reminders/useReminderSweep.ts` hook. Mirror the Phase 1 seam.
- **Decision 9 — Performance ceiling:** Ship per-step sequential inserts (forced by the `parent_reminder_id` chain — each new row needs the just-inserted predecessor id). Bounded-iteration guard at 120. Idempotent resume on next foreground. RPC-batch is the documented upgrade path, not Phase 2.

## Derived (not decisions, for clarity)

- **Sweep predicate:** `status = 'pending' AND recurrence.enabled AND due_date < today`. Computed client-side via `isSweepEligible(reminder, now)` after fetching the user's pending reminders.
- **Partial failure is self-healing:** a mid-sweep crash leaves a `pending`-past row that the next foreground resumes via the gate — no loss, no duplicate.
- **Known out-of-scope limitation:** if the user *never* opens the app, the next occurrence's local notification is never scheduled (expo-notifications is device-local; Phase 2 has no background fetch). A future Phase 3 (background fetch or server-driven push) would close this. Do NOT build it now.

## File Structure

- Create: `lib/recurrence/sweep.ts` — pure sweep planner.
- Create: `tests/lib/sweep.test.ts` — comprehensive planner tests.
- Create: `features/reminders/useReminderSweep.ts` — effectful lifecycle sweep hook.
- Modify: `features/reminders/useReminders.ts` — idempotent `markAsPaid` (child-existence check before insert).
- Modify: `app/_layout.tsx` (or the authenticated layout) — wire `useReminderSweep()` for cold boot + `AppState`.
- Update: `docs/recurrence-engine.md` — document the auto-advance behavior and ceilings.

## Interfaces

- Produces: `planCatchUp(rule, fromDueDate, now?, maxSteps?)`, `isSweepEligible(reminder, now?)`, `useReminderSweep()`.
- Consumes: `nextOccurrence`, `normalizeRecurrenceRule`, `formatLocalDate`, `parseLocalDate` from `lib/recurrence`; `notificationService.scheduleReminder`; `getOrCreateNotificationPreferences`; `safeQuery`/`safeQuerySingle`; `logger`.

---

### Task 1: Pure sweep planner + tests (TDD)

**Files:**
- Create: `lib/recurrence/sweep.ts`
- Create: `tests/lib/sweep.test.ts`

**Pure interface:**

```ts
import type { Reminder } from '@/types';
import type { ReminderRecurrence } from './types';

export type CatchUpStep = {
  dueDate: string;        // YYYY-MM-DD of the occurrence to CREATE
  isUpcoming: boolean;    // true = final caught-up occurrence (status 'pending'); false = passed (status 'overdue')
};

// Ordered catch-up occurrences to create, excluding the start row.
// Stops when the next occurrence is >= today (upcoming) or the rule ends.
export function planCatchUp(
  rule: ReminderRecurrence,
  fromDueDate: string,
  now: Date = new Date(),
  maxSteps = 120,
): CatchUpStep[];

// True only for a pending, enabled, past-due reminder.
export function isSweepEligible(reminder: Reminder, now: Date = new Date()): boolean;
```

**Implementation notes:**
- `isSweepEligible`: `reminder.status === 'pending'` AND `normalizeRecurrenceRule(reminder.recurrence_rule ?? reminder.recurrence, reminder.due_date).enabled === true` AND `parseLocalDate(reminder.due_date) < startOfDay(now)` (date-only comparison).
- `planCatchUp`: if `!rule.enabled` return `[]`. Loop up to `maxSteps`: `next = nextOccurrence(rule, current)`; if `null` → break (end reached); push `{ dueDate: formatLocalDate(next), isUpcoming: !isBefore(next, startOfDay(now)) }`; if `isUpcoming` → break (caught up); else `current = formatLocalDate(next)` and continue.
- Use `startOfDay(now)` (date-fns) for date-only "today" comparison so a reminder due today at 00:00 is NOT swept (still upcoming today). Compare via `isBefore(next, startOfDay(now))`.

- [ ] **Step 1: Write failing planner tests** in `tests/lib/sweep.test.ts`:

```ts
import { isSweepEligible, planCatchUp } from '../../lib/recurrence/sweep';
import { buildRecurrencePreset, normalizeRecurrenceRule } from '../../lib/recurrence';
import type { Reminder } from '../../types';

const baseReminder = (over: Partial<Reminder>): Reminder => ({
  id: 'r1', user_id: 'u', asset_id: null, title: 'Listrik', category: 'tagihan',
  due_date: '2026-07-20', recurrence: 'monthly', recurrence_rule: null,
  amount: null, notes: null, remind_before_days: [7, 3, 1, 0], status: 'pending',
  priority: 'normal', paid_at: null, parent_reminder_id: null,
  created_at: '', updated_at: '', ...over,
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
    const r = baseReminder({ recurrence: 'none', recurrence_rule: { version: 1, enabled: false } });
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
    expect(planCatchUp({ version: 1, enabled: false }, '2026-07-20', new Date('2026-08-15'))).toEqual([]);
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
```

- [ ] **Step 2: Implement `lib/recurrence/sweep.ts`** to make the tests pass.
- [ ] **Step 3: Run `npm test -- tests/lib/sweep.test.ts`** — all green.

---

### Task 2: Idempotent `markAsPaid`

**Files:**
- Modify: `features/reminders/useReminders.ts`

**Behavior:** Before inserting the next occurrence, query for an existing child row with `parent_reminder_id = reminder.id AND due_date = <nextDueDate>` AND `user_id`. If a child exists, skip the insert (just mark the current row paid — already done by the existing update). If no child exists, insert the next occurrence (normal advance), then schedule via the shared `notificationService.scheduleReminder`.

**Implementation notes:**
- Reuse the existing `nextOccurrence(rule, reminder.due_date)` to compute `nextDueDate` (already done).
- The existing-child check: `safeQuerySingle(() => supabase.from('reminders').select('id').eq('parent_reminder_id', reminder.id).eq('user_id', user?.id).eq('due_date', formatLocalDate(nextDueDate)).maybeSingle(), 'markAsPaid:childCheck')`. If `data` is non-null, skip insert.
- Keep the existing `notificationService.scheduleReminder(newReminder, prefs)` call only on the insert path.
- Do NOT couple to the sweep — `markAsPaid` knows nothing about sweep state.
- The existing `pending → paid` flip in `markAsPaid` is already atomic and prevents double-tap double-insert; keep it.

- [ ] **Step 1:** Modify `markAsPaid` to add the child-existence check before insert.
- [ ] **Step 2:** `npm run typecheck` — clean.
- [ ] **Step 3:** `npm test` — existing 59 tests still pass.

---

### Task 3: Effectful sweep hook

**Files:**
- Create: `features/reminders/useReminderSweep.ts`

**Behavior:** `useReminderSweep()` exposes `runSweep()` (and internally wires lifecycle in Task 4). `runSweep()`:
1. Bail if no `user`.
2. Fetch the user's pending reminders: `safeQuery(() => supabase.from('reminders').select('*').eq('user_id', user.id).eq('status', 'pending').order('due_date', { ascending: true }), 'sweep:fetch')`.
3. Filter to `isSweepEligible(r, now)` client-side.
4. Fetch `NotificationPreferences` ONCE: `getOrCreateNotificationPreferences(user.id)`. If null, bail.
5. For each eligible reminder, run `advanceChain(reminder, prefs, user)` (below). Process sequentially (parent_reminder_id chain dependency).

**`advanceChain(reminder, prefs, user)`:**
```text
rule = normalizeRecurrenceRule(reminder.recurrence_rule ?? reminder.recurrence, reminder.due_date)
// 1. Gate the START row (claim + flip pending->overdue). Idempotent mutex.
gated = UPDATE reminders SET status='overdue'
        WHERE id=reminder.id AND user_id=user.id AND status='pending'
        RETURNING *
if gated is null -> return  // lost the race or already advanced; another sweep owns it

parentId = reminder.id
steps = planCatchUp(rule, reminder.due_date, new Date())
for step in steps:
    // insert the next occurrence as 'pending'
    created = INSERT reminders (..., due_date=step.dueDate, parent_reminder_id=parentId,
                                recurrence_rule=rule, recurrence=legacyRecurrenceFromRule(rule),
                                status='pending') RETURNING *
    if created is null -> logger.error('sweep','insert failed',...); break   // partial; resume next foreground
    await notificationService.scheduleReminder(created, prefs)  // shared service; no-op on past triggers
    parentId = created.id
    if step.isUpcoming -> break   // final upcoming row stays 'pending'; done
    // passed occurrence -> gate it pending->overdue (claim + flip); crash-resumable
    flipped = UPDATE reminders SET status='overdue'
              WHERE id=created.id AND user_id=user.id AND status='pending' RETURNING *
    if flipped is null -> break   // someone else took over this row; stop
```

**Implementation notes:**
- Use `safeQuery`/`safeQuerySingle` from `@/lib/supabase-safe` for ALL Supabase calls.
- Use `logger` from `@/lib/logger` for errors (never `console.log`).
- `legacyRecurrenceFromRule` already exists in `useReminders.ts` — export it from a shared spot or duplicate the 4-liner here (prefer: move it to `lib/recurrence/legacy.ts`? NO — ponytail: duplicate the 4-line helper locally to avoid a new file; or import from useReminders if exported). Simplest: keep a local copy.
- The `notificationService.scheduleReminder(created, prefs)` call is the shared scheduling service — identical to what `createReminder`/`markAsPaid` use. Do NOT call `markAsPaid`.
- Sequential per-reminder processing is required (each new row's `parent_reminder_id` needs the prior row's id).

- [ ] **Step 1:** Create `features/reminders/useReminderSweep.ts` with `runSweep` + `advanceChain`.
- [ ] **Step 2:** `npm run typecheck` — clean.

---

### Task 4: Wire lifecycle at the authenticated root

**Files:**
- Modify: `app/_layout.tsx` (or the authenticated layout — confirm which is the authenticated root before editing)

**Behavior:**
- On mount (cold boot): call `runSweep()` once (guarded by `user` presence).
- Subscribe to `AppState` ('active' transitions): on 'active', check an in-memory `lastSweepAt` ref; if `Date.now() - lastSweepAt < 5 * 60 * 1000`, skip; else call `runSweep()` and set `lastSweepAt = Date.now()`.
- Cold boot always runs (do not gate cold boot on the debounce).
- `lastSweepAt` is a `useRef(0)` — in-memory only, no AsyncStorage.

**Implementation notes:**
- `AppState` is a stdlib React Native API — no new dependency.
- Guard everything on `user` (from `useAuth`): no user → no sweep.
- Wrap `runSweep` in the hook's own `useCallback` so the effect identity is stable.
- Do not block the UI: `runSweep` is async and fire-and-forget from the effect (no `await` that stalls render).

- [ ] **Step 1:** Read `app/_layout.tsx` to confirm it is the authenticated root (auth gate present). If auth gate is in a nested layout, wire there instead.
- [ ] **Step 2:** Wire `useReminderSweep()` cold boot + `AppState` listener.
- [ ] **Step 3:** `npm run typecheck` — clean.
- [ ] **Step 4:** `npx expo-doctor` — 20/20.

---

### Task 5: Docs + final validation

**Files:**
- Update: `docs/recurrence-engine.md`

- [ ] **Step 1:** Add an "Auto-advance (Phase 2)" section to `docs/recurrence-engine.md` describing: trigger (cold boot + warm foreground, ~5 min debounce), end-state (missed rows stay `overdue`, full history), the conditional-update gate mutex, `markAsPaid` idempotency, the 120-step guard ceiling + RPC-batch upgrade path, and the known limitation (never-opened app → next notification not scheduled).
- [ ] **Step 2:** Run full validation:
  - `npm test` (existing 59 + new sweep tests)
  - `npm run typecheck`
  - `npx expo-doctor`
- [ ] **Step 3:** Report changed files + validation output.

---

## Validation

After implementation, run:
- `npm test` — must include new `tests/lib/sweep.test.ts`, all green.
- `npm run typecheck` — clean.
- `npx expo-doctor` — 20/20.
- `npm run lint` — only if the script exists (it currently does not).

## Residual Risks / Ceilings

- **O(N) sequential inserts per chain** (forced by `parent_reminder_id`). Bounded at 120 steps; rare (weekly + multi-year absence) and self-healing. RPC-batch is the documented upgrade path. (`ponytail:` comment in `advanceChain`.)
- **Never-opened app gap:** next occurrence's local notification is never scheduled without an app foreground. Phase 3 (background fetch / server push) — out of scope.
- **`markAsPaid` child-check query** assumes the chain uses `parent_reminder_id = immediate predecessor`. Confirmed by Phase 1 + this plan. If a future refactor flattens the chain, the child-check must change too.
