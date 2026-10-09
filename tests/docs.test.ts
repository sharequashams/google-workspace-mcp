import { describe, it, expect, vi } from 'vitest';
import { DocsAppendService } from '../src/services/DocsAppendService.js';
import { AuthService } from '../src/services/AuthService.js';
import { DocsProvider } from '../src/providers/google/DocsProvider.js';
import { IdempotencyService } from '../src/services/IdempotencyService.js';
import { IdempotencyStore } from '../src/persistence/IdempotencyStore.js';
import { DocsAppendInput } from '../src/schemas/docs.js';

describe('DocsAppendService', () => {
  const mockAuthService = {
    getAuthStatus: vi.fn().mockResolvedValue({
      authenticated: true,
      account: 'sender@example.com'
    }),
    getAuthorizedClient: vi.fn().mockResolvedValue({})
  } as unknown as AuthService;

  const mockDocsProvider = {
    appendText: vi.fn().mockResolvedValue(undefined)
  } as unknown as DocsProvider;

  const mockStore: IdempotencyStore = {
    find: async () => null,
    reserve: async () => {},
    complete: async () => {}
  };
  const idempotencyService = new IdempotencyService(mockStore);

  it('should return preview response and not call Google Docs', async () => {
    const service = new DocsAppendService(mockAuthService, mockDocsProvider, idempotencyService);
    
    const input: DocsAppendInput = {
      documentId: 'doc-1234567890',
      text: 'Hello World',
      sendMode: 'preview'
    };

    const result = await service.processAppend(input, 'default');
    expect(result.status).toBe('preview');
    expect(result.documentId).toBe('doc-1234567890');
    expect(result.textToAppend).toBe('Hello World');
    expect(result.willAppend).toBe(false);
    expect(mockDocsProvider.appendText).not.toHaveBeenCalled();
  });

  it('should append text and return success result', async () => {
    const service = new DocsAppendService(mockAuthService, mockDocsProvider, idempotencyService);
    
    const input: DocsAppendInput = {
      documentId: 'doc-1234567890',
      text: 'Hello World',
      sendMode: 'send',
      idempotencyKey: 'test-key-2'
    };

    const result = await service.processAppend(input, 'default') as any;
    expect(result.status).toBe('appended');
    expect(result.documentId).toBe('doc-1234567890');
    expect(mockDocsProvider.appendText).toHaveBeenCalledWith(expect.anything(), 'doc-1234567890', 'Hello World');
  });
});
