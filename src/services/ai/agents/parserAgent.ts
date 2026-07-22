import { aiRouter } from '../router';

import { SECURE_PROMPTS } from '@/lib/prompts';

export interface ParserResult {
  nodeType?: string;
  skills?: string[];
  experience?: { company: string; role: string; duration: string }[];
  projects?: { title: string; description: string; url?: string }[];
  education?: { institution: string; degree: string; year: string }[];
  metrics?: { name: string; value: string }[];
  cgpa?: string;
  nationality?: string;
  testScores?: Record<string, any>;
  extractedInsights?: Record<string, any>;
  confidenceScore?: number;
  explainability?: string;
}

export async function runParserAgent(documentText: string, documentType: string, image?: { data: string, mimeType: string }): Promise<ParserResult> {
  const truncatedText = documentText.substring(0, 8000); // Truncate to save tokens
  const prompt = SECURE_PROMPTS.PARSER(truncatedText, documentType);

  const response = await aiRouter.runWithRetry<ParserResult>(
    'ParserAgent',
    async (provider) => {
      return provider.generateJSON<ParserResult>(
        prompt,
        'You are a strict data extraction parser. Do not invent information. If an image is provided, extract data exactly as it appears in the image.',
        { image }
      );
    },
    { format: 'json', image }
  );
  return response.content;
}
