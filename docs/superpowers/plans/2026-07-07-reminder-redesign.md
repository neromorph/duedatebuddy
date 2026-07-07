# Reminder System Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the reminder system from simple alarms to a configurable, priority-aware personal assistant with a clean notification architecture.

**Architecture:** Layer 1 of 3. DB changes first (priority column + notification_preferences table), then pure-service layer (ReminderEngine, NotificationService, NotificationScheduler), then UI integration (priority form/card/detail, dashboard sections, settings page). Services use a provider pattern so push notifications can swap in later without rewriting.

**Tech Stack:** Expo SDK 57 · expo-notifications ~57.0.3 · Supabase · TypeScript ~6.0 · React Native 0.86 · date-fns ^3.6.0

## Global Constraints

- Language: Bahasa Indonesia (UI text must use Indonesian)
- All new lib/ files export pure functions or thin classes, no React imports
- UI components stay in features/reminders/ or components/ui/ — no new directories
- RLS policies on every new table matching existing pattern (user_id = auth.uid())
- Notification provider interface in lib/, implementations stay swappable
- Migration 00002.sql runs after 00001_initial_schema.sql

---

### Task 1: Types + Database Migration

**Files:**
- Create: `supabase/migrations/00002_reminder_redesign.sql`
- Modify: `types/index.ts`

**Interfaces:**
- Consumes: existing Reminder type, existing Profile type
- Produces: `Priority`, `NotificationPreferences`, `ReminderPriority`, `OverdueFrequency` types; updated `Reminder` type with `priority` and `parent_reminder_id`

- [ ] **Step 1: Create migration SQL**

Write `supabase/migrations/00002_reminder_redesign.sql`:

```sql
-- DueDateBuddy Reminder Redesign — Layer 1
-- priority column, parent_reminder_id, notification_preferences table

alter table public.reminders
  add column priority text not null default 'normal',
  add constraint valid_priority check (priority in ('critical', 'high', 'normal', 'low'));

alter table public.reminders
  add column parent_reminder_id uuid references public.reminders(id) on delete set null;

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

-- Extend handle_new_user trigger to create notification_preferences row
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

- [ ] **Step 2: Add types to types/index.ts**

Append these after existing types near the end of the file:

```typescript
export type Priority = 'critical' | 'high' | 'normal' | 'low';
export type ReminderPriority = Priority;
export type OverdueFrequency = 'daily' | 'every_other_day' | 'weekly' | 'none';

export type NotificationPreferences = {
  id: string;
  user_id: string;
  notification_time: string;
  reminder_schedule: number[];
  grouping_enabled: boolean;
  weekend_reminders: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  overdue_frequency: OverdueFrequency;
  auto_archive_days: number | null;
  created_at: string;
  updated_at: string;
};
```

Then add to the existing `Reminder` type:
- `priority: Priority;` after the `status` field
- `parent_reminder_id: string | null;` after the `paid_at` field

The `ReminderStatus` union type stays as-is (`'pending' | 'paid' | 'overdue'`). The new `Priority` type is separate.

- [ ] **Step 3: Run migration**

```bash
npx supabase migration up
# or apply 00002_reminder_redesign.sql via Supabase dashboard SQL editor
```

Verify by querying `select priority, parent_reminder_id from reminders limit 1` and `select * from notification_preferences limit 1`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/00002_reminder_redesign.sql types/index.ts
git commit -m "feat: add priority, parent_reminder_id, notification_preferences table"
```

---

### Task 2: ReminderEngine

**Files:**
- Create: `lib/reminder-engine.ts`
- Create: `tests/lib/reminder-engine.test.ts`

**Interfaces:**
- Consumes: `Reminder`, `NotificationPreferences` (from Task 1)
- Produces: `computeState(reminder, now) => ActionableState`, `shouldRenotify(reminder, prefs, lastNotifiedAt, now) => boolean`, `detectOverdue(reminders, now) => Reminder[]`

- [ ] **Step 1: Write the tests**

Create `tests/lib/reminder-engine.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest tests/lib/reminder-engine.test.ts --no-cache 2>&1 || true
```
Expected: FAIL — module not found or imports fail.

- [ ] **Step 3: Write the implementation**

Create `lib/reminder-engine.ts`:

```typescript
import { isBefore, isSameDay, differenceInDays } from 'date-fns';
import { Reminder, NotificationPreferences } from '@/types';

export type ActionableState = 'upcoming' | 'today' | 'overdue' | 'completed';

export function computeState(reminder: Reminder, now: Date = new Date()): ActionableState {
  if (reminder.status === 'paid') return 'completed';
  const dueDate = new Date(reminder.due_date + 'T00:00:00');
  if (isSameDay(dueDate, now)) return 'today';
  if (isBefore(dueDate, now)) return 'overdue';
  return 'upcoming';
}

export function shouldRenotify(
  reminder: Reminder,
  prefs: NotificationPreferences,
  lastNotifiedAt: Date | null,
  now: Date = new Date(),
): boolean {
  if (reminder.status !== 'pending') return false;
  const dueDate = new Date(reminder.due_date + 'T00:00:00');
  if (!isBefore(dueDate, now)) return false;
  if (!lastNotifiedAt) return true;
  const daysSince = differenceInDays(now, lastNotifiedAt);
  switch (prefs.overdue_frequency) {
    case 'daily': return daysSince >= 1;
    case 'every_other_day': return daysSince >= 2;
    case 'weekly': return daysSince >= 7;
    case 'none': return false;
  }
}

export function detectOverdue(reminders: Reminder[], now: Date = new Date()): Reminder[] {
  return reminders.filter(
    (r) => r.status === 'pending' && isBefore(new Date(r.due_date + 'T00:00:00'), now),
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest tests/lib/reminder-engine.test.ts --no-cache
```
Expected: PASS (all tests green).

- [ ] **Step 5: Commit**

```bash
git add lib/reminder-engine.ts tests/lib/reminder-engine.test.ts
git commit -m "feat: add ReminderEngine with state computation and overdue detection"
```

---

### Task 3: NotificationService + NotificationScheduler

**Files:**
- Create: `lib/notification-scheduler.ts`
- Create: `lib/notification-service.ts`
- Create: `tests/lib/notification-scheduler.test.ts`

**Interfaces:**
- Consumes: `Reminder`, `NotificationPreferences`, `Priority` (from Task 1)
- Produces: `NotificationService` class with `schedule()`, `cancel()`, `cancelAll()`, `rescheduleAll()`; `NotificationScheduler` functions `computeTriggers()`, `buildDigestBody()`, `buildOverdueBody()`

- [ ] **Step 1: Write the scheduler tests**

Create `tests/lib/notification-scheduler.test.ts`:

```typescript
import { computeTriggers, buildDigestBody, buildOverdueBody } from '../../lib/notification-scheduler';
import { subDays, startOfDay } from 'date-fns';

describe('computeTriggers', () => {
  it('computes trigger dates from schedule and notification time', () => {
    const dueDate = new Date('2026-08-01T00:00:00');
    const schedule = [7, 3, 1];
    const triggers = computeTriggers(dueDate, schedule, '08:00');
    expect(triggers).toHaveLength(3);
    expect(triggers[0].date.getHours()).toBe(8);
    expect(triggers[0].date.getMinutes()).toBe(0);
    expect(triggers[0].type).toBe('reminder');
  });

  it('filters out past trigger dates', () => {
    const pastDate = new Date('2020-01-01T00:00:00');
    const schedule = [7, 3, 1];
    const triggers = computeTriggers(pastDate, schedule, '08:00');
    expect(triggers).toHaveLength(0);
  });

  it('handles empty schedule', () => {
    const dueDate = new Date('2026-08-01T00:00:00');
    const triggers = computeTriggers(dueDate, [], '08:00');
    expect(triggers).toHaveLength(0);
  });
});

describe('buildDigestBody', () => {
  it('builds a grouped notification body', () => {
    const reminders = [
      { title: 'Listrik', amount: 150000 },
      { title: 'Internet', amount: 350000 },
    ];
    const body = buildDigestBody(reminders);
    expect(body).toContain('2 pengingat hari ini');
    expect(body).toContain('Listrik');
    expect(body).toContain('Internet');
  });

  it('handles empty reminders list', () => {
    expect(buildDigestBody([])).toContain('0 pengingat hari ini');
  });

  it('handles reminder without amount', () => {
    const body = buildDigestBody([{ title: 'Test', amount: null }]);
    expect(body).toContain('Test');
    expect(body).not.toContain('Rp');
  });
});

describe('buildOverdueBody', () => {
  it('includes days overdue and amount', () => {
    const body = buildOverdueBody({ title: 'Listrik', amount: 150000, due_date: '2026-07-01' });
    expect(body).toContain('Terlewat!');
    expect(body).toContain('Listrik');
    expect(body).toContain('150000');
  });

  it('works without amount', () => {
    const body = buildOverdueBody({ title: 'Test', amount: null, due_date: '2026-07-01' });
    expect(body).toContain('Terlewat! Test');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest tests/lib/notification-scheduler.test.ts --no-cache 2>&1 || true
```
Expected: FAIL — module not found.

- [ ] **Step 3: Write the scheduler implementation**

Create `lib/notification-scheduler.ts`:

```typescript
import { subDays, differenceInDays } from 'date-fns';
import { Reminder } from '@/types';

export type TriggerInfo = {
  date: Date;
  type: 'reminder' | 'digest' | 'overdue';
};

export type NotificationInfo = {
  title: string;
  body: string;
  data: { reminderId: string };
  triggerDate: Date;
};

export function computeTriggers(
  dueDate: Date,
  schedule: number[],
  notificationTime: string,
): TriggerInfo[] {
  const [hours, minutes] = notificationTime.split(':').map(Number);
  const now = new Date();
  return schedule
    .map((daysBefore) => {
      const d = subDays(dueDate, daysBefore);
      d.setHours(hours, minutes, 0, 0);
      return { date: d, type: 'reminder' as const };
    })
    .filter((t) => t.date > now);
}

export function buildDigestBody(
  reminders: { title: string; amount?: number | null }[],
): string {
  const lines = reminders.map(
    (r) =>
      `${r.title}${r.amount != null ? ` — Rp${r.amount.toLocaleString('id-ID')}` : ''}`,
  );
  return [`📅 ${reminders.length} pengingat hari ini`, ...lines].join('\n');
}

export function buildOverdueBody(reminder: {
  title: string;
  amount?: number | null;
  due_date: string;
}): string {
  const days = differenceInDays(new Date(), new Date(reminder.due_date + 'T00:00:00'));
  const amount = reminder.amount != null
    ? ` — Rp${reminder.amount.toLocaleString('id-ID')}`
    : '';
  return `Terlewat! ${reminder.title}${amount} (${days} hari lewat)`;
}
```

- [ ] **Step 4: Run scheduler tests to verify they pass**

```bash
npx jest tests/lib/notification-scheduler.test.ts --no-cache
```
Expected: PASS.

- [ ] **Step 5: Write the service implementation**

Create `lib/notification-service.ts`:

```typescript
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { NotificationInfo } from './notification-scheduler';
import { Reminder, NotificationPreferences } from '@/types';
import { computeTriggers } from './notification-scheduler';

export interface NotificationProvider {
  schedule(info: NotificationInfo): Promise<void>;
  cancel(reminderId: string): Promise<void>;
  cancelAll(): Promise<void>;
}

export class LocalNotificationProvider implements NotificationProvider {
  async schedule(info: NotificationInfo): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: info.title,
        body: info.body,
        data: info.data,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: info.triggerDate,
      },
    });
  }

  async cancel(reminderId: string): Promise<void> {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const toCancel = scheduled
      .filter((n) => n.content.data?.reminderId === reminderId)
      .map((n) => n.identifier);
    for (const id of toCancel) {
      await Notifications.cancelScheduledNotificationAsync(id);
    }
  }

  async cancelAll(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }
}

export class NotificationService {
  private provider: NotificationProvider;

  constructor(provider: NotificationProvider) {
    this.provider = provider;
  }

  setProvider(provider: NotificationProvider): void {
    this.provider = provider;
  }

  async schedule(info: NotificationInfo): Promise<void> {
    await this.provider.schedule(info);
  }

  async cancel(reminderId: string): Promise<void> {
    await this.provider.cancel(reminderId);
  }

  async cancelAll(): Promise<void> {
    await this.provider.cancelAll();
  }

  async scheduleReminder(
    reminder: Reminder,
    prefs: NotificationPreferences,
  ): Promise<void> {
    await this.cancel(reminder.id);
    const dueDate = new Date(reminder.due_date + 'T00:00:00');
    const triggers = computeTriggers(dueDate, prefs.reminder_schedule, prefs.notification_time);
    for (const t of triggers) {
      await this.schedule({
        title: 'Pengingat',
        body: reminder.title,
        data: { reminderId: reminder.id },
        triggerDate: t.date,
      });
    }
  }

  async rescheduleAll(
    reminders: Reminder[],
    prefs: NotificationPreferences,
  ): Promise<void> {
    await this.cancelAll();
    for (const r of reminders) {
      if (r.status === 'pending') {
        await this.scheduleReminder(r, prefs);
      }
    }
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add lib/notification-scheduler.ts lib/notification-service.ts tests/lib/notification-scheduler.test.ts
git commit -m "feat: add NotificationService with LocalNotificationProvider and scheduler"
```

---

### Task 4: Refactor notifications.ts and useReminders

**Files:**
- Modify: `lib/notifications.ts`
- Modify: `features/reminders/useReminders.ts`

**Interfaces:**
- Consumes: `NotificationService` (from Task 3), `computeState` (from Task 2), `Reminder`, `NotificationPreferences`, `Priority` (from Task 1)
- Produces: Updated `useReminders` hook with priority field in create/update, recurrence links via `parent_reminder_id`

- [ ] **Step 1: Refactor lib/notifications.ts**

Replace the current file content — it becomes a thin initializer that creates and exports the singleton `NotificationService` plus permission/startup helpers:

```typescript
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { NotificationService, LocalNotificationProvider } from './notification-service';
import { logger } from './logger';

// Singleton — created once at app startup
export const notificationService = new NotificationService(new LocalNotificationProvider());

try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch (e) {
  logger.warn('notifications', 'Failed to set notification handler', undefined, e);
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return false;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Pengingat',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  return true;
}
```

- [ ] **Step 2: Update useReminders hook**

In `features/reminders/useReminders.ts`, make these changes:

(a) Update `createReminder` — add `priority` to the insert payload, defaulting to `'normal'`:

In the `createReminder` function, add `priority: reminder.priority || 'normal'` to the insert payload alongside the existing fields.

(b) Update `markAsPaid` — set `parent_reminder_id` on the next occurrence:

In the `markAsPaid` function, when creating the next recurrence row, add `parent_reminder_id: reminder.id` to the insert payload.

(c) Update the `Reminder` type import — the type already includes `priority` and `parent_reminder_id` from Task 1.

(d) Update `scheduleReminderNotification` calls — replace with `notificationService.scheduleReminder()`:

Replace:
```typescript
await scheduleReminderNotification({
  id: newReminder.id,
  title: newReminder.title,
  due_date: newReminder.due_date,
  remind_before_days: newReminder.remind_before_days,
});
```
With:
```typescript
const prefs = await getNotificationPrefs(user!.id);
if (prefs) {
  await notificationService.scheduleReminder(newReminder, prefs);
}
```

Add a helper to fetch prefs at the top of the file (since this hook already imports from `@/lib/supabase`, `@/lib/supabase-safe`, and `@/types`):

```typescript
import { NotificationPreferences } from '@/types';
import { notificationService } from '@/lib/notifications';

async function getNotificationPrefs(userId: string): Promise<NotificationPreferences | null> {
  const { data } = await safeQuerySingle<NotificationPreferences>(
    () => supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single(),
    'getNotificationPrefs',
  );
  return data;
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/notifications.ts features/reminders/useReminders.ts
git commit -m "feat: refactor notifications service and update useReminders with priority and recurrence links"
```

---

### Task 5: Priority UI Components

**Files:**
- Modify: `features/reminders/ReminderForm.tsx` — add priority selector
- Modify: `features/reminders/ReminderCard.tsx` — add priority badge
- Modify: `app/(tabs)/(reminders)/[id].tsx` — add priority detail row

**Interfaces:**
- Consumes: `Priority`, `Reminder` (from Task 1)
- Produces: Priority selector in form, priority label on card, priority row in detail

- [ ] **Step 1: Add priority selector to ReminderForm**

In `features/reminders/ReminderForm.tsx`, make these changes:

(a) Add a `PRIORITY_OPTIONS` constant alongside the existing `CATEGORY_OPTIONS`:

```typescript
const PRIORITY_OPTIONS = [
  { label: 'Critical', value: 'critical' },
  { label: 'High', value: 'high' },
  { label: 'Normal', value: 'normal' },
  { label: 'Low', value: 'low' },
];
```

(b) Add to the Zod schema:

```typescript
priority: z.string(),
```

(c) Add to defaultValues:

```typescript
priority: defaultValues?.priority || 'normal',
```

(d) Add the priority field to the form JSX, after the category field:

```tsx
<Controller
  control={control}
  name="priority"
  render={({ field: { onChange, value } }) => (
    <Select
      label="Prioritas"
      value={value}
      options={PRIORITY_OPTIONS}
      onSelect={onChange}
    />
  )}
/>
```

(e) Include `priority` in the form submit handler's data payload (it already spreads `data`, so `priority` is included).

- [ ] **Step 2: Add priority badge to ReminderCard**

In `features/reminders/ReminderCard.tsx`, add priority display:

(a) Add a priority color map:

```typescript
const priorityColors: Record<string, string> = {
  critical: COLORS.statusCritical,
  high: COLORS.statusWarning,
  normal: COLORS.onSurfaceVariant,
  low: '#9E9E9E',
};
```

(b) In the card JSX, add a priority indicator to the right side, before the status badge. Inside the `row` View:

```tsx
{reminder.priority && reminder.priority !== 'normal' && (
  <View style={[styles.priorityDot, { backgroundColor: priorityColors[reminder.priority] }]} />
)}
```

(c) Add the style:

```typescript
priorityDot: {
  width: 8,
  height: 8,
  borderRadius: 4,
  marginRight: SPACING.sm,
},
```

- [ ] **Step 3: Add priority row to detail screen**

In `app/(tabs)/(reminders)/[id].tsx`, add a priority row in the detail card:

Find the detail card section (the one with Kategori, Tanggal Jatuh Tempo, Jumlah rows). Add a priority row between the amount and recurrence rows:

```tsx
<View style={styles.divider} />
<View style={styles.detailRow}>
  <Text style={styles.detailLabel}>Prioritas</Text>
  <Text style={styles.detailValue}>
    {reminder.priority === 'critical' ? 'Critical' :
     reminder.priority === 'high' ? 'High' :
     reminder.priority === 'low' ? 'Low' : 'Normal'}
  </Text>
</View>
```

- [ ] **Step 4: Commit**

```bash
git add features/reminders/ReminderForm.tsx features/reminders/ReminderCard.tsx app/\(tabs\)/\(reminders\)/\[id\].tsx
git commit -m "feat: add priority selector and display in reminder UI"
```

---

### Task 6: Dashboard Improvements

**Files:**
- Modify: `app/(tabs)/index.tsx`

**Interfaces:**
- Consumes: `Reminder`, `Priority` (from Task 1), `daysRemaining`, `formatCurrency`, `formatDaysRemaining` (existing lib/date.ts)
- Produces: Critical reminders bar, Due-This-Week summary card, priority coloring on cards

- [ ] **Step 1: Add derived data computations**

In `app/(tabs)/index.tsx`, add these computed values after the `summaryItems` array:

```typescript
const criticalReminders = reminders.filter(
  (r) => r.status === 'pending' && r.priority === 'critical',
);

const dueThisWeek = reminders.filter((r) => {
  const days = daysRemaining(r.due_date);
  return r.status === 'pending' && days >= 0 && days <= 7;
});

const dueThisWeekTotal = dueThisWeek.reduce((sum, r) => sum + (r.amount || 0), 0);
```

- [ ] **Step 2: Replace "Akan Jatuh Tempo" summary card with "Due This Week" card**

In the `summaryItems` array, replace the `'Akan Jatuh Tempo'` item:

Old:
```typescript
{
  label: 'Akan Jatuh Tempo',
  value: reminders.filter((r) => {
    const days = daysRemaining(r.due_date);
    return r.status === 'pending' && days >= 0 && days <= 7;
  }).length.toString(),
  icon: 'alarm',
  color: COLORS.statusCritical,
},
```

New:
```typescript
{
  label: 'Jatuh Tempo Minggu Ini',
  value: `${dueThisWeek.length} · ${formatCurrency(dueThisWeekTotal)}`,
  icon: 'alarm',
  color: COLORS.statusCritical,
},
```

- [ ] **Step 3: Add Critical Reminders bar**

Add after the summary grid and before the "Segera Jatuh Tempo" section title. Only renders when there are critical reminders:

```tsx
{criticalReminders.length > 0 && (
  <>
    <Text style={[styles.sectionTitle, { color: COLORS.statusCritical }]}>
      ⚠ Prioritas Critical
    </Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.criticalScroll}>
      {criticalReminders.map((item) => (
        <TouchableOpacity
          key={item.id}
          onPress={() => router.push(`/(tabs)/(reminders)/${item.id}`)}
          activeOpacity={0.7}
        >
          <Card style={styles.criticalCard}>
            <Text style={styles.criticalTitle}>{item.title}</Text>
            <Text style={styles.criticalDate}>{formatDate(item.due_date)}</Text>
            {item.amount && (
              <Text style={styles.criticalAmount}>{formatCurrency(item.amount)}</Text>
            )}
          </Card>
        </TouchableOpacity>
      ))}
    </ScrollView>
  </>
)}
```

Add styles:
```typescript
criticalScroll: {
  marginBottom: SPACING.lg,
},
criticalCard: {
  width: 160,
  marginRight: SPACING.sm,
  backgroundColor: COLORS.statusCritical + '08',
  borderWidth: 1,
  borderColor: COLORS.statusCritical + '30',
},
criticalTitle: {
  ...TYPOGRAPHY.title,
  color: COLORS.statusCritical,
},
criticalDate: {
  ...TYPOGRAPHY.body,
  color: COLORS.onSurfaceVariant,
  marginTop: 2,
},
criticalAmount: {
  ...TYPOGRAPHY.amount,
  color: COLORS.statusCritical,
  marginTop: 4,
},
```

- [ ] **Step 4: Commit**

```bash
git add app/\(tabs\)/index.tsx
git commit -m "feat: add critical reminders bar and due-this-week summary to dashboard"
```

---

### Task 7: Settings Page — Notification Preferences

**Files:**
- Modify: `app/(tabs)/pengaturan.tsx`

**Interfaces:**
- Consumes: `NotificationPreferences` (from Task 1), `NotificationService.rescheduleAll()` (from Task 3), `Reminder[]` (existing)
- Produces: Notification preferences card with save/reschedule logic

- [ ] **Step 1: Add notification preferences card**

In `app/(tabs)/pengaturan.tsx`, after the imports, add:

```typescript
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { safeQuerySingle } from '@/lib/supabase-safe';
import { NotificationPreferences } from '@/types';
import { useReminders } from '@/features/reminders/useReminders';
import { notificationService } from '@/lib/notifications';
import Switch from '@/components/ui/Switch'; // or a simple Toggle component
import { Switch as RNSwitch } from 'react-native';
```

Add state and fetch logic inside the component:

```typescript
const { reminders } = useReminders();
const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
const [prefsLoading, setPrefsLoading] = useState(true);

useEffect(() => {
  loadPrefs();
}, []);

const loadPrefs = async () => {
  if (!user) return;
  const { data } = await safeQuerySingle<NotificationPreferences>(
    () => supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single(),
    'loadPrefs',
  );
  setPrefs(data);
  setPrefsLoading(false);
};

const updatePref = async (key: string, value: any) => {
  if (!user || !prefs) return;
  const { error } = await supabase
    .from('notification_preferences')
    .update({ [key]: value })
    .eq('user_id', user.id);
  if (!error) {
    setPrefs({ ...prefs, [key]: value });
    // Reschedule all notifications with new preferences
    await notificationService.rescheduleAll(reminders, { ...prefs, [key]: value });
  }
};
```

Add the notification preferences card after the profile card, before the menu settings card:

```tsx
{!prefsLoading && prefs && (
  <Card style={styles.sectionCard}>
    <Text style={styles.sectionTitle}>Notifikasi</Text>

    <View style={styles.prefRow}>
      <Text style={styles.prefLabel}>Waktu pengingat</Text>
      <Text style={styles.prefValue}>{prefs.notification_time}</Text>
    </View>
    <View style={styles.divider} />

    <View style={styles.prefRow}>
      <Text style={styles.prefLabel}>Gabung notifikasi</Text>
      <RNSwitch
        value={prefs.grouping_enabled}
        onValueChange={(v) => updatePref('grouping_enabled', v)}
        trackColor={{ false: COLORS.outline, true: COLORS.primaryContainer }}
        thumbColor={prefs.grouping_enabled ? COLORS.primary : COLORS.onSurfaceVariant}
      />
    </View>
    <View style={styles.divider} />

    <View style={styles.prefRow}>
      <Text style={styles.prefLabel}>Pengingat akhir pekan</Text>
      <RNSwitch
        value={prefs.weekend_reminders}
        onValueChange={(v) => updatePref('weekend_reminders', v)}
        trackColor={{ false: COLORS.outline, true: COLORS.primaryContainer }}
        thumbColor={prefs.weekend_reminders ? COLORS.primary : COLORS.onSurfaceVariant}
      />
    </View>
    <View style={styles.divider} />

    <View style={styles.prefRow}>
      <Text style={styles.prefLabel}>Frekuensi pengingat terlewat</Text>
      <Text style={styles.prefValue}>
        {prefs.overdue_frequency === 'daily' ? 'Setiap hari' :
         prefs.overdue_frequency === 'every_other_day' ? '2 hari sekali' :
         prefs.overdue_frequency === 'weekly' ? 'Mingguan' : 'Tidak ada'}
      </Text>
    </View>
  </Card>
)}
```

Add styles:
```typescript
sectionTitle: {
  ...TYPOGRAPHY.title,
  color: COLORS.onSurface,
  marginBottom: SPACING.md,
},
prefRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingVertical: SPACING.sm,
},
prefLabel: {
  ...TYPOGRAPHY.body,
  color: COLORS.onSurface,
  flex: 1,
},
prefValue: {
  ...TYPOGRAPHY.body,
  color: COLORS.onSurfaceVariant,
},
```

Remove the old placeholder notification menu item from the `sectionCard` below. Specifically, remove this block:

```tsx
<View style={styles.menuItem}>
  <Ionicons name="notifications-outline" size={22} color={COLORS.onSurfaceVariant} />
  <View style={styles.menuContent}>
    <Text style={styles.menuLabel}>Notifikasi</Text>
    <Text style={styles.menuDesc}>Kelola pengaturan notifikasi</Text>
  </View>
</View>
<View style={styles.divider} />
```

- [ ] **Step 2: Commit**

```bash
git add app/\(tabs\)/pengaturan.tsx
git commit -m "feat: add notification preferences settings with save and reschedule"
```
