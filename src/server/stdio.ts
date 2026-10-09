import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './createServer.js';
import { config } from '../config/env.js';
import { AuthService } from '../services/AuthService.js';
import { GoogleOAuthProvider } from '../providers/google/GoogleOAuthProvider.js';
import { FileCredentialStore } from '../persistence/FileCredentialStore.js';
import { GmailSendService } from '../services/GmailSendService.js';
import { GmailProvider } from '../providers/google/GmailProvider.js';
import { InMemoryIdempotencyStore } from '../persistence/InMemoryIdempotencyStore.js';
import { IdempotencyService } from '../services/IdempotencyService.js';
import { DocsProvider } from '../providers/google/DocsProvider.js';
import { DocsAppendService } from '../services/DocsAppendService.js';

export async function runStdioServer() {
  const credentialStore = new FileCredentialStore(config.TOKEN_STORE_PATH);
  const oauthProvider = new GoogleOAuthProvider();
  const authService = new AuthService(credentialStore, oauthProvider);
  
  const idempotencyStore = new InMemoryIdempotencyStore();
  const idempotencyService = new IdempotencyService(idempotencyStore);
  const gmailProvider = new GmailProvider();
  const docsProvider = new DocsProvider();
  
  const gmailSendService = new GmailSendService(authService, gmailProvider, idempotencyService);
  const docsAppendService = new DocsAppendService(authService, docsProvider, idempotencyService);

  const server = createServer(authService, gmailSendService, docsAppendService);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Google Workspace MCP server running on stdio');
}
