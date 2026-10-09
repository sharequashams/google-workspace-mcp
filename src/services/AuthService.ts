import { OAuth2Client } from 'google-auth-library';
import { CredentialStore } from '../persistence/CredentialStore.js';
import { GoogleOAuthProvider } from '../providers/google/GoogleOAuthProvider.js';

export class AuthService {
  constructor(
    private credentialStore: CredentialStore,
    private oauthProvider: GoogleOAuthProvider
  ) {}

  async getAuthorizedClient(principalId: string): Promise<OAuth2Client> {
    const creds = await this.credentialStore.get(principalId);
    if (!creds) {
      throw new Error('NOT_AUTHENTICATED: No stored credentials found for principal.');
    }

    const client = this.oauthProvider.createClient(
      creds.accessToken,
      creds.refreshToken,
      creds.expiryDate
    );

    // Listen for automatic token refreshes
    client.on('tokens', async (tokens) => {
      if (tokens.refresh_token) {
        creds.refreshToken = tokens.refresh_token;
      }
      if (tokens.access_token) {
        creds.accessToken = tokens.access_token;
      }
      if (tokens.expiry_date) {
        creds.expiryDate = tokens.expiry_date;
      }
      await this.credentialStore.save(principalId, creds);
    });

    try {
      // Force token refresh if expired (or check access token)
      await client.getAccessToken();
    } catch (e: any) {
      if (e.response?.data?.error === 'invalid_grant' || e.message.includes('invalid_grant')) {
         throw new Error('GOOGLE_REAUTH_REQUIRED: Google authorization is no longer valid. Reauthenticate the connected account.');
      }
      throw e;
    }

    return client;
  }

  async getAuthStatus(principalId: string) {
    try {
      const creds = await this.credentialStore.get(principalId);
      if (!creds) {
        return {
          authenticated: false,
          account: null,
          scopes: [],
          canSendEmail: false,
          canAppendGoogleDoc: false,
          requiresReauthentication: false,
        };
      }

      // We have credentials. Check if we can get a client token.
      let requiresReauthentication = false;
      const client = this.oauthProvider.createClient(
        creds.accessToken,
        creds.refreshToken,
        creds.expiryDate
      );
      
      try {
        await client.getAccessToken();
      } catch (e: any) {
         if (e.response?.data?.error === 'invalid_grant' || e.message.includes('invalid_grant')) {
            requiresReauthentication = true;
         }
      }

      const scopes = creds.scopes || [];
      return {
        authenticated: true,
        account: creds.googleEmail,
        scopes,
        canSendEmail: scopes.includes('https://www.googleapis.com/auth/gmail.send'),
        canAppendGoogleDoc: scopes.includes('https://www.googleapis.com/auth/documents') || scopes.includes('https://www.googleapis.com/auth/drive.file'),
        requiresReauthentication,
      };

    } catch (e) {
      return {
          authenticated: false,
          account: null,
          scopes: [],
          canSendEmail: false,
          canAppendGoogleDoc: false,
          requiresReauthentication: false,
      };
    }
  }
}
