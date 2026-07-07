# Reminder System Redesign — Design Spec

**Date:** 2026-07-07
**Author:** AI agent
**Status:** Design Approved
**Approach:** Layered Delivery (Layer 1 = Foundation)

---

## Overview

Redesign the reminder/notification system for DueDateBuddy from a simple alarm system into a personal reminder assistant. The redesign is delivered in 3 layers; this spec covers Layer 1 (Foundation), with the service interfaces designed to accommodate Layers 2 and 3 without rewriting.

---

## Section 1 — Data Model Changes

### Migration: Add `priority` to reminders

```sql
alter table public.reminders
  add column priority text not null default 'normal',
  add constraint valid_priority check (priority in ('critical', 'high', 'normal', 'low'));

-- ponytail: one column, one constraint, no mapping table
```

### New table: `notification_preferences`

```sql
create table public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  notification_time time not null default '08:00',
  reminder_schedule int[] not null default array[30, 14, 7, 3, 1],
  grouping_enabled boolean not null default true,
  weekend_reminders boolean not null default true,
  quiet_hours_start time,
  quiet_hours_end time,
  overdue_frequency text not null default 'daily',
  auto_archive_days int default 90,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint valid_overdue_frequency check (overdue_frequency in ('daily', 'every_other_day', 'weekly', 'none'))
);

alter table public.notification_preferences enable row level security;

create policy "Users can view own prefs"
  on public.notification_preferences for select
  using (auth.uid() = user_id);

create policy "Users can insert own prefs"
  on public.notification_preferences for insert
  with check (auth.uid() = user_id);

create policy "Users can update own prefs"
  on public.notification_preferences for update
  using (auth.uid() = user_id);

create policy "Users can delete own prefs"
  on public.notification_preferences for delete
  using (auth.uid() = user_id);
```

### New column: `parent_reminder_id` on reminders

For linking recurrence chains.

```sql
alter table public.reminders
  add column parent_reminder_id uuid references public.reminders(id) on delete set null;
```

### Trigger: auto-create notification_preferences on signup

Extend the existing `handle_new_user` function:

```sql
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  insert into public.notification_preferences (user_id)
  values (new.id);
  return new;
end;
$$;
```

---

## Section 2 — Services Architecture

Four files in `lib/`. All stateless/pure logic separated from React.

### `lib/reminder-engine.ts`

Pure functions. No class. Computes a reminder's actionable state at any point in time.

```typescript
type ActionableState = 'upcoming' | 'today' | 'due' | 'overdue' | 'completed' | 'snoozed';

function computeState(reminder: Reminder, prefs: NotificationPreferences, now: Date): ActionableState;

// Returns true if the reminder needs a re-notification based on overdue_frequency
function shouldRenotify(reminder: Reminder, prefs: NotificationPreferences, now: Date): boolean;

// Detects overdue reminders that were missed (app was closed)
function detectOverdue(reminders: Reminder[], now: Date): Reminder[];
```

Called at app startup and on focus. No background cron.

### `lib/notification-service.ts`

Provider pattern — one interface, swapable implementations.

```typescript
interface NotificationProvider {
  schedule(info: NotificationInfo): Promise<void>;
  cancel(reminderId: string): Promise<void>;
  cancelAll(): Promise<void>;
}

class NotificationService {
  private provider: NotificationProvider;

  constructor(provider: NotificationProvider) {
    this.provider = provider;
  }

  setProvider(provider: NotificationProvider): void;
  schedule(info: NotificationInfo): Promise<void>;
  scheduleGrouped(reminders: Reminder[], time: Date): Promise<void>;
  cancel(reminderId: string): Promise<void>;
  cancelAll(): Promise<void>;
  rescheduleAll(reminders: Reminder[], prefs: NotificationPreferences): Promise<void>;
}
```

- `LocalNotificationProvider` — wraps current `expo-notifications` calls
- Future: `ExpoPushProvider` implements same interface for push

### `lib/notification-scheduler.ts`

Computes when and what to notify.

```typescript
type TriggerInfo = {
  date: Date;
  type: 'reminder' | 'digest' | 'overdue';
};

function computeTriggers(
  dueDate: Date,
  schedule: number[],
  notificationTime: string
): TriggerInfo[];

function buildDigestBody(reminders: Reminder[]): string;

function buildOverdueBody(reminder: Reminder, daysOverdue: number): string;
```

Grouping: when `grouping_enabled` and >1 reminder triggers on the same date, skip individual triggers and schedule one digest trigger.

### Data flow

```
Create/Edit Reminder
  → ReminderEngine validates state
  → NotificationScheduler computes trigger dates
  → NotificationService schedules via provider

App opens / focuses
  → ReminderEngine detects overdue reminders
  → NotificationScheduler checks missed notifications
  → NotificationService re-schedules if needed

Settings change
  → NotificationService cancels all
  → NotificationScheduler re-computes all triggers
  → NotificationService re-schedules
```

---

## Section 3 — UI Changes

### Reminder Form (add/edit)

Add priority selector below category:

```
Prioritas
[ Critical ] [ High ] [ ● Normal ] [ Low ]
```

Chips, same visual pattern as existing `remind_before_days` chips. Default: Normal. No conditional UI.

### Reminder Card

Priority displayed as a small colored indicator on the right edge:

- **Critical** → red dot + "Critical" label
- **High** → orange dot + "High" label
- **Normal** → no indicator (most common, no clutter)
- **Low** → gray dot + "Low" label

### Detail Screen

Add priority row in the detail card between amount and recurrence:
```
Prioritas    Critical
```

### Dashboard

Three specific additions:

1. **Critical Reminders bar** — horizontal scroll of critical-priority reminders, shown only when >=1 exists. Distinctive red-tinted cards. Positioned above the "Segera Jatuh Tempo" section.

2. **Due This Week** summary card replaces the current "Akan Jatuh Tempo" label with count + total amount:
   ```
   Jatuh Tempo Minggu Ini
   4 pengingat — Rp2.450.000
   ```

3. **Priority coloring** — overview cards use priority colors to differentiate.

### Settings Page — Notification Preferences

New dedicated card replacing the placeholder notification item:

| Key | Label | Control |
|-----|-------|---------|
| `notification_time` | Waktu pengingat | TimePicker (default 08:00) |
| `reminder_schedule` | Ingatkan sebelum | Preset dropdown: Standar, Cepat, Maksimal, Kustom |
| `grouping_enabled` | Gabung notifikasi | Toggle (default on) |
| `weekend_reminders` | Pengingat akhir pekan | Toggle (default on) |
| `quiet_hours_start/end` | Jam tenang | Time range (optional) |
| `overdue_frequency` | Frekuensi pengingat terlewat | Segmented: Setiap hari / 2 hari / Mingguan |
| `auto_archive_days` | Arsip otomatis setelah | Number input (hari, default 90, 0 = nonaktif) |

On change: upsert to `notification_preferences` —> trigger full reschedule.

---

## Section 4 — Notification Behavior

### Schedule

`reminder_schedule` defines days before due date to notify. Each positive offset triggers notification at `notification_time`. Zero = due day.

Default: `[30, 14, 7, 3, 1]`.

### Time-of-day

Every trigger date sets hour/minute from `notification_preferences.notification_time`. Default 08:00. Currently WIB only (no DST in Indonesia). Timezone support deferred.

### Grouping

When `grouping_enabled` and multiple reminders fire on the same date: one digest notification at `notification_time`.

```
📅 3 pengingat hari ini
Listrik — Rp150.000
Internet — Rp350.000
Netflix — Rp79.000
```

Computed at schedule time. If user marks one paid mid-day, the grouped notification still fires (already scheduled). Acceptable for Layer 1.

### Overdue escalation

At app startup/focus:
1. `ReminderEngine.detectOverdue()` finds pending reminders past due_date
2. `shouldRenotify()` checks `overdue_frequency` and last notification
3. If yes, schedule re-notification at `notification_time`

Overdue body format:
```
Terlewat! Listrik — Rp150.000 (3 hari lewat)
```

`overdue_frequency` values:
- `daily` — every day
- `every_other_day` — every 2 days
- `weekly` — every 7 days
- `none` — no re-notification

### Recurrence with parent-child links

`markAsPaid` creates next occurrence row with `parent_reminder_id = original.id`. This links the chain without a separate `reminder_occurrences` table.

### Lifecycle states (computed, not stored)

| DB status | computed state | condition |
|-----------|---------------|-----------|
| pending | upcoming | due_date in future |
| pending | today | due_date is today |
| pending | overdue | due_date in past |
| paid | completed | paid_at is set |
| paid | archived | paid_at > auto_archive_days ago |

`archived` status is applied by a cleanup check at startup. Not a stored column.

---

## Layer 2 Preview (not implemented yet)

- `reminder_logs` table for state changes + notification delivery records
- In-app notification center rendered from logs
- Snooze with `snoozed_until` column + separate notification trigger
- Notification grouping enhanced with per-user grouping window

## Layer 3 Preview (not implemented yet)

- `ExpoPushProvider` implementation of `NotificationProvider`
- Supabase Edge Function for cron-based scheduling
- `notification_queue` table for server-side pending notifications

---

## Out of Scope (Layer 1)

- Notification inbox (Layer 2)
- Snooze (Layer 2)
- Push notifications from server (Layer 3)
- Sound/vibration settings
- Timezone support
- Calendar view
- Charts / statistics

---

## Migration Plan

1. Run SQL migration (add columns + create table + RLS + update trigger)
2. Backfill `notification_preferences` for existing users
3. Add `lib/reminder-engine.ts`
4. Add `lib/notification-service.ts` + `lib/notification-scheduler.ts`
5. Refactor `lib/notifications.ts` to use new services
6. Update `useReminders.ts` — priority field, recurrence linking
7. Update `ReminderForm.tsx` — priority selector
8. Update `ReminderCard.tsx` — priority badge
9. Update detail screen — priority row
10. Update dashboard — critical row, due-this-week card
11. Rewrite `pengaturan.tsx` — notification preferences UI
12. Test locally
