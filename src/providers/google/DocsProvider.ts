import { google, docs_v1 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { mapGoogleApiError } from './GoogleApiErrorMapper.js';

export class DocsProvider {
  async getDocument(client: OAuth2Client, documentId: string): Promise<docs_v1.Schema$Document> {
    const docs = google.docs({ version: 'v1', auth: client });
    try {
      const res = await docs.documents.get({ documentId });
      return res.data;
    } catch (error) {
      throw mapGoogleApiError(error, 'docs_get');
    }
  }

  async appendText(client: OAuth2Client, documentId: string, text: string): Promise<void> {
    const docs = google.docs({ version: 'v1', auth: client });
    
    try {
      const doc = await this.getDocument(client, documentId);
      
      // Calculate end index
      const body = doc.body;
      const content = body?.content;
      if (!content || content.length === 0) {
        throw new Error('Document body is empty or malformed');
      }
      
      // Last element's endIndex minus 1 (to insert before the final newline)
      const lastElement = content[content.length - 1];
      const endIndex = (lastElement.endIndex || 2) - 1;

      await docs.documents.batchUpdate({
        documentId,
        requestBody: {
          requests: [
            {
              insertText: {
                location: { index: endIndex },
                text: text + '\n', // Ensure we append with a newline
              },
            },
          ],
        },
      });
    } catch (error) {
      throw mapGoogleApiError(error, 'docs_append');
    }
  }
}
