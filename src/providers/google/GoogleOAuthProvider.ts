import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../../config/env.js';

export class GoogleOAuthProvider {
  private client: OAuth2Client;

  constructor() {
    this.client = new google.auth.OAuth2(
      config.GOOGLE_CLIENT_ID,
      config.GOOGLE_CLIENT_SECRET,
      config.GOOGLE_REDIRECT_URI
    );
  }

  getAuthUrl(scopes: string[]): string {
    return this.client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent', // Force consent to get refresh token
    });
  }

  async getTokens(code: string) {
    const { tokens } = await this.client.getToken(code);
    return tokens;
  }

  createClient(accessToken: string, refreshToken?: string, expiryDate?: number): OAuth2Client {
    const client = new google.auth.OAuth2(
      config.GOOGLE_CLIENT_ID,
      config.GOOGLE_CLIENT_SECRET,
      config.GOOGLE_REDIRECT_URI
    );
    client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
      expiry_date: expiryDate,
    });
    return client;
  }

  async getUserEmail(client: OAuth2Client): Promise<string | null> {
    try {
      const oauth2 = google.oauth2({ version: 'v2', auth: client });
      const res = await oauth2.userinfo.get();
      return res.data.email || null;
    } catch (e) {
      return null;
    }
  }
}
