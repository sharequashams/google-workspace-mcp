import { GmailSendEmailInput } from '../schemas/gmail.js';
import { AuthService } from './AuthService.js';
import { GmailProvider } from '../providers/google/GmailProvider.js';
import { IdempotencyService } from './IdempotencyService.js';
import { config } from '../config/env.js';

export class GmailSendService {
  constructor(
    private authService: AuthService,
    private gmailProvider: GmailProvider,
    private idempotencyService: IdempotencyService
  ) {}

  public async processSendEmail(input: GmailSendEmailInput, principalId: string = 'default') {
    const { authenticated, account } = await this.authService.getAuthStatus(principalId);
    
    if (!authenticated) {
      throw new Error('NOT_AUTHENTICATED: Google authorization is no longer valid or missing.');
    }

    const uniqueTo = [...new Set(input.to)];
    const uniqueCc = [...new Set(input.cc || [])];
    const uniqueBcc = [...new Set(input.bcc || [])];

    if (input.sendMode === 'preview') {
      return {
        status: 'preview',
        from: account,
        to: uniqueTo,
        cc: uniqueCc,
        bccCount: uniqueBcc.length,
        subject: input.subject,
        textBodyPreview: input.textBody.substring(0, 100) + (input.textBody.length > 100 ? '...' : ''),
        htmlBodyIncluded: !!input.htmlBody,
        willSend: false,
      };
    }

    if (input.sendMode === 'send') {
      const payloadToHash = {
        to: uniqueTo,
        cc: uniqueCc,
        bcc: uniqueBcc,
        subject: input.subject,
        textBody: input.textBody,
        htmlBody: input.htmlBody,
        replyTo: input.replyTo,
      };

      const payloadHash = this.idempotencyService.hashPayload(payloadToHash);

      return await this.idempotencyService.execute(
        input.idempotencyKey,
        'gmail_send_email',
        payloadHash,
        config.IDEMPOTENCY_TTL_SECONDS,
        async () => {
          const client = await this.authService.getAuthorizedClient(principalId);
          const from = await this.authService.getAuthStatus(principalId).then(s => s.account) || 'me';
          const mimeMessage = this.buildMimeMessage(input, from);
          
          const result = await this.gmailProvider.sendMessage(client, mimeMessage);
          
          return {
            status: 'sent',
            messageId: result.id,
            threadId: result.threadId,
            toCount: uniqueTo.length,
            ccCount: uniqueCc.length,
            bccCount: uniqueBcc.length,
            subject: input.subject,
            idempotencyKey: input.idempotencyKey,
          };
        }
      );
    }

    throw new Error('INVALID_ARGUMENT: Unsupported sendMode.');
  }

  public buildMimeMessage(input: GmailSendEmailInput, from: string): string {
    const uniqueTo = [...new Set(input.to)].join(', ');
    const uniqueCc = [...new Set(input.cc || [])].join(', ');
    const uniqueBcc = [...new Set(input.bcc || [])].join(', ');

    let mime = '';
    mime += `From: ${from}\r\n`;
    mime += `To: ${uniqueTo}\r\n`;
    if (uniqueCc) mime += `Cc: ${uniqueCc}\r\n`;
    if (uniqueBcc) mime += `Bcc: ${uniqueBcc}\r\n`;
    if (input.replyTo) mime += `Reply-To: ${input.replyTo}\r\n`;
    mime += `Subject: ${input.subject}\r\n`;
    mime += `MIME-Version: 1.0\r\n`;

    if (input.htmlBody) {
      const boundary = `boundary_${Date.now().toString(16)}`;
      mime += `Content-Type: multipart/alternative; boundary="${boundary}"\r\n\r\n`;
      mime += `--${boundary}\r\n`;
      mime += `Content-Type: text/plain; charset="UTF-8"\r\n\r\n`;
      mime += `${input.textBody}\r\n\r\n`;
      mime += `--${boundary}\r\n`;
      mime += `Content-Type: text/html; charset="UTF-8"\r\n\r\n`;
      mime += `${input.htmlBody}\r\n\r\n`;
      mime += `--${boundary}--`;
    } else {
      mime += `Content-Type: text/plain; charset="UTF-8"\r\n\r\n`;
      mime += `${input.textBody}`;
    }

    return mime;
  }
}
