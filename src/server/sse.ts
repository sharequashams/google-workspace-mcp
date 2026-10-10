import express from 'express';
import cors from 'cors';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
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

export async function runSseServer() {
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

  const app = express();
  app.use(cors());
  app.use(express.json());

  let transport: SSEServerTransport | null = null;

  app.get('/sse', async (req, res) => {
    transport = new SSEServerTransport('/message', res);
    await server.connect(transport);
  });

  app.post('/message', async (req, res) => {
    if (transport) {
      await transport.handlePostMessage(req, res);
    } else {
      res.status(500).send('SSE transport not initialized. Connect to /sse first.');
    }
  });

  // Adding basic OAuth endpoints for ease of setup on Cloud
  app.get('/', (req, res) => {
    res.send(`
      <h1>Google Workspace MCP Server</h1>
      <p>The server is running successfully!</p>
      <ul>
        <li><a href="/auth/login">Authenticate with Google</a></li>
        <li>SSE Endpoint: <code>/sse</code></li>
      </ul>
    `);
  });

  app.get('/auth/login', (req, res) => {
    if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET) {
      res.status(500).send('Error: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing in environment variables.');
      return;
    }
    const scopes = [
      config.GOOGLE_GMAIL_SCOPE,
      config.GOOGLE_DOCS_SCOPE,
      'https://www.googleapis.com/auth/userinfo.email',
    ].filter(Boolean);
    const authUrl = oauthProvider.getAuthUrl(scopes);
    res.redirect(authUrl);
  });

  app.get('/oauth/google/callback', async (req, res) => {
    const code = req.query.code as string;
    if (code) {
      try {
        const tokens = await oauthProvider.getTokens(code);
        const client = oauthProvider.createClient(tokens.access_token!, tokens.refresh_token!, tokens.expiry_date || undefined);
        const email = await oauthProvider.getUserEmail(client);
        
        await credentialStore.save('default', {
          principalId: 'default',
          googleEmail: email,
          accessToken: tokens.access_token!,
          refreshToken: tokens.refresh_token!,
          expiryDate: tokens.expiry_date || Date.now() + 3600 * 1000,
          scopes: [
            config.GOOGLE_GMAIL_SCOPE,
            config.GOOGLE_DOCS_SCOPE,
            'https://www.googleapis.com/auth/userinfo.email',
          ],
        });

        res.send('<h1>Authentication successful!</h1><p>You can close this tab and return to the application.</p>');
      } catch (e) {
        console.error('Error exchanging code for tokens:', e);
        res.status(500).send('Authentication failed.');
      }
    } else {
      res.status(400).send('No code provided in callback.');
    }
  });

  app.listen(config.PORT, '0.0.0.0', () => {
    console.error(`Google Workspace MCP SSE server running on http://0.0.0.0:${config.PORT}`);
    console.error(`SSE endpoint: http://0.0.0.0:${config.PORT}/sse`);
    console.error(`Message endpoint: http://0.0.0.0:${config.PORT}/message`);
    console.error(`Login endpoint: http://0.0.0.0:${config.PORT}/auth/login`);
  });
}
