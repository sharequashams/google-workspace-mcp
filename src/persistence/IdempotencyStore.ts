export interface IdempotencyRecord {
  key: string;
  operation: string;
  payloadHash: string;
  status: 'RESERVED' | 'COMPLETED' | 'FAILED';
  resultJson: string | null;
  createdAt: number;
  completedAt: number | null;
  expiresAt: number;
}

export interface IdempotencyStore {
  find(key: string, operation: string): Promise<IdempotencyRecord | null>;
  reserve(key: string, operation: string, payloadHash: string, expiresAt: number): Promise<void>;
  complete(key: string, operation: string, resultJson: string): Promise<void>;
}
