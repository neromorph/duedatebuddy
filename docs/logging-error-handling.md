# Logging & Error Handling

## Logger (`lib/logger.ts`)

```typescript
import { logger } from '@/lib/logger';

logger.debug('feature', 'message');    // dev only
logger.info('feature', 'message');     // dev only
logger.warn('feature', 'message');     // dev + prod
logger.error('feature', 'message', contextObj, error);
```

**Naming:** First param is the feature/module name (e.g. `'auth'`, `'reminders'`, `'dashboard'`).
**Context:** Third param is optional `Record<string, unknown>` for structured metadata.
**Error:** Fourth param is the original error object for future Sentry piping.

### Future Sentry Setup

```typescript
import { setSentryEnabled } from '@/lib/logger';

// In app startup (once):
setSentryEnabled(true, (level, message, context, error) => {
  if (level === 'error' && error) Sentry.captureException(error, { ... });
});
```

No feature code changes needed — only `lib/logger.ts` touches Sentry.

---

## Error Classes (`lib/errors.ts`)

| Class | When to throw |
|---|---|
| `AppError` | Abstract base — extend this, don't throw directly |
| `DatabaseError` | Supabase query/mutation failures |
| `NetworkError` | Network offline, timeout, server unreachable |
| `AuthenticationError` | Auth failures, expired sessions |
| `ValidationError` | Zod schema parse failures (not logged as app errors) |
| `UnknownError` | Catch-all for unexpected exceptions |

```typescript
import { DatabaseError, isAppError } from '@/lib/errors';

throw new DatabaseError('Failed to load data', {
  code: 'PGRST301',
  details: '...',
  hint: '...',
});

if (isAppError(err)) {
  console.log(err.code); // typed access
}
```

---

## Supabase Safe Helpers (`lib/supabase-safe.ts`)

```typescript
import { safeQuery, safeQuerySingle } from '@/lib/supabase-safe';

// Multi-row result
const { data, error } = await safeQuery<Reminder>(
  () => supabase.from('reminders').select('*'),
  'fetchReminders',
);

// Single row result
const { data, error } = await safeQuerySingle<Asset>(
  () => supabase.from('assets').insert({...}).select().single(),
  'createAsset',
);
```

Both helpers:
- Wrap PostgrestError in `DatabaseError` (carries code, details, hint)
- Log failures through `logger.error()`
- Never throw — return `{ data, error }` for caller to handle
- Accept an optional name string for log identification

---

## Error Display (`lib/error-handler.ts`)

```typescript
import { getErrorMessage, getErrorCode } from '@/lib/error-handler';

catch (err) {
  setError(getErrorMessage(err));  // "Koneksi internet terputus..."
}
```

Message map:

| Error type | User message |
|---|---|
| `NetworkError` | "Koneksi internet terputus. Periksa koneksi Anda." |
| `DatabaseError` | "Gagal memuat data. Silakan coba lagi." |
| `AuthenticationError` | "Sesi berakhir. Silakan masuk lagi." |
| Other `AppError` | Uses the error's own `message` |
| Generic `Error` | "Terjadi kesalahan. Silakan coba lagi." |

No raw SQL, stack traces, or internal messages leak to users.

---

## `useAsync` Hook (`hooks/useAsync.ts`)

```typescript
import { useAsync } from '@/hooks/useAsync';

const { data, loading, error, execute, setData, reset } = useAsync(fetchFn, initialData);
```

Eliminates the `useState`/`useCallback`/`try/catch` boilerplate. Calls `getErrorMessage()` automatically on failure.

---

## ErrorBoundary (`components/ErrorBoundary.tsx`)

Wraps `<Slot />` in root layout (`app/_layout.tsx`). Catches unhandled rendering errors, logs them through `logger.error()`, and shows a clean fallback UI with retry button.

---

## Best Practices

1. **Log every catch.** Every caught exception must either be logged, rethrown, or converted to a user message.
2. **No raw console.\*.** Always use `logger.*`.
3. **Validate separately.** Zod + React Hook Form for validation. Never log validation errors as app errors.
4. **Supabase always through safeQuery.** Never call `supabase.from().select()` directly in feature code — always use `safeQuery` / `safeQuerySingle`.
5. **User-friendly messages.** Never expose raw error messages to users. Use `getErrorMessage()`.
6. **No Sentry in feature code.** Only `lib/logger.ts` knows about the logging provider.
