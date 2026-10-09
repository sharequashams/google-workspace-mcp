import { DocsAppendInput } from '../schemas/docs.js';
import { AuthService } from './AuthService.js';
import { DocsProvider } from '../providers/google/DocsProvider.js';
import { IdempotencyService } from './IdempotencyService.js';
import { config } from '../config/env.js';

export class DocsAppendService {
  constructor(
    private authService: AuthService,
    private docsProvider: DocsProvider,
    private idempotencyService: IdempotencyService
  ) {}

  public async processAppend(input: DocsAppendInput, principalId: string = 'default') {
    const { authenticated } = await this.authService.getAuthStatus(principalId);
    
    if (!authenticated) {
      throw new Error('NOT_AUTHENTICATED: Google authorization is no longer valid or missing.');
    }

    if (input.sendMode === 'preview') {
      return {
        status: 'preview',
        documentId: input.documentId,
        textToAppend: input.text,
        willAppend: false,
      };
    }

    if (input.sendMode === 'send') {
      const payloadToHash = {
        documentId: input.documentId,
        text: input.text,
      };

      const payloadHash = this.idempotencyService.hashPayload(payloadToHash);

      return await this.idempotencyService.execute(
        input.idempotencyKey,
        'docs_append_text',
        payloadHash,
        config.IDEMPOTENCY_TTL_SECONDS,
        async () => {
          const client = await this.authService.getAuthorizedClient(principalId);
          await this.docsProvider.appendText(client, input.documentId, input.text);
          
          return {
            status: 'appended',
            documentId: input.documentId,
            idempotencyKey: input.idempotencyKey,
          };
        }
      );
    }

    throw new Error('INVALID_ARGUMENT: Unsupported sendMode.');
  }
}
