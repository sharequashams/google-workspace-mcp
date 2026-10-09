import { z } from 'zod';

// We must avoid CRLF injection in headers.
const noNewlines = (val: string) => !/[\r\n]/.test(val);

export const gmailSendEmailSchema = z.object({
  to: z.array(z.string().email().refine(noNewlines)).min(1).max(50),
  cc: z.array(z.string().email().refine(noNewlines)).max(50).default([]),
  bcc: z.array(z.string().email().refine(noNewlines)).max(50).default([]),
  subject: z.string().min(1).max(998).refine(noNewlines),
  textBody: z.string().min(1).max(1000000),
  htmlBody: z.string().max(2000000).optional(),
  replyTo: z.string().email().refine(noNewlines).optional(),
  sendMode: z.enum(['preview', 'send']),
  idempotencyKey: z.string().min(8).max(128).optional(),
});

export type GmailSendEmailInput = z.infer<typeof gmailSendEmailSchema>;
