export type ErrorCode = 
  | 'INVALID_ARGUMENT'
  | 'NOT_AUTHENTICATED'
  | 'GOOGLE_REAUTH_REQUIRED'
  | 'GOOGLE_PERMISSION_DENIED'
  | 'GOOGLE_NOT_FOUND'
  | 'GOOGLE_RATE_LIMITED'
  | 'GOOGLE_TEMPORARY_FAILURE'
  | 'EMAIL_SEND_FAILED'
  | 'DOC_APPEND_FAILED'
  | 'DOC_REVISION_CONFLICT'
  | 'IDEMPOTENCY_CONFLICT'
  | 'IDEMPOTENCY_IN_PROGRESS'
  | 'PAYLOAD_TOO_LARGE'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public retryable: boolean,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
  }
}
