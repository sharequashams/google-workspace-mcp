import { IdempotencyStore, IdempotencyRecord } from './IdempotencyStore.js';
import { AppError } from '../errors/AppError.js';

export class InMemoryIdempotencyStore implements IdempotencyStore {
  private store: Map<string, IdempotencyRecord> = new Map();

  constructor() {}

  async find(key: string, operation: string): Promise<IdempotencyRecord | null> {
    const record = this.store.get(`${key}:${operation}`);
    return record || null;
  }

  async reserve(key: string, operation: string, payloadHash: string, expiresAt: number): Promise<void> {
    const storeKey = `${key}:${operation}`;
    if (this.store.has(storeKey)) {
      throw new AppError('IDEMPOTENCY_IN_PROGRESS', 'Idempotency key already reserved.', false, { operation });
    }
    
    this.store.set(storeKey, {
      key,
      operation,
      payloadHash,
      status: 'RESERVED',
      resultJson: null,
      createdAt: Date.now(),
      completedAt: null,
      expiresAt
    });
  }

  async complete(key: string, operation: string, resultJson: string): Promise<void> {
    const storeKey = `${key}:${operation}`;
    const record = this.store.get(storeKey);
    if (record) {
      record.status = 'COMPLETED';
      record.resultJson = resultJson;
      record.completedAt = Date.now();
    }
  }
}
