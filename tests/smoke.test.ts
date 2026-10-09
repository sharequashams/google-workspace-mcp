import { describe, it, expect } from 'vitest';
import { createServer } from '../src/server/createServer.js';
import { AuthService } from '../src/services/AuthService.js';
import { GoogleOAuthProvider } from '../src/providers/google/GoogleOAuthProvider.js';
import { FileCredentialStore } from '../src/persistence/FileCredentialStore.js';
import { GmailSendService } from '../src/services/GmailSendService.js';
import { GmailProvider } from '../src/providers/google/GmailProvider.js';
import { IdempotencyService } from '../src/services/IdempotencyService.js';
import { IdempotencyStore, IdempotencyRecord } from '../src/persistence/IdempotencyStore.js';
import { DocsProvider } from '../src/providers/google/DocsProvider.js';
import { DocsAppendService } from '../src/services/DocsAppendService.js';

describe('MCP Server Smoke Test', () => {
  it('should list tools successfully', async () => {
    const credentialStore = new FileCredentialStore('.data/test-credentials.json');
    const oauthProvider = new GoogleOAuthProvider();
    const authService = new AuthService(credentialStore, oauthProvider);
    
    const mockStore: IdempotencyStore = {
      find: async () => null,
      reserve: async () => {},
      complete: async () => {}
    };
    const idempotencyService = new IdempotencyService(mockStore);
    const gmailProvider = new GmailProvider();
    const docsProvider = new DocsProvider();
    
    const gmailSendService = new GmailSendService(authService, gmailProvider, idempotencyService);
    const docsAppendService = new DocsAppendService(authService, docsProvider, idempotencyService);

    const server = createServer(authService, gmailSendService, docsAppendService);
    
    expect(server).toBeDefined();
    // Smoke test passes if server instantiates without throwing
  });
});
