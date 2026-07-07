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
