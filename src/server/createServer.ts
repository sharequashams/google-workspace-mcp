import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { googleAuthStatus } from '../tools/googleAuthStatus.js';
import { gmailSendEmail } from '../tools/gmailSendEmail.js';
import { gmailSendEmailSchema } from '../schemas/gmail.js';
import { docsAppend } from '../tools/docsAppend.js';
import { docsAppendSchema } from '../schemas/docs.js';
import { AuthService } from '../services/AuthService.js';
import { GmailSendService } from '../services/GmailSendService.js';
import { DocsAppendService } from '../services/DocsAppendService.js';
import { zodToJsonSchema } from 'zod-to-json-schema';

export function createServer(
  authService: AuthService,
  gmailSendService: GmailSendService,
  docsAppendService: DocsAppendService
) {
  const server = new Server(
    {
      name: 'google-workspace-actions',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'google_auth_status',
          description: 'Checks whether the MCP server has a usable Google authorization for the current principal and reports which supported Google actions are available. Does not return OAuth tokens.',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'gmail_send_email',
          description: 'Validates and previews or sends one email using the authenticated Gmail account. Use preview mode when the message should be reviewed before sending. Use send mode only when the user or agent workflow intends to perform the external send action.',
          inputSchema: zodToJsonSchema(gmailSendEmailSchema as any) as any,
        },
        {
          name: 'docs_append_text',
          description: 'Appends text to the end of a Google Doc. Use preview mode to see what will be appended, and send mode to perform the actual append operation.',
          inputSchema: zodToJsonSchema(docsAppendSchema as any) as any,
        }
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    switch (request.params.name) {
      case 'google_auth_status': {
        const result = await googleAuthStatus({}, authService);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          isError: false,
        };
      }
      case 'gmail_send_email': {
        const input = gmailSendEmailSchema.parse(request.params.arguments);
        const result = await gmailSendEmail(input, gmailSendService);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          isError: false,
        };
      }
      case 'docs_append_text': {
        const input = docsAppendSchema.parse(request.params.arguments);
        const result = await docsAppend(input, docsAppendService);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          isError: false,
        };
      }
      default:
        throw new Error(`Unknown tool: ${request.params.name}`);
    }
  });

  return server;
}
