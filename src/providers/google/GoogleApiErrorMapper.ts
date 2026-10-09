import { AppError } from '../../errors/AppError.js';

export function mapGoogleApiError(error: any, operation: string): AppError {
  const status = error?.response?.status;
  const message = error?.message || 'Unknown Google API error';

  if (status === 401) {
    return new AppError('GOOGLE_REAUTH_REQUIRED', 'Google authorization is no longer valid.', false, { operation });
  }
  if (status === 403) {
    return new AppError('GOOGLE_PERMISSION_DENIED', 'Google permission denied.', false, { operation, original: message });
  }
  if (status === 404) {
    return new AppError('GOOGLE_NOT_FOUND', 'Google resource not found.', false, { operation });
  }
  if (status === 409) {
    return new AppError('DOC_REVISION_CONFLICT', 'Revision conflict.', true, { operation });
  }
  if (status === 429) {
    return new AppError('GOOGLE_RATE_LIMITED', 'Google rate limited.', true, { operation });
  }
  if (status >= 500) {
    return new AppError('GOOGLE_TEMPORARY_FAILURE', 'Google temporary failure.', true, { operation });
  }
  if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
    return new AppError('GOOGLE_TEMPORARY_FAILURE', 'Google connection failure.', true, { operation });
  }
  
  return new AppError('INTERNAL_ERROR', 'Internal error communicating with Google API.', false, { operation, original: message });
}
