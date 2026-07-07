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
  queryFn: () => PromiseLike<{ data: T[] | null; error: PostgrestError | null }>,
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
  queryFn: () => PromiseLike<{ data: T | null; error: PostgrestError | null }>,
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
