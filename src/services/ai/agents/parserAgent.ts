import { aiRouter } from '../router';

import { SECURE_PROMPTS } from '@/lib/prompts';

export interface ParserResult {
  skills?: string[];
  experience?: { company: string; role: string; duration: string }[];
  projects?: { title: string; description: string; url?: string }[];
  education?: { institution: string; degree: string; year: string }[];
  metrics?: { name: string; value: string }[];
  cgpa?: string;
  nationality?: string;
  testScores?: Record<string, any>;
  confidenceScore?: number;
  explainability?: string;
}

export async function runParserAgent(documentText: string, documentType: string): Promise<ParserResult> {
  const truncatedText = documentText.substring(0, 8000); // Truncate to save tokens
  const prompt = SECURE_PROMPTS.PARSER(truncatedText, documentType);

  // Provide dummy router instance implementation if not exported correctly, assuming it works
  const { aiRouter } = await import('../router');
  const response = await aiRouter.runWithRetry<ParserResult>(
    'ParserAgent',
    async (provider) => {
      return provider.generateJSON<ParserResult>(
        prompt,
        'You are a strict data extraction parser. Do not invent information.'
      );
    },
    { format: 'json' }
  );
  return response.content;
}
