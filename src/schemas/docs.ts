import { z } from 'zod';

export const docsAppendSchema = z.object({
  documentId: z.string().min(10).max(100), // Standard Google Doc ID
  text: z.string().min(1).max(100000), // 100KB limit per append seems reasonable for an agent
  sendMode: z.enum(['preview', 'send']),
  idempotencyKey: z.string().min(8).max(128).optional(),
});

export type DocsAppendInput = z.infer<typeof docsAppendSchema>;
