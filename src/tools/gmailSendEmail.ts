import { GmailSendEmailInput } from '../schemas/gmail.js';
import { GmailSendService } from '../services/GmailSendService.js';

export async function gmailSendEmail(input: GmailSendEmailInput, gmailSendService: GmailSendService) {
  return await gmailSendService.processSendEmail(input, 'default');
}
