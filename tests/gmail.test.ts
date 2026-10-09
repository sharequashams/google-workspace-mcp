import { describe, it, expect, vi } from 'vitest';
import { GmailSendService } from '../src/services/GmailSendService.js';
import { AuthService } from '../src/services/AuthService.js';
import { GmailProvider } from '../src/providers/google/GmailProvider.js';
import { IdempotencyService } from '../src/services/IdempotencyService.js';
import { IdempotencyStore } from '../src/persistence/IdempotencyStore.js';
import { GmailSendEmailInput } from '../src/schemas/gmail.js';

describe('GmailSendService', () => {
  const mockAuthService = {
    getAuthStatus: vi.fn().mockResolvedValue({
      authenticated: true,
      account: 'sender@example.com'
    }),
    getAuthorizedClient: vi.fn().mockResolvedValue({})
  } as unknown as AuthService;

  const mockGmailProvider = {
    sendMessage: vi.fn().mockResolvedValue({ id: 'msg-123', threadId: 'thread-123' })
  } as unknown as GmailProvider;

  const mockStore: IdempotencyStore = {
    find: async () => null,
    reserve: async () => {},
    complete: async () => {}
  };
  const idempotencyService = new IdempotencyService(mockStore);

  it('should generate text-only MIME message correctly', () => {
    const service = new GmailSendService(mockAuthService, mockGmailProvider, idempotencyService);
    
    const input: GmailSendEmailInput = {
      to: ['test@example.com'],
      subject: 'Hello',
      textBody: 'This is a test message.',
      sendMode: 'preview'
    };

    const mime = service.buildMimeMessage(input, 'sender@example.com');
    expect(mime).toContain('From: sender@example.com');
    expect(mime).toContain('To: test@example.com');
    expect(mime).toContain('Subject: Hello');
    expect(mime).toContain('Content-Type: text/plain; charset="UTF-8"');
    expect(mime).toContain('This is a test message.');
    expect(mime).not.toContain('Content-Type: multipart/alternative');
  });

  it('should generate multipart MIME message when HTML is present', () => {
    const service = new GmailSendService(mockAuthService, mockGmailProvider, idempotencyService);
    
    const input: GmailSendEmailInput = {
      to: ['test@example.com'],
      subject: 'Hello HTML',
      textBody: 'This is a text fallback.',
      htmlBody: '<h1>This is HTML</h1>',
      sendMode: 'preview'
    };

    const mime = service.buildMimeMessage(input, 'sender@example.com');
    expect(mime).toContain('From: sender@example.com');
    expect(mime).toContain('To: test@example.com');
    expect(mime).toContain('Subject: Hello HTML');
    expect(mime).toContain('Content-Type: multipart/alternative');
    expect(mime).toContain('Content-Type: text/plain; charset="UTF-8"');
    expect(mime).toContain('This is a text fallback.');
    expect(mime).toContain('Content-Type: text/html; charset="UTF-8"');
    expect(mime).toContain('<h1>This is HTML</h1>');
  });

  it('should return preview response and not call Gmail', async () => {
    const service = new GmailSendService(mockAuthService, mockGmailProvider, idempotencyService);
    
    const input: GmailSendEmailInput = {
      to: ['test@example.com'],
      subject: 'Preview Test',
      textBody: 'Preview Body',
      sendMode: 'preview'
    };

    const result = await service.processSendEmail(input, 'default');
    expect(result.status).toBe('preview');
    expect(result.from).toBe('sender@example.com');
    expect(result.to).toEqual(['test@example.com']);
    expect(result.subject).toBe('Preview Test');
    expect(result.textBodyPreview).toBe('Preview Body');
    expect(result.willSend).toBe(false);
  });

  it('should send email and return success result', async () => {
    const service = new GmailSendService(mockAuthService, mockGmailProvider, idempotencyService);
    
    const input: GmailSendEmailInput = {
      to: ['test@example.com'],
      subject: 'Send Test',
      textBody: 'Send Body',
      sendMode: 'send',
      idempotencyKey: 'test-key-1'
    };

    const result = await service.processSendEmail(input, 'default') as any;
    expect(result.status).toBe('sent');
    expect(result.messageId).toBe('msg-123');
    expect(result.threadId).toBe('thread-123');
    expect(mockGmailProvider.sendMessage).toHaveBeenCalled();
  });
});
