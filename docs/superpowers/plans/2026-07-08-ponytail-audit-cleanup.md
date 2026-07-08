# Ponytail Audit Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove dead code and unnecessary abstraction found by the ponytail audit without changing app behavior.

**Architecture:** Keep runtime exports stable where possible. Flatten the notification provider/service classes into plain functions while preserving the existing `notificationService.method(...)` caller shape. Delete only code proven unused or shorter after checking call sites.

**Tech Stack:** Expo Router, React Native, TypeScript, `expo-notifications`, `date-fns`, Supabase client helpers.

## Global Constraints

- No new dependencies.
- No new notification features.
- No new UI behavior.
- No broad UI cleanup beyond `components/ui/DatePicker.tsx`.
- Do not refactor historical specs or plans; only update active docs that advertise current runtime helpers.
- Do not use `console.*`.
- Preserve current error propagation unless adding a catch block is required; if a new catch block is added, log through `lib/logger.ts`.
- Validate with `npm run typecheck`.

---

## File Structure

- `hooks/useAsync.ts` — delete if source still has no imports.
- `docs/logging-error-handling.md` — remove or rewrite the active `useAsync` section so docs match current runtime code.
- `lib/date.ts` — trim unused `date-fns` imports only.
- `lib/notification-service.ts` — replace one-implementation classes with plain functions and an object-shaped `notificationService` export.
- `lib/notifications.ts` — update imports/exports so existing callers can keep importing `notificationService` from this module.
- `components/ui/DatePicker.tsx` — delete only if still one caller and inlining is shorter.
- `features/reminders/ReminderForm.tsx` — inline date picker only if `DatePicker.tsx` is deleted.

---

### Task 1: Delete the Unused `useAsync` Hook and Active Docs Reference

**Files:**
- Delete: `hooks/useAsync.ts`
- Modify: `docs/logging-error-handling.md`

**Interfaces:**
- Consumes: current source import graph.
- Produces: no `hooks/useAsync.ts` runtime helper; active docs no longer instruct developers to import it.

- [ ] **Step 1: Confirm source has no `useAsync` callers**

Run:

```bash
rg "useAsync" app components features hooks lib
```

Expected current output before deletion:

```text
hooks/useAsync.ts
1:// hooks/useAsync.ts
13:export function useAsync<T>(
```

If any file outside `hooks/useAsync.ts` appears, stop and do not delete the hook in this task.

- [ ] **Step 2: Delete the hook file**

Run:

```bash
rm hooks/useAsync.ts
```

- [ ] **Step 3: Update active logging docs**

Open `docs/logging-error-handling.md` and remove the section that starts with:

```markdown
## `useAsync` Hook (`hooks/useAsync.ts`)
```

Replace that whole section with:

```markdown
## Async State

There is no shared async hook at the moment. Keep feature async state local unless two or more screens need the same helper.
```

Do not edit historical files under `docs/superpowers/specs/` or `docs/superpowers/plans/` for this cleanup.

- [ ] **Step 4: Verify the deleted helper is gone from active runtime and active docs**

Run:

```bash
rg "useAsync" app components features hooks lib docs/logging-error-handling.md
```

Expected: no output.

- [ ] **Step 5: Commit Task 1**

Run:

```bash
git add -A hooks/useAsync.ts docs/logging-error-handling.md
git commit -m "chore: remove unused async hook"
```

Expected: commit succeeds.

---

### Task 2: Trim Unused Date Imports

**Files:**
- Modify: `lib/date.ts`

**Interfaces:**
- Consumes: existing exported functions `formatDate`, `formatCurrency`, `daysRemaining`, `isOverdue`, `isThisMonth`, `getIndonesianMonthName`, `formatDaysRemaining`.
- Produces: same exports and behavior with fewer imports.

- [ ] **Step 1: Confirm unused imports**

Run:

```bash
rg "formatDistanceToNow|startOfMonth|endOfMonth|isAfter" lib/date.ts app components features hooks lib
```

Expected current output includes only the import line in `lib/date.ts`.

- [ ] **Step 2: Replace the `date-fns` import**

In `lib/date.ts`, replace:

```ts
import { format, formatDistanceToNow, isBefore, isSameMonth, parseISO, startOfMonth, endOfMonth, isAfter } from 'date-fns';
```

with:

```ts
import { format, isBefore, isSameMonth, parseISO } from 'date-fns';
```

- [ ] **Step 3: Typecheck the date module change**

Run:

```bash
npm run typecheck
```

Expected: TypeScript exits with code 0.

- [ ] **Step 4: Commit Task 2**

Run:

```bash
git add lib/date.ts
git commit -m "chore: trim unused date imports"
```

Expected: commit succeeds.

---

### Task 3: Flatten Notification Service Classes

**Files:**
- Modify: `lib/notification-service.ts`
- Modify: `lib/notifications.ts`

**Interfaces:**
- Consumes: `NotificationInfo` from `lib/notification-scheduler.ts`, `Reminder` and `NotificationPreferences` from `types`, `computeTriggers` from `lib/notification-scheduler.ts`.
- Produces:
  - `schedule(info: NotificationInfo): Promise<void>`
  - `cancel(reminderId: string): Promise<void>`
  - `cancelAll(): Promise<void>`
  - `scheduleReminder(reminder: Reminder, prefs: NotificationPreferences): Promise<void>`
  - `rescheduleAll(reminders: Reminder[], prefs: NotificationPreferences): Promise<void>`
  - `notificationService` object with those five functions.

- [ ] **Step 1: Replace `lib/notification-service.ts` class stack with functions**

Replace the full contents of `lib/notification-service.ts` with:

```ts
import * as Notifications from 'expo-notifications';
import { NotificationInfo, computeTriggers } from './notification-scheduler';
import { Reminder, NotificationPreferences } from '@/types';

export async function schedule(info: NotificationInfo): Promise<void> {
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

export async function cancel(reminderId: string): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const toCancel = scheduled
    .filter((n) => n.content.data?.reminderId === reminderId)
    .map((n) => n.identifier);

  for (const id of toCancel) {
    await Notifications.cancelScheduledNotificationAsync(id);
  }
}

export async function cancelAll(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function scheduleReminder(
  reminder: Reminder,
  prefs: NotificationPreferences,
): Promise<void> {
  await cancel(reminder.id);
  const dueDate = new Date(reminder.due_date + 'T00:00:00');
  const triggers = computeTriggers(dueDate, prefs.reminder_schedule, prefs.notification_time);

  for (const t of triggers) {
    await schedule({
      title: 'Pengingat',
      body: reminder.title,
      data: { reminderId: reminder.id },
      triggerDate: t.date,
    });
  }
}

export async function rescheduleAll(
  reminders: Reminder[],
  prefs: NotificationPreferences,
): Promise<void> {
  await cancelAll();

  for (const reminder of reminders) {
    if (reminder.status === 'pending') {
      await scheduleReminder(reminder, prefs);
    }
  }
}

export const notificationService = {
  schedule,
  cancel,
  cancelAll,
  scheduleReminder,
  rescheduleAll,
};
```

- [ ] **Step 2: Update `lib/notifications.ts` notification service import/export**

In `lib/notifications.ts`, replace:

```ts
import { NotificationService, LocalNotificationProvider } from './notification-service';
```

with:

```ts
export { notificationService } from './notification-service';
```

Then delete this line:

```ts
export const notificationService = new NotificationService(new LocalNotificationProvider());
```

Keep the rest of `lib/notifications.ts` unchanged.

- [ ] **Step 3: Verify removed class symbols are gone from source**

Run:

```bash
rg "NotificationService|LocalNotificationProvider|NotificationProvider" app components features hooks lib
```

Expected: no output.

- [ ] **Step 4: Verify existing notification call sites still resolve**

Run:

```bash
rg "notificationService" app features lib
```

Expected: existing app and feature call sites still import from `@/lib/notifications` and call methods such as `notificationService.scheduleReminder(...)`, `notificationService.rescheduleAll(...)`, and `notificationService.cancel(...)`.

- [ ] **Step 5: Typecheck notification cleanup**

Run:

```bash
npm run typecheck
```

Expected: TypeScript exits with code 0.

- [ ] **Step 6: Commit Task 3**

Run:

```bash
git add lib/notification-service.ts lib/notifications.ts
git commit -m "chore: flatten notification service"
```

Expected: commit succeeds.

---

### Task 4: Decide and Apply the DatePicker Cleanup

**Files:**
- Maybe delete: `components/ui/DatePicker.tsx`
- Maybe modify: `features/reminders/ReminderForm.tsx`

**Interfaces:**
- Consumes: `ReminderForm` `Controller` field `due_date` with `value: Date` and `onChange(date: Date)`.
- Produces: either unchanged `DatePicker` wrapper, or inlined date picker UI in `ReminderForm` with no `DatePicker` import.

- [ ] **Step 1: Confirm `DatePicker` call sites**

Run:

```bash
rg "DatePicker" app components features hooks lib
```

Expected current output:

```text
components/ui/DatePicker.tsx
features/reminders/ReminderForm.tsx
```

If any additional real caller appears, skip deletion and go to Step 6.

- [ ] **Step 2: Compare likely diff size before editing**

Run:

```bash
wc -l components/ui/DatePicker.tsx features/reminders/ReminderForm.tsx
```

Expected: `DatePicker.tsx` is about 107 lines. Inlining should delete that file and add fewer than 40 lines to `ReminderForm.tsx`. If it would add more than that, skip deletion and go to Step 6.

- [ ] **Step 3: Inline the picker imports in `ReminderForm.tsx`**

In `features/reminders/ReminderForm.tsx`, replace:

```ts
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
```

with:

```ts
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
```

Then remove:

```ts
import DatePicker from '@/components/ui/DatePicker';
```

- [ ] **Step 4: Add local date picker state and handler inside `ReminderForm`**

Inside `ReminderForm`, after:

```ts
  const selectedDays = watch('remind_before_days');
```

add:

```ts
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleDateChange = (
    onChange: (date: Date) => void,
    _: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      onChange(selectedDate);
    }
  };
```

- [ ] **Step 5: Replace `DatePicker` JSX with inline JSX**

In `features/reminders/ReminderForm.tsx`, replace:

```tsx
      <Controller
        control={control}
        name="due_date"
        render={({ field: { onChange, value } }) => (
          <DatePicker
            label="Tanggal Jatuh Tempo"
            value={value}
            onChange={onChange}
            error={errors.due_date?.message}
          />
        )}
      />
```

with:

```tsx
      <Controller
        control={control}
        name="due_date"
        render={({ field: { onChange, value } }) => (
          <View style={styles.field}>
            <Text style={styles.label}>Tanggal Jatuh Tempo</Text>
            <TouchableOpacity
              style={[styles.dateTrigger, errors.due_date && styles.dateTriggerError]}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.dateText}>{formatDate(value, 'dd MMMM yyyy')}</Text>
            </TouchableOpacity>
            {errors.due_date?.message && (
              <Text style={styles.error}>{errors.due_date.message}</Text>
            )}

            {showDatePicker && (
              <DateTimePicker
                value={value}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selectedDate) => handleDateChange(onChange, event, selectedDate)}
              />
            )}

            {Platform.OS === 'ios' && showDatePicker && (
              <TouchableOpacity
                style={styles.doneButton}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.doneText}>Selesai</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
```

Also add this import near the other lib imports:

```ts
import { formatDate } from '@/lib/date';
```

- [ ] **Step 6: Add inline styles or record skip**

If Steps 3-5 were applied, add these style entries to the `StyleSheet.create({ ... })` object in `features/reminders/ReminderForm.tsx`:

```ts
  field: {
    marginBottom: SPACING.lg,
  },
  label: {
    ...TYPOGRAPHY.label,
    color: COLORS.onSurfaceVariant,
    marginBottom: SPACING.xs,
  },
  dateTrigger: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.outline,
    borderRadius: 12,
    padding: SPACING.md + 2,
    minHeight: 48,
    justifyContent: 'center',
  },
  dateTriggerError: {
    borderColor: COLORS.statusCritical,
  },
  dateText: {
    ...TYPOGRAPHY.body,
    color: COLORS.onSurface,
  },
  error: {
    ...TYPOGRAPHY.label,
    color: COLORS.statusCritical,
    marginTop: SPACING.xs,
  },
  doneButton: {
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 12,
    marginTop: SPACING.xs,
  },
  doneText: {
    ...TYPOGRAPHY.title,
    color: COLORS.primary,
  },
```

Then delete the wrapper:

```bash
rm components/ui/DatePicker.tsx
```

If deletion was skipped, do not edit `ReminderForm.tsx`; instead commit an empty note is not needed. Continue to Task 5 and report the skip in the final summary.

- [ ] **Step 7: Verify DatePicker cleanup**

If deleted, run:

```bash
rg "DatePicker" app components features hooks lib
npm run typecheck
```

Expected: `rg` has no output, and TypeScript exits with code 0.

If skipped, run:

```bash
npm run typecheck
```

Expected: TypeScript exits with code 0.

- [ ] **Step 8: Commit Task 4 if files changed**

If deleted/inlined, run:

```bash
git add -A components/ui/DatePicker.tsx features/reminders/ReminderForm.tsx
git commit -m "chore: inline single-use date picker"
```

Expected: commit succeeds.

If skipped, do not create an empty commit.

---

### Task 5: Final Verification

**Files:**
- No planned source edits.

**Interfaces:**
- Consumes: all prior tasks.
- Produces: verified cleanup matching the design acceptance criteria.

- [ ] **Step 1: Run full typecheck**

Run:

```bash
npm run typecheck
```

Expected: TypeScript exits with code 0.

- [ ] **Step 2: Verify deleted symbols are absent from active runtime code**

Run:

```bash
rg "useAsync|NotificationService|LocalNotificationProvider|NotificationProvider" app components features hooks lib docs/logging-error-handling.md
```

Expected: no output.

- [ ] **Step 3: Verify DatePicker acceptance criterion**

Run:

```bash
rg "DatePicker" app components features hooks lib
```

Expected either:

- no output, if Task 4 deleted it; or
- output limited to `components/ui/DatePicker.tsx` and `features/reminders/ReminderForm.tsx`, if Task 4 intentionally skipped deletion because it was not a net simplification.

- [ ] **Step 4: Inspect final diff**

Run:

```bash
git status --short
git log --oneline -5
```

Expected: clean working tree, recent commits for completed tasks.

- [ ] **Step 5: Final summary**

Report:

```text
Implemented ponytail audit cleanup.
Validation: npm run typecheck passed.
Deleted: hooks/useAsync.ts.
Flattened: notification service classes into functions with notificationService object export preserved.
DatePicker: deleted and inlined, or intentionally kept because deletion was not a net simplification.
```

Do not claim DatePicker was deleted unless `rg "DatePicker" app components features hooks lib` confirms no output.

---

## Self-Review

- Spec coverage: all four audit findings are covered by Tasks 1-4; validation is covered by Task 5.
- Placeholder scan: no `TBD`, `TODO`, or unspecified implementation steps remain.
- Type consistency: notification function names match the preserved `notificationService` object export; DatePicker steps use existing `ReminderForm` field shape and `formatDate` helper.
