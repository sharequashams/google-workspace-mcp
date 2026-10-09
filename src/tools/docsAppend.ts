import { DocsAppendInput } from '../schemas/docs.js';
import { DocsAppendService } from '../services/DocsAppendService.js';

export async function docsAppend(input: DocsAppendInput, docsAppendService: DocsAppendService) {
  return await docsAppendService.processAppend(input, 'default');
}
