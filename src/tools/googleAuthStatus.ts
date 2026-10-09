import { z } from 'zod';

import { AuthService } from '../services/AuthService.js';

export const googleAuthStatusSchema = z.object({});

export type GoogleAuthStatusInput = z.infer<typeof googleAuthStatusSchema>;

export async function googleAuthStatus(input: GoogleAuthStatusInput, authService: AuthService) {
  // Using 'default' principal ID for local stdio MVP
  return await authService.getAuthStatus('default');
}
