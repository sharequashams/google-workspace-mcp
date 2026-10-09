import { promises as fs } from 'fs';
import path from 'path';
import { CredentialStore, StoredGoogleCredential } from './CredentialStore.js';

export class FileCredentialStore implements CredentialStore {
  constructor(private storePath: string) {}

  private async ensureDirectory() {
    const dir = path.dirname(this.storePath);
    await fs.mkdir(dir, { recursive: true });
  }

  private async readAll(): Promise<Record<string, StoredGoogleCredential>> {
    try {
      const data = await fs.readFile(this.storePath, 'utf8');
      return JSON.parse(data);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return {};
      }
      throw error;
    }
  }

  private async writeAll(data: Record<string, StoredGoogleCredential>): Promise<void> {
    await this.ensureDirectory();
    await fs.writeFile(this.storePath, JSON.stringify(data, null, 2), { mode: 0o600 });
  }

  async get(principalId: string): Promise<StoredGoogleCredential | null> {
    const all = await this.readAll();
    return all[principalId] || null;
  }

  async save(principalId: string, credential: StoredGoogleCredential): Promise<void> {
    const all = await this.readAll();
    all[principalId] = credential;
    await this.writeAll(all);
  }

  async delete(principalId: string): Promise<void> {
    const all = await this.readAll();
    if (all[principalId]) {
      delete all[principalId];
      await this.writeAll(all);
    }
  }
}
