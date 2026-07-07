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
