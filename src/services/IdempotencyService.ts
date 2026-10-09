import crypto from 'crypto';
import { IdempotencyStore } from '../persistence/IdempotencyStore.js';
import { AppError } from '../errors/AppError.js';

export class IdempotencyService {
  constructor(private store: IdempotencyStore) {}

  public hashPayload(payload: any): string {
    return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  }

  public async execute<T>(
    key: string | undefined,
    operation: string,
    payloadHash: string,
    ttlSeconds: number,
    workFn: () => Promise<T>
  ): Promise<T> {
    if (!key) {
      // No idempotency key provided; just execute the work
      return await workFn();
    }

    const record = await this.store.find(key, operation);

    if (record) {
      if (record.payloadHash !== payloadHash) {
        throw new AppError('IDEMPOTENCY_CONFLICT', 'Idempotency key reused with different payload.', false, { operation });
      }

      if (record.status === 'COMPLETED') {
        return JSON.parse(record.resultJson as string) as T;
      }

      if (record.status === 'RESERVED') {
        if (record.expiresAt > Date.now()) {
           throw new AppError('IDEMPOTENCY_IN_PROGRESS', 'An operation with this idempotency key is already in progress.', false, { operation });
        }
        // If expired, we could theoretically retry, but for safety in this MVP we will treat it as failed/stuck.
        throw new AppError('IDEMPOTENCY_CONFLICT', 'Previous operation with this key did not complete successfully.', false, { operation });
      }
    }

    await this.store.reserve(key, operation, payloadHash, Date.now() + ttlSeconds * 1000);

    let result: T;
    try {
      result = await workFn();
    } catch (error) {
      // We don't mark as FAILED in this MVP, we just let it expire or stay RESERVED so it can't be reused unsafely
      // However, if it's a known retryable error, we might want to delete the reservation, but for simplicity, we don't.
      throw error;
    }

    await this.store.complete(key, operation, JSON.stringify(result));
    return result;
  }
}
