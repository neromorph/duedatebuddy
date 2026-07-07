# Logging & Error Handling Architecture

**Date:** 2026-07-06  
**Status:** Draft  
**Project:** DueDateBuddy

---

## Overview

A centralized logging and error handling system for the DueDateBuddy Expo application. Designed for personal use but following production best practices: simple, maintainable, scalable, not overengineered.

The architecture has three layers:

```
Feature Code (screens, hooks, features)
       ↓
 Logging ────────────── Error Handling ────────────── UI
 (lib/logger.ts)        (lib/errors.ts,              (ErrorBoundary, 
                         lib/supabase-safe.ts,         ErrorState,
                         lib/error-handler.ts,         useAsync)
                         hooks/useAsync.ts)
       ↓
Sentry plug-in (future, one-line toggle in logger.ts)
```

---

## Files & Responsibilities

### `lib/errors.ts` — Typed Error Hierarchy

- `AppError` — abstract base class with `code: string`, `message: string`, `cause?: unknown`. All error types extend this.
- `DatabaseError` — wraps Supabase query/mutation failures. Carries `code`, `details`, `hint`, `message` from the Supabase error response.
- `NetworkError` — wraps network-level failures: offline, timeout, unreachable server.
- `AuthenticationError` — wraps auth failures (session expired, invalid credentials).
- `ValidationError` — wraps schema validation errors (zod parse failures). **Not logged** as application errors — handled in-UI through react-hook-form.
- `UnknownError` — catch-all for unexpected exceptions.

### `lib/logger.ts` — Centralized Logger

Single object with methods: `debug()`, `info()`, `warn()`, `error()`.

**Development mode** (`__DEV__`):
- Timestamped console output with emoji prefixes for visual scanning
- Optional context object rendered as formatted JSON
- All levels enabled

**Production mode**:
- `debug()` and `info()` silent (no-op)
- `warn()` and `error()` produce clean console output
- `error()` also captures metadata for future Sentry piping

**Sentry readiness:**
- `logger.setSentryEnabled(true)` enables a `sentryCallback` that receives `(level, message, context)`
- Feature code never imports or references Sentry
- Only logger knows about the logging provider
- Adding Sentry = implement the callback, call `setSentryEnabled(true)` in app startup

### `lib/supabase-safe.ts` — Supabase Query Helpers

Wraps raw Supabase client calls with consistent error handling.

**Pattern eliminated:**
```typescript
const { data, error } = await supabase.from('table').select('*');
if (error) throw error;
```

**Replaced by:**
```typescript
const result = await safeQuery(() => supabase.from('table').select('*'));
// result: { data: T[] | null; error: DatabaseError | null }
```

Or for single-row:
```typescript
const result = await safeQuerySingle(...)
```

Key behaviors:
- Wraps Supase errors in `DatabaseError` with code, details, hint, message
- Logs the failure through `logger.error()`
- Returns `{ data, error }` — caller chooses how to handle (throw, show message, fallback)

### `lib/error-handler.ts` — User-Friendly Error Messages

Single function: `getErrorMessage(error: unknown): string`

Maps error types to Indonesian user messages:
| Error type | Message |
|---|---|
| `NetworkError` | "Koneksi internet terputus. Periksa koneksi Anda." |
| `DatabaseError` | "Gagal memuat data. Silakan coba lagi." |
| `AuthenticationError` | "Sesi berakhir. Silakan masuk lagi." |
| `ValidationError` | — not handled here, stays in form validation |
| Generic `AppError` | Uses the error's own `message` |
| Anything else | "Terjadi kesalahan. Silakan coba lagi." |

No raw SQL, stack traces, or internal messages leak to users.

### `hooks/useAsync.ts` — Generic Async Hook

Eliminates the repeated `useState + useCallback + try/catch + finally` pattern.

```typescript
function useAsync<T>(asyncFn: () => Promise<T>): {
  data: T | null;
  loading: boolean;
  error: string | null;
  execute: () => Promise<void>;
  setData: (data: T) => void;
  reset: () => void;
}
```

**Replaces** the 12-line boilerplate in `useAssets`, `useReminders`, DashboardScreen with a 4-line call:
```typescript
const { data, loading, error, execute } = useAsync(fetchAssets);
```

Also provides `useAsyncCallback` — a lighter variant for one-shot operations (create, update, delete) that returns `{ execute, loading, error }`.

### `components/ErrorBoundary.tsx` — Global Error Boundary

React class component wrapping the app root.

- Catches rendering errors
- Logs them through `logger.error()`
- Shows clean fallback UI with "Terjadi kesalahan" message, retry button
- Does not use hooks (class component required by React error boundary API)

Placed in `app/_layout.tsx` wrapping `<Slot />`.

---

## Integration with Existing Code

### Refactoring targets

| File | What changes |
|---|---|
| `app/_layout.tsx` | Add ErrorBoundary. Replace `console.error/warn` with logger. |
| `lib/notifications.ts` | Replace `console.warn` with logger. |
| `lib/supabase.ts` | No changes — exports raw client. `supabase-safe.ts` imports it. |
| `features/assets/useAssets.ts` | Use `useAsync` internally. Use `safeQuery` for supabase calls. Use `DatabaseError` wrapping. |
| `features/reminders/useReminders.ts` | Same as above. |
| `features/auth/useAuth.ts` | Wrap auth calls with `AuthenticationError`. Add logging. |
| `app/(tabs)/index.tsx` (Dashboard) | Move inline Supabase query to `safeQuery`. Use `useAsync`. |
| `components/ui/ErrorState.tsx` | No changes needed — it already takes a `message: string` and optional `onRetry`. Works with `getErrorMessage()`. |

### What stays the same

- `app/(tabs)/(assets)/index.tsx` — already uses `useAssets()`, minimal changes
- `app/(tabs)/(reminders)/index.tsx` — already uses `useReminders()`, minimal changes
- Form validation (zod + react-hook-form) — stays separate, validation errors never logged
- UI components (Card, Button, Input, etc.) — unchanged
- `lib/theme.ts`, `lib/date.ts` — unchanged

---

## Data Flow

### Logging flow
```
Feature code → logger.info/warn/error(logger name, message, context?)
                ↓
           __DEV__ ? pretty console output : minimal console output
                ↓
           (future) sentryCallback when setSentryEnabled(true)
```

### Error flow
```
Error occurs (supabase error, network failure, unexpected throw)
       ↓
  Wrapped in typed AppError subclass (errors.ts)
       ↓
  Logged via logger.error() (logger.ts)
       ↓
  If user-facing → getErrorMessage() (error-handler.ts)
       ↓
  Displayed via ErrorState component or in-UI message
```

### Async operation flow
```
Component calls execute() on useAsync hook
       ↓
  Sets loading=true
       ↓
  Runs async function
       ↓
  On success: data set, loading=false, error=null
  On error: wrapped in typed error, logged, user message set on error
```

---

## Future Sentry Integration

When ready to add Sentry:

1. Install `@sentry/react-native`
2. In `lib/logger.ts`, add:
```typescript
export function setSentryEnabled(enabled: boolean) {
  sentryEnabled = enabled;
}
```
3. Pass logger metadata to Sentry inside the `error()` method:
```typescript
if (sentryEnabled && Sentry) {
  Sentry.captureException(error, { tags: { code }, contexts: { ... } });
}
```
4. Call `setSentryEnabled(true)` once at app startup

No feature code changes needed.
