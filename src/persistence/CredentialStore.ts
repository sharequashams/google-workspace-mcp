export interface StoredGoogleCredential {
  principalId: string;
  googleEmail: string | null;
  accessToken: string;
  refreshToken: string;
  expiryDate: number;
  scopes: string[];
}

export interface CredentialStore {
  get(principalId: string): Promise<StoredGoogleCredential | null>;
  save(principalId: string, credential: StoredGoogleCredential): Promise<void>;
  delete(principalId: string): Promise<void>;
}
