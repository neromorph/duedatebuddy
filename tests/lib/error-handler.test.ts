import { AuthenticationError, DatabaseError, NetworkError, UnknownError } from '../../lib/errors';
import { getErrorCode, getErrorMessage } from '../../lib/error-handler';

describe('error handling user messages', () => {
  it('maps known app errors to safe user-facing messages', () => {
    expect(getErrorMessage(new NetworkError('socket closed'))).toBe('Koneksi internet terputus. Periksa koneksi Anda.');
    expect(getErrorMessage(new DatabaseError('relation missing'))).toBe('Gagal memuat data. Silakan coba lagi.');
    expect(getErrorMessage(new AuthenticationError('jwt expired'))).toBe('Sesi berakhir. Silakan masuk lagi.');
    expect(getErrorMessage(new UnknownError())).toBe('Terjadi kesalahan yang tidak diketahui');
  });

  it('does not expose generic internal error messages', () => {
    expect(getErrorMessage(new Error('secret stack detail'))).toBe('Terjadi kesalahan. Silakan coba lagi.');
  });

  it('returns stable error codes for logging and UI branches', () => {
    expect(getErrorCode(new DatabaseError('failed'))).toBe('DB_QUERY_FAILED');
    expect(getErrorCode(new TypeError('fetch failed'))).toBe('NETWORK_UNAVAILABLE');
    expect(getErrorCode('nope')).toBe('UNKNOWN');
  });
});
