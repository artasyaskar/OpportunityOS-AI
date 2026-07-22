import { aiRouter } from '../router';

export interface ResearchResult {
  Title: string;
  ResearchArea: string;
  Problem: string;
  ResearchGap: string;
  Novelty: string;
  Methodology: string;
  Algorithms: string[];
  Dataset: string;
  Tools: string[];
  Results: string;
  Limitations: string;
  Keywords: string[];
  FutureWork: string;
  PersonalContribution: string;
  Impact: string;
}

export async function runResearchAgent(documentText: string): Promise<ResearchResult> {
  const truncatedText = documentText.substring(0, 15000); // Expanded token limit to capture full methodologies
  
  const prompt = `
You are an elite academic Research Agent. Your task is to deeply analyze the following research paper, thesis, or technical report, and extract structured Knowledge Nodes.

DOCUMENT TEXT:
"""
${truncatedText}
"""
`;

  const systemInstruction = `
You must respond in strict JSON matching the requested structure. Extract:
1. "Title": The title of the paper or project.
2. "ResearchArea": The broad domain (e.g., Computer Vision, NLP).
3. "Problem": What problem are they trying to solve?
4. "ResearchGap": What was missing in previous literature?
5. "Novelty": What is the unique contribution here?
6. "Methodology": How did they solve it?
7. "Algorithms": List of key algorithms or models used.
8. "Dataset": What data was used?
9. "Tools": Software, hardware, or frameworks (e.g., PyTorch, AWS).
10. "Results": Key quantitative or qualitative outcomes.
11. "Limitations": What are the bounds of this research?
12. "Keywords": 5-8 crucial technical keywords.
13. "FutureWork": Next steps mentioned.
14. "PersonalContribution": If this is a personal portfolio piece or applicant's paper, extract their specific role if mentioned. Otherwise say "Primary Author / Unspecified".
15. "Impact": The real-world or academic impact of this work.
  `;

  const response = await aiRouter.runWithRetry<ResearchResult>(
    'ResearchAgent',
    async (provider) => {
      return provider.generateJSON<ResearchResult>(prompt, systemInstruction);
    },
    { format: 'json' }
  );

  return response.content;
}
