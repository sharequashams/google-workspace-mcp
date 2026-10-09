import http from 'http';
import url from 'url';
import { config } from '../src/config/env.js';
import { GoogleOAuthProvider } from '../src/providers/google/GoogleOAuthProvider.js';
import { FileCredentialStore } from '../src/persistence/FileCredentialStore.js';

const SCOPES = [
  config.GOOGLE_GMAIL_SCOPE,
  config.GOOGLE_DOCS_SCOPE,
  'https://www.googleapis.com/auth/userinfo.email',
].filter(Boolean);

async function authenticate() {
  const provider = new GoogleOAuthProvider();
  const authUrl = provider.getAuthUrl(SCOPES);

  console.log('Please open the following URL in your browser to authorize the application:');
  console.log('\n', authUrl, '\n');

  // Simple localhost server to receive the callback
  const server = http.createServer(async (req, res) => {
    if (req.url && req.url.startsWith('/oauth/google/callback')) {
      const parsedUrl = url.parse(req.url, true);
      const code = parsedUrl.query.code as string;

      if (code) {
        try {
          const tokens = await provider.getTokens(code);
          const client = provider.createClient(tokens.access_token!, tokens.refresh_token!, tokens.expiry_date || undefined);
          const email = await provider.getUserEmail(client);

          const store = new FileCredentialStore(config.TOKEN_STORE_PATH);
          
          await store.save('default', {
            principalId: 'default',
            googleEmail: email,
            accessToken: tokens.access_token!,
            refreshToken: tokens.refresh_token!,
            expiryDate: tokens.expiry_date || Date.now() + 3600 * 1000,
            scopes: SCOPES,
          });

          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<h1>Authentication successful!</h1><p>You can close this tab and return to the terminal.</p>');
          
          console.log('Authentication successful!');
          console.log('Authenticated account:', email);
          console.log('Granted scopes:', SCOPES);
        } catch (e) {
          console.error('Error exchanging code for tokens:', e);
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Authentication failed.');
        } finally {
          server.close();
          process.exit(0);
        }
      } else {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('No code provided in callback.');
        server.close();
        process.exit(1);
      }
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
    }
  });

  server.listen(8787, () => {
    console.log('Waiting for authorization code on http://127.0.0.1:8787/oauth/google/callback ...');
  });
}

authenticate().catch(console.error);
