# Ponytail Audit Cleanup Design

Date: 2026-07-08

## Goal

Prepare implementation of the ponytail audit findings with the smallest safe cleanup. The work should reduce dead code and unnecessary abstraction without changing app behavior.

## Scope

Implement the four audit findings:

1. Remove unused `hooks/useAsync.ts`.
2. Remove unused imports from `lib/date.ts`.
3. Flatten the one-implementation notification service abstraction.
4. Evaluate `components/ui/DatePicker.tsx` for deletion by inlining its single use if that is a net simplification.

Out of scope:

- New notification features.
- New UI behavior.
- New dependencies.
- Broad UI component cleanup beyond `DatePicker`.
- Refactoring unrelated docs or historical implementation plans.

## Approach

Use the audit-complete cleanup approach, with one guard: the DatePicker change only proceeds if checking call sites shows that deleting the wrapper is still a net deletion and keeps the form readable.

## Planned Changes

### `hooks/useAsync.ts`

Remove the hook because current source code has no caller. Update active project documentation that advertises it, especially `docs/logging-error-handling.md`, so the docs do not point to deleted runtime code.

Historical specs and plans may keep old references because they document past decisions, not current runtime API.

### `lib/date.ts`

Remove unused `date-fns` imports: `formatDistanceToNow`, `startOfMonth`, `endOfMonth`, and `isAfter` if they remain unused at implementation time.

No date behavior should change.

### Notifications

Replace the `NotificationProvider`, `LocalNotificationProvider`, and `NotificationService` class stack with plain functions that call `expo-notifications` directly.

Keep the caller diff small by preserving the existing object-shaped export:

```ts
export const notificationService = {
  schedule,
  cancel,
  cancelAll,
  scheduleReminder,
  rescheduleAll,
};
```

This deletes the abstraction while avoiding churn in existing screens and hooks that already call `notificationService.scheduleReminder(...)` and related methods.

### `components/ui/DatePicker.tsx`

Before changing it, confirm current call sites. If it still has only one real caller and inlining into `ReminderForm` is shorter and clear, inline the picker and delete the wrapper file.

If inlining makes `ReminderForm` meaningfully noisier or the wrapper has gained more callers, leave `DatePicker` in place and note that the audit item was intentionally skipped.

## Data Flow

Notification flow after cleanup:

1. Feature code calls `notificationService.scheduleReminder(reminder, prefs)`.
2. `scheduleReminder` cancels existing reminder notifications.
3. It computes triggers with `computeTriggers`.
4. It schedules each local notification through `expo-notifications`.

This keeps current behavior while removing provider indirection.

## Error Handling

Do not add new user-facing errors. Preserve current thrown/rejected behavior from `expo-notifications` so existing callers continue handling failures the same way.

Do not introduce `console.*`. If implementation adds new catch blocks, log runtime errors through `lib/logger.ts`; otherwise keep existing propagation.

## Validation

Run:

```bash
npm run typecheck
```

Then grep for removed symbols:

```bash
rg "useAsync|NotificationService|LocalNotificationProvider"
```

If `DatePicker` is deleted, also run:

```bash
rg "DatePicker"
```

Confirm active docs do not reference deleted runtime helpers. Existing historical specs/plans may still mention them.

## Risks

- Flattening notifications could accidentally change exported names. Preserve `notificationService` object to avoid that.
- Deleting `useAsync` requires updating active docs so future work does not import it again.
- Inlining `DatePicker` may save a file but make `ReminderForm` harder to read. Only do it if the final diff is clearly smaller and simpler.

## Acceptance Criteria

- App typechecks.
- No source imports `hooks/useAsync.ts`.
- No source references `NotificationService` or `LocalNotificationProvider`.
- Notification call sites continue using the same behavior.
- DatePicker is either deleted with all imports removed, or explicitly left because deletion was not a net simplification.
