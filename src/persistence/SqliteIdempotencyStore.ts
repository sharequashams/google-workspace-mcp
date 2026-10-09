import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { IdempotencyStore, IdempotencyRecord } from './IdempotencyStore.js';
import { AppError } from '../errors/AppError.js';

export class SqliteIdempotencyStore implements IdempotencyStore {
  private db: Database.Database;

  constructor(dbPath: string) {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    this.db = new Database(dbPath);
    this.initialize();
  }

  private initialize() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS idempotency (
        key TEXT NOT NULL,
        operation TEXT NOT NULL,
        payloadHash TEXT NOT NULL,
        status TEXT NOT NULL,
        resultJson TEXT,
        createdAt INTEGER NOT NULL,
        completedAt INTEGER,
        expiresAt INTEGER NOT NULL,
        PRIMARY KEY (key, operation)
      );
    `);
  }

  async find(key: string, operation: string): Promise<IdempotencyRecord | null> {
    const stmt = this.db.prepare('SELECT * FROM idempotency WHERE key = ? AND operation = ?');
    const row = stmt.get(key, operation) as any;
    if (!row) return null;
    
    return {
      key: row.key,
      operation: row.operation,
      payloadHash: row.payloadHash,
      status: row.status,
      resultJson: row.resultJson,
      createdAt: row.createdAt,
      completedAt: row.completedAt,
      expiresAt: row.expiresAt,
    };
  }

  async reserve(key: string, operation: string, payloadHash: string, expiresAt: number): Promise<void> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO idempotency (key, operation, payloadHash, status, createdAt, expiresAt)
        VALUES (?, ?, ?, 'RESERVED', ?, ?)
      `);
      stmt.run(key, operation, payloadHash, Date.now(), expiresAt);
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
        throw new AppError('IDEMPOTENCY_IN_PROGRESS', 'Idempotency key already reserved.', false, { operation });
      }
      throw error;
    }
  }

  async complete(key: string, operation: string, resultJson: string): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE idempotency 
      SET status = 'COMPLETED', resultJson = ?, completedAt = ? 
      WHERE key = ? AND operation = ?
    `);
    stmt.run(resultJson, Date.now(), key, operation);
  }
}
