# Logging & Error Handling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace ad-hoc `console.log`/`e.message` patterns with a centralized logger, typed error hierarchy, Supabase query helpers, global ErrorBoundary, and `useAsync` hook — all ready for future Sentry integration.

**Architecture:** Three-layer design: (1) typed error classes + centralized logger at the base, (2) Supabase-safe wrappers + error-handler mapping + `useAsync` hook in the middle, (3) ErrorBoundary and refactored feature code at the top. Feature code never calls `console.*`, never leaks raw errors, and never imports Sentry directly.

**Tech Stack:** Expo 57, React Native 0.86, TypeScript 6, Supabase JS v2, Expo Router, Zustand, Zod, React Hook Form

## Global Constraints

- No direct `console.log/warn/error` calls in feature code, screens, or hooks — all logging through `lib/logger.ts`
- No raw database/Supabase error messages exposed to users — always through `lib/error-handler.ts`
- No `any` type in error handling code (allowed as `catch (e: unknown)` then narrowed)
- Validation errors (Zod + React Hook Form) stay in form components — never logged as application errors
- All Supabase query responses go through `safeQuery` / `safeQuerySingle` helpers
- TypeScript strict mode enabled (`tsconfig.json: strict: true`)
- Feature code never imports Sentry — only `logger.ts` knows about the logging provider
- All new files follow existing code style (named exports, path alias `@/`)

---

### Task 1: Error Types (`lib/errors.ts`)

**Files:**
- Create: `lib/errors.ts`

**Interfaces:**
- Produces: `AppError`, `DatabaseError`, `NetworkError`, `AuthenticationError`, `ValidationError`, `UnknownError` classes, `ErrorCode` type, `isAppError()` guard

- [ ] **Step 1: Create `lib/errors.ts`**

```typescript
// lib/errors.ts
// ponytail: flat error hierarchy — no factory, no registry, no serialization layer
// add Sentry fingerprint mapping inside capture scope, not here

export type ErrorCode =
  | 'DB_QUERY_FAILED'
  | 'DB_CONNECTION_FAILED'
  | 'NETWORK_OFFLINE'
  | 'NETWORK_TIMEOUT'
  | 'NETWORK_UNAVAILABLE'
  | 'AUTH_INVALID_CREDENTIALS'
  | 'AUTH_SESSION_EXPIRED'
  | 'AUTH_UNAUTHORIZED'
  | 'VALIDATION_FAILED'
  | 'UNKNOWN';

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly cause?: unknown;

  constructor(code: ErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.cause = cause;
  }
}

export class DatabaseError extends AppError {
  readonly details: string | null;
  readonly hint: string | null;

  constructor(message: string, opts?: { code?: string; details?: string | null; hint?: string | null; cause?: unknown }) {
    super('DB_QUERY_FAILED', message, opts?.cause);
    this.name = 'DatabaseError';
    this.details = opts?.details ?? null;
    this.hint = opts?.hint ?? null;
  }
}

export class NetworkError extends AppError {
  constructor(message: string, cause?: unknown) {
    super('NETWORK_OFFLINE', message, cause);
    this.name = 'NetworkError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string, cause?: unknown) {
    super('AUTH_INVALID_CREDENTIALS', message, cause);
    this.name = 'AuthenticationError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, cause?: unknown) {
    super('VALIDATION_FAILED', message, cause);
    this.name = 'ValidationError';
  }
}

export class UnknownError extends AppError {
  constructor(cause?: unknown) {
    super('UNKNOWN', 'Terjadi kesalahan yang tidak diketahui', cause);
    this.name = 'UnknownError';
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
```

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add lib/errors.ts
git commit -m "feat: add typed error hierarchy"
```

---

### Task 2: Logger (`lib/logger.ts`)

**Files:**
- Create: `lib/logger.ts`

**Interfaces:**
- Consumes: — (standalone)
- Produces: `logger.debug()`, `logger.info()`, `logger.warn()`, `logger.error()`, `setSentryEnabled()`

- [ ] **Step 1: Create `lib/logger.ts`**

```typescript
// lib/logger.ts
// ponytail: thin console wrapper + sentry plug point. No DI, no transports, no levels config.

type LogContext = Record<string, unknown> | undefined;
type SentryCallback = (level: string, message: string, context?: LogContext, error?: unknown) => void;

let sentryEnabled = false;
let sentryCallback: SentryCallback | null = null;

export function setSentryEnabled(enabled: boolean, cb?: SentryCallback) {
  sentryEnabled = enabled;
  if (cb) sentryCallback = cb;
}

function timestamp(): string {
  return new Date().toISOString().slice(11, 19);
}

function formatContext(ctx: LogContext): string {
  if (!ctx || Object.keys(ctx).length === 0) return '';
  try { return ` ${JSON.stringify(ctx)}`; } catch { return ''; }
}

function notifySentry(level: string, message: string, context?: LogContext, error?: unknown) {
  if (sentryEnabled && sentryCallback) {
    sentryCallback(level, message, context, error);
  }
}

export const logger = {
  debug(name: string, message: string, context?: LogContext) {
    if (__DEV__) {
      console.debug(`🔍 [${timestamp()}] [${name}] ${message}${formatContext(context)}`);
    }
  },

  info(name: string, message: string, context?: LogContext) {
    if (__DEV__) {
      console.info(`ℹ️ [${timestamp()}] [${name}] ${message}${formatContext(context)}`);
    }
  },

  warn(name: string, message: string, context?: LogContext) {
    console.warn(`⚠️ [${timestamp()}] [${name}] ${message}${formatContext(context)}`);
    notifySentry('warn', message, context);
  },

  error(name: string, message: string, context?: LogContext, error?: unknown) {
    console.error(`🚨 [${timestamp()}] [${name}] ${message}${formatContext(context)}`);
    notifySentry('error', message, context, error);
  },
};
```

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add lib/logger.ts
git commit -m "feat: add centralized logger with sentry plug point"
```

---

### Task 3: Error Handler (`lib/error-handler.ts`)

**Files:**
- Create: `lib/error-handler.ts`

**Interfaces:**
- Consumes: `AppError`, `DatabaseError`, `NetworkError`, `AuthenticationError` (from Task 1)
- Produces: `getErrorMessage(error: unknown): string`, `getErrorCode(error: unknown): string`

- [ ] **Step 1: Create `lib/error-handler.ts`**

```typescript
// lib/error-handler.ts
// ponytail: simple type-to-message map, no i18n framework

import { AppError, DatabaseError, NetworkError, AuthenticationError, isAppError } from './errors';

export function getErrorMessage(error: unknown): string {
  if (error instanceof NetworkError) {
    return 'Koneksi internet terputus. Periksa koneksi Anda.';
  }
  if (error instanceof DatabaseError) {
    return 'Gagal memuat data. Silakan coba lagi.';
  }
  if (error instanceof AuthenticationError) {
    return 'Sesi berakhir. Silakan masuk lagi.';
  }
  if (isAppError(error)) {
    return error.message;
  }
  if (error instanceof Error) {
    // ponytail: generic Error → user message, not raw message
    return 'Terjadi kesalahan. Silakan coba lagi.';
  }
  return 'Terjadi kesalahan. Silakan coba lagi.';
}

export function getErrorCode(error: unknown): string {
  if (isAppError(error)) return error.code;
  if (error instanceof TypeError) return 'NETWORK_UNAVAILABLE';
  return 'UNKNOWN';
}
```

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add lib/error-handler.ts
git commit -m "feat: add user-friendly error message mapper"
```

---

### Task 4: Supabase Safe Helpers (`lib/supabase-safe.ts`)

**Files:**
- Create: `lib/supabase-safe.ts`

**Interfaces:**
- Consumes: `DatabaseError` (Task 1), `logger` (Task 2)
- Produces: `safeQuery<T>(queryFn): Promise<{ data: T[] | null; error: DatabaseError | null }>`, `safeQuerySingle<T>(queryFn): Promise<{ data: T | null; error: DatabaseError | null }>`

- [ ] **Step 1: Create `lib/supabase-safe.ts`**

```typescript
// lib/supabase-safe.ts
// ponytail: two wrappers, no builder pattern, no middleware chain

import { PostgrestError } from '@supabase/supabase-js';
import { DatabaseError } from './errors';
import { logger } from './logger';

function toDatabaseError(err: PostgrestError): DatabaseError {
  return new DatabaseError(err.message, {
    code: err.code,
    details: err.details,
    hint: err.hint,
    cause: err,
  });
}

function logError(name: string, err: unknown) {
  if (err instanceof DatabaseError) {
    logger.error('supabase', `${name}: ${err.message}`, {
      code: err.code,
      details: err.details,
      hint: err.hint,
    });
  } else {
    logger.error('supabase', `${name}: ${String(err)}`);
  }
}

export async function safeQuery<T>(
  queryFn: () => Promise<{ data: T[] | null; error: PostgrestError | null }>,
  name = 'query',
): Promise<{ data: T[] | null; error: DatabaseError | null }> {
  try {
    const { data, error } = await queryFn();
    if (error) {
      const dbErr = toDatabaseError(error);
      logError(name, dbErr);
      return { data: null, error: dbErr };
    }
    return { data, error: null };
  } catch (err) {
    const dbErr = new DatabaseError('Gagal menjalankan query', { cause: err });
    logError(name, dbErr);
    return { data: null, error: dbErr };
  }
}

export async function safeQuerySingle<T>(
  queryFn: () => Promise<{ data: T | null; error: PostgrestError | null }>,
  name = 'querySingle',
): Promise<{ data: T | null; error: DatabaseError | null }> {
  try {
    const { data, error } = await queryFn();
    if (error) {
      const dbErr = toDatabaseError(error);
      logError(name, dbErr);
      return { data: null, error: dbErr };
    }
    return { data, error: null };
  } catch (err) {
    const dbErr = new DatabaseError('Gagal menjalankan query', { cause: err });
    logError(name, dbErr);
    return { data: null, error: dbErr };
  }
}
```

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add lib/supabase-safe.ts
git commit -m "feat: add supabase query wrappers with typed errors"
```

---

### Task 5: `useAsync` Hook (`hooks/useAsync.ts`)

**Files:**
- Create: `hooks/useAsync.ts`

**Interfaces:**
- Consumes: `getErrorMessage()` (Task 3)
- Produces: `useAsync<T>(asyncFn, initialData?) → { data, loading, error, execute, setData, reset }`

- [ ] **Step 1: Create `hooks/useAsync.ts`**

```typescript
// hooks/useAsync.ts
// ponytail: single generic hook replaces useReducer + 3 useStates pattern. No AbortController wrapper.

import { useState, useCallback } from 'react';
import { getErrorMessage } from '@/lib/error-handler';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useAsync<T>(
  asyncFn: () => Promise<T>,
  initialData: T | null = null,
) {
  const [state, setState] = useState<AsyncState<T>>({
    data: initialData,
    loading: false,
    error: null,
  });

  const execute = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await asyncFn();
      setState({ data, loading: false, error: null });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: getErrorMessage(err),
      }));
    }
  }, [asyncFn]);

  const setData = useCallback((data: T | null) => {
    setState((prev) => ({ ...prev, data }));
  }, []);

  const reset = useCallback(() => {
    setState({ data: initialData, loading: false, error: null });
  }, [initialData]);

  return { ...state, execute, setData, reset };
}
```

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add hooks/useAsync.ts
git commit -m "feat: add generic useAsync hook"
```

---

### Task 6: ErrorBoundary Component (`components/ErrorBoundary.tsx`)

**Files:**
- Create: `components/ErrorBoundary.tsx`

**Interfaces:**
- Consumes: `logger` (Task 2)
- Produces: `<ErrorBoundary>` component with `onReset` prop and fallback UI

- [ ] **Step 1: Create `components/ErrorBoundary.tsx`**

```typescript
// components/ErrorBoundary.tsx
// ponytail: class component (React error boundary API requires it), no hook wrapping

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { logger } from '@/lib/logger';
import { COLORS, SPACING, TYPOGRAPHY, RADII } from '@/lib/theme';

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('ErrorBoundary', 'Unhandled rendering error', {
      componentStack: errorInfo.componentStack,
    }, error);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={styles.container}>
        <Ionicons name="alert-circle-outline" size={64} color={COLORS.statusCritical} />
        <Text style={styles.title}>Terjadi Kesalahan</Text>
        <Text style={styles.message}>
          Maaf, terjadi kesalahan yang tidak terduga. Silakan coba lagi.
        </Text>
        <TouchableOpacity style={styles.button} onPress={this.handleReset} activeOpacity={0.7}>
          <Text style={styles.buttonText}>Coba Lagi</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.xl,
  },
  title: {
    ...TYPOGRAPHY.headline,
    color: COLORS.onSurface,
    marginTop: SPACING.lg,
  },
  message: {
    ...TYPOGRAPHY.body,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    marginTop: SPACING.md,
    lineHeight: 24,
  },
  button: {
    marginTop: SPACING.xl,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADII.md,
  },
  buttonText: {
    ...TYPOGRAPHY.body,
    color: COLORS.onPrimary,
    fontWeight: '600',
  },
});
```

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add components/ErrorBoundary.tsx
git commit -m "feat: add global ErrorBoundary component"
```

---

### Task 7: Refactor `features/auth/useAuth.ts`

**Files:**
- Modify: `features/auth/useAuth.ts`

**Interfaces:**
- Consumes: `AuthenticationError` (Task 1), `logger` (Task 2)
- Changes: Add logging for auth lifecycle events, wrap errors in typed classes

- [ ] **Step 1: Edit `useAuth` to add logging**

Replace the `initialize`, `signIn`, `signUp`, `signOut` methods to use logger and typed errors:

```typescript
import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '@/lib/supabase';
import { AuthenticationError } from '@/lib/errors';
import { logger } from '@/lib/logger';

// ponytail: expo-secure-store has no web implementation; use localStorage on web
const isWeb = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
const store = {
  async getItem(key: string): Promise<string | null> {
    if (isWeb) return window.localStorage.getItem(key);
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (isWeb) { window.localStorage.setItem(key, value); return; }
    return SecureStore.setItemAsync(key, value);
  },
  async deleteItem(key: string): Promise<void> {
    if (isWeb) { window.localStorage.removeItem(key); return; }
    if (typeof SecureStore.deleteItemAsync === 'function') {
      return SecureStore.deleteItemAsync(key);
    }
  },
};

interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  session: null,
  user: null,
  isLoading: true,

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await store.setItem('session', JSON.stringify(session));
        logger.info('auth', 'Session restored from server');
      } else {
        logger.debug('auth', 'No active session');
      }
      set({ session, user: session?.user ?? null, isLoading: false });
    } catch (err) {
      logger.error('auth', 'Failed to initialize auth', undefined, err);
      set({ isLoading: false });
    }

    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        await store.setItem('session', JSON.stringify(session));
        logger.info('auth', `Auth state change: ${_event}`);
      } else {
        await store.deleteItem('session');
        logger.debug('auth', `Auth state change: ${_event} (no session)`);
      }
      set({ session, user: session?.user ?? null });
    });
  },

  signIn: async (email: string, password: string) => {
    logger.debug('auth', 'Sign in attempt');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      logger.warn('auth', `Sign in failed: ${error.message}`);
      return { error: 'Email atau password salah.' };
    }
    logger.info('auth', 'Sign in successful');
    return {};
  },

  signUp: async (email: string, password: string, fullName?: string) => {
    logger.debug('auth', 'Sign up attempt');
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) {
      logger.warn('auth', `Sign up failed: ${error.message}`);
      return { error: 'Gagal mendaftar. Silakan coba lagi.' };
    }
    logger.info('auth', 'Sign up successful');
    return {};
  },

  signOut: async () => {
    logger.debug('auth', 'Sign out');
    await supabase.auth.signOut().catch((err) => {
      logger.error('auth', 'Sign out supabase call failed', undefined, err);
    });
    await store.deleteItem('session');
    set({ session: null, user: null });
  },
}));
```

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add features/auth/useAuth.ts
git commit -m "refactor: add logging and user-friendly auth error messages"
```

---

### Task 8: Refactor `features/assets/useAssets.ts`

**Files:**
- Modify: `features/assets/useAssets.ts`

**Interfaces:**
- Consumes: `safeQuery`, `safeQuerySingle` (Task 4), `logger` (Task 2)
- Changes: Replace inline supabase calls with `safeQuery`, add logging

- [ ] **Step 1: Rewrite `useAssets`**

```typescript
import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { safeQuery, safeQuerySingle } from '@/lib/supabase-safe';
import { logger } from '@/lib/logger';
import { useAuth } from '@/features/auth/useAuth';
import { Asset } from '@/types';

export function useAssets() {
  const { user } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssets = useCallback(async () => {
    if (!user) return;
    setError(null);
    setLoading(true);
    const { data, error: err } = await safeQuery<Asset>(
      () => supabase
        .from('assets')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .order('name', { ascending: true }),
      'fetchAssets',
    );
    if (err) {
      setError('Gagal memuat aset');
    } else {
      setAssets(data || []);
    }
    setLoading(false);
  }, [user]);

  const fetchTemplates = async () => {
    const { data } = await safeQuery(
      () => supabase.from('asset_templates').select('*').order('name', { ascending: true }),
      'fetchTemplates',
    );
    return data || [];
  };

  const createAsset = async (asset: {
    name: string;
    category: string;
    icon_name: string;
    template_id?: string;
    description?: string;
    custom_fields?: Record<string, unknown>;
  }) => {
    if (!user) return { error: 'Not authenticated' };

    const { data, error: err } = await safeQuerySingle<Asset>(
      () => supabase
        .from('assets')
        .insert({
          user_id: user.id,
          name: asset.name,
          category: asset.category,
          icon_name: asset.icon_name,
          template_id: asset.template_id || null,
          description: asset.description || null,
          custom_fields: asset.custom_fields || {},
        })
        .select()
        .single(),
      'createAsset',
    );

    if (err) return { error: 'Gagal menyimpan aset' };
    return { data };
  };

  const updateAsset = async (id: string, updates: Partial<Asset>) => {
    const { error: err } = await safeQuerySingle(
      () => supabase
        .from('assets')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user?.id)
        .single(),
      'updateAsset',
    );

    if (err) return { error: 'Gagal memperbarui aset' };
    return {};
  };

  const archiveAsset = async (id: string) => {
    const { error: err } = await safeQuerySingle(
      () => supabase
        .from('assets')
        .update({ is_archived: true })
        .eq('id', id)
        .eq('user_id', user?.id)
        .single(),
      'archiveAsset',
    );

    if (err) return { error: 'Gagal mengarsipkan aset' };
    return {};
  };

  return {
    assets,
    loading,
    error,
    fetchAssets,
    fetchTemplates,
    createAsset,
    updateAsset,
    archiveAsset,
  };
}
```

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add features/assets/useAssets.ts
git commit -m "refactor: use safeQuery wrappers in useAssets"
```

---

### Task 9: Refactor `features/reminders/useReminders.ts`

**Files:**
- Modify: `features/reminders/useReminders.ts`

**Interfaces:**
- Consumes: `safeQuery`, `safeQuerySingle` (Task 4), `logger` (Task 2)
- Changes: Replace inline supabase calls with `safeQuery`, add logging

- [ ] **Step 1: Rewrite `useReminders`**

```typescript
import { useState, useCallback } from 'react';
import { addMonths, addYears, format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { safeQuery, safeQuerySingle } from '@/lib/supabase-safe';
import { logger } from '@/lib/logger';
import { useAuth } from '@/features/auth/useAuth';
import { Reminder } from '@/types';
import { scheduleReminderNotification } from '@/lib/notifications';

export function useReminders() {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReminders = useCallback(async () => {
    if (!user) return;
    setError(null);
    setLoading(true);
    const { data, error: err } = await safeQuery<Reminder>(
      () => supabase
        .from('reminders')
        .select('*')
        .eq('user_id', user.id)
        .order('due_date', { ascending: true }),
      'fetchReminders',
    );
    if (err) {
      setError('Gagal memuat pengingat');
    } else {
      setReminders(data || []);
    }
    setLoading(false);
  }, [user]);

  const createReminder = async (reminder: Omit<Reminder, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'paid_at' | 'status'>) => {
    if (!user) return { error: 'Not authenticated' };

    const parsedAmount = reminder.amount !== undefined ? reminder.amount : null;

    const { data, error: err } = await safeQuerySingle<Reminder>(
      () => supabase
        .from('reminders')
        .insert({
          user_id: user.id,
          title: reminder.title,
          category: reminder.category,
          due_date: reminder.due_date,
          recurrence: reminder.recurrence || 'none',
          amount: parsedAmount,
          notes: reminder.notes || null,
          remind_before_days: reminder.remind_before_days || [7, 3, 1, 0],
          asset_id: reminder.asset_id || null,
          status: 'pending',
        })
        .select()
        .single(),
      'createReminder',
    );

    if (err) return { error: 'Gagal menyimpan pengingat' };
    return { data };
  };

  const updateReminder = async (id: string, updates: Partial<Reminder>) => {
    const { error: err } = await safeQuerySingle(
      () => supabase
        .from('reminders')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user?.id)
        .single(),
      'updateReminder',
    );

    if (err) return { error: 'Gagal memperbarui pengingat' };
    return {};
  };

  const deleteReminder = async (id: string) => {
    const { error: err } = await safeQuerySingle(
      () => supabase
        .from('reminders')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id)
        .single(),
      'deleteReminder',
    );

    if (err) return { error: 'Gagal menghapus pengingat' };
    return {};
  };

  const markAsPaid = async (id: string) => {
    const { data: reminder, error: fetchErr } = await safeQuerySingle<Reminder>(
      () => supabase
        .from('reminders')
        .select('*')
        .eq('id', id)
        .eq('user_id', user?.id)
        .single(),
      'markAsPaid:fetch',
    );

    if (fetchErr || !reminder) return { error: 'Pengingat tidak ditemukan' };

    const { error: updateErr } = await safeQuerySingle(
      () => supabase
        .from('reminders')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user?.id)
        .single(),
      'markAsPaid:update',
    );

    if (updateErr) return { error: 'Gagal memperbarui status' };

    // ponytail: create next recurrence if monthly/yearly
    if (reminder.recurrence === 'monthly' || reminder.recurrence === 'yearly') {
      const currentDueDate = new Date(reminder.due_date);
      const nextDueDate = reminder.recurrence === 'monthly'
        ? addMonths(currentDueDate, 1)
        : addYears(currentDueDate, 1);

      const { data: newReminder } = await safeQuerySingle<Reminder>(
        () => supabase
          .from('reminders')
          .insert({
            user_id: reminder.user_id,
            title: reminder.title,
            category: reminder.category,
            due_date: format(nextDueDate, 'yyyy-MM-dd'),
            recurrence: reminder.recurrence,
            amount: reminder.amount,
            notes: reminder.notes,
            remind_before_days: reminder.remind_before_days,
            asset_id: reminder.asset_id,
            status: 'pending',
          })
          .select()
          .single(),
        'markAsPaid:next',
      );

      if (newReminder) {
        await scheduleReminderNotification({
          id: newReminder.id,
          title: newReminder.title,
          due_date: newReminder.due_date,
          remind_before_days: newReminder.remind_before_days,
        });
      }
    }

    return {};
  };

  return {
    reminders,
    loading,
    error,
    fetchReminders,
    createReminder,
    updateReminder,
    deleteReminder,
    markAsPaid,
  };
}
```

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add features/reminders/useReminders.ts
git commit -m "refactor: use safeQuery wrappers in useReminders"
```

---

### Task 10: Refactor Dashboard & Root Layout

**Files:**
- Modify: `app/(tabs)/index.tsx` (Dashboard)
- Modify: `app/_layout.tsx`
- Modify: `lib/notifications.ts`

**Interfaces:**
- Consumes: `ErrorBoundary` (Task 6), `logger` (Task 2), `safeQuery` (Task 4)
- Changes: Replace inline Supabase call in Dashboard, replace `console.*` with logger, add ErrorBoundary to root layout

- [ ] **Step 1: Refactor `app/(tabs)/index.tsx` — replace inline Supabase query**

Replace the inline supabase query section with `safeQuery`:

```typescript
// Replace the import section — add safeQuery
import { safeQuery } from '@/lib/supabase-safe';

// Replace the fetchReminders implementation
const fetchReminders = useCallback(async () => {
  if (!user) return;
  try {
    setError(null);
    const { data, error: err } = await safeQuery<Reminder>(
      () => supabase
        .from('reminders')
        .select('*')
        .eq('user_id', user.id)
        .order('due_date', { ascending: true }),
      'dashboard:fetchReminders',
    );
    if (err) {
      setError('Gagal memuat data');
    } else {
      setReminders(data || []);
    }
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
}, [user]);
```

- [ ] **Step 2: Refactor `app/_layout.tsx` — add ErrorBoundary and replace console**

Add import and wrap `<Slot />`:

```typescript
import ErrorBoundary from '@/components/ErrorBoundary';
import { logger } from '@/lib/logger';
```

Replace `console.error('Font loading failed:', e)` with `logger.error('fonts', 'Font loading failed', undefined, e)`

Replace `console.error('Auth init failed:', e)` with `logger.error('root', 'Auth init failed', undefined, e)`

Replace `console.error('Notification permissions failed:', e)` with `logger.error('root', 'Notification permissions failed', undefined, e)`

Replace `console.warn('Splash screen safety timeout fired')` with `logger.warn('root', 'Splash screen safety timeout fired')`

Replace `console.error('Failed to hide splash:', e)` with `logger.error('root', 'Failed to hide splash', undefined, e)`

Wrap `<Slot />` with `<ErrorBoundary>`:
```typescript
return (
  <SafeAreaProvider>
    <StatusBar style="dark" />
    <ErrorBoundary>
      <Slot />
    </ErrorBoundary>
  </SafeAreaProvider>
);
```

- [ ] **Step 3: Refactor `lib/notifications.ts` — replace console.warn**

```typescript
import { logger } from '@/lib/logger';
```
Replace `console.warn('Failed to set notification handler:', e)` with `logger.warn('notifications', 'Failed to set notification handler', undefined, e)`

- [ ] **Step 4: Verify compile**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 5: Commit**

```bash
git add app/_layout.tsx app/\(tabs\)/index.tsx lib/notifications.ts
git commit -m "refactor: add ErrorBoundary to root layout, replace console.* with logger, use safeQuery in dashboard"
```

---

### Task 11: Documentation

**Files:**
- Create: `docs/logging-error-handling.md`

- [ ] **Step 1: Create concise documentation**

```markdown
# Logging & Error Handling

## Logger (`lib/logger.ts`)

```typescript
import { logger } from '@/lib/logger';

logger.debug('feature', 'message');  // dev only
logger.info('feature', 'message');   // dev only
logger.warn('feature', 'message');   // dev + prod
logger.error('feature', 'message', contextObj, error);
```

**Naming:** First param is the feature/module name (e.g. `'auth'`, `'reminders'`, `'dashboard'`).
**Context:** Third param is optional `Record<string, unknown>` for structured metadata.
**Error:** Fourth param is the original error object for Sentry piping.

### Future Sentry Setup

```typescript
import { setSentryEnabled } from '@/lib/logger';

// In app startup:
setSentryEnabled(true, (level, message, context, error) => {
  if (level === 'error' && error) Sentry.captureException(error, { ... });
});
```

## Error Classes (`lib/errors.ts`)

| Class | When to throw |
|---|---|
| `DatabaseError` | Supabase query/mutation failures |
| `NetworkError` | Network offline, timeout, server unreachable |
| `AuthenticationError` | Auth failures, expired sessions |
| `ValidationError` | Zod schema parse failures (not logged) |
| `UnknownError` | Catch-all for unexpected exceptions |

```typescript
import { DatabaseError, isAppError } from '@/lib/errors';

throw new DatabaseError('Failed to load data', {
  code: 'PGRST301',
  details: '...',
  hint: '...',
});
```

## Supabase Safe Helpers (`lib/supabase-safe.ts`)

```typescript
import { safeQuery, safeQuerySingle } from '@/lib/supabase-safe';

// Multi-row
const { data, error } = await safeQuery<Reminder>(
  () => supabase.from('reminders').select('*'),
  'fetchReminders',
);

// Single row
const { data, error } = await safeQuerySingle<Asset>(
  () => supabase.from('assets').insert({...}).select().single(),
  'createAsset',
);
```

## Error Display (`lib/error-handler.ts`)

```typescript
import { getErrorMessage, getErrorCode } from '@/lib/error-handler';

catch (err) {
  setError(getErrorMessage(err));  // "Koneksi internet terputus..."
}
```

## ErrorBoundary (`components/ErrorBoundary.tsx`)

Wraps `<Slot />` in root layout. Catches render errors, logs them, shows fallback UI with retry.

## Best Practices

1. **Log every catch.** Every caught exception must either be logged, rethrown, or converted to user message.
2. **No raw console.\*.** Always use `logger.*`.
3. **Validate separately.** Zod + React Hook Form for validation. Never log validation errors as app errors.
4. **Supabase always through safeQuery.** Never call `supabase.from().select()` directly in feature code.
5. **User-friendly messages.** Never show raw error messages to users. Use `getErrorMessage()`.
6. **No Sentry in feature code.** Only `lib/logger.ts` touches Sentry.
```

- [ ] **Step 2: Verify no `console.*` remains**

Run: `grep -rn "console\.\(log\|warn\|error\|debug\|info\)" app/ features/ lib/ components/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".expo"`

Expected output: Empty (no remaining console.* calls in feature code). Only `lib/logger.ts` may have console calls.

- [ ] **Step 3: Commit**

```bash
git add docs/logging-error-handling.md
git commit -m "docs: add logging and error handling guide"
```
