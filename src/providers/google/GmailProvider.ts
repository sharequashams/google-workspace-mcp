import { google, gmail_v1 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { mapGoogleApiError } from './GoogleApiErrorMapper.js';

export class GmailProvider {
  async sendMessage(client: OAuth2Client, rawMimeMessage: string): Promise<gmail_v1.Schema$Message> {
    const gmail = google.gmail({ version: 'v1', auth: client });
    
    // Encode to base64url
    const raw = Buffer.from(rawMimeMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    try {
      const res = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw,
        },
      });
      return res.data;
    } catch (error) {
      throw mapGoogleApiError(error, 'gmail_send_email');
    }
  }
}
