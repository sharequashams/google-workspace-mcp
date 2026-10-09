import { z } from 'zod';

const envSchema = z.object({
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().default('http://127.0.0.1:8787/oauth/google/callback'),
  GOOGLE_GMAIL_SCOPE: z.string().default('https://www.googleapis.com/auth/gmail.send'),
  GOOGLE_DOCS_SCOPE: z.string().default('https://www.googleapis.com/auth/documents'),
  TOKEN_STORE_PATH: z.string().default('.data/google-credentials.json'), // using plain JSON for MVP local execution
  IDEMPOTENCY_STORE_PATH: z.string().default('.data/idempotency.sqlite'),
  IDEMPOTENCY_TTL_SECONDS: z.coerce.number().default(604800),
  PORT: z.coerce.number().default(8080),
});

export const config = envSchema.parse(process.env);
