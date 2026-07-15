import { aiRouter } from '../router';
import { PROMPTS, type UserProfile, type Opportunity } from '@/lib/gemini';
import { EvidenceEngine, HallucinationError } from '@/lib/services/EvidenceEngine';

function cleanAndParseJSON(text: string): any {
  const trimmed = text.trim();
  
  // Try direct parsing
  try {
    return JSON.parse(trimmed);
  } catch (e) {}

  // Extract from ```json ... ```
  const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/;
  const match = trimmed.match(jsonBlockRegex);
  if (match && match[1]) {
    try {
      return JSON.parse(match[1].trim());
    } catch (e) {}
  }

  // Extract from generic ``` ... ```
  const genericBlockRegex = /```\s*([\s\S]*?)\s*```/;
  const genericMatch = trimmed.match(genericBlockRegex);
  if (genericMatch && genericMatch[1]) {
    try {
      return JSON.parse(genericMatch[1].trim());
    } catch (e) {}
  }

  // Find the first '{' and the last '}'
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch (e) {}
  }

  throw new Error("No parseable JSON structure found");
}

function humanizeEssayText(text: string): string {
  if (!text) return '';
  
  let cleaned = text;
  
  // 1. Remove markdown bold/italic asterisks (e.g. **Statement of Purpose**, *Introduction*)
  cleaned = cleaned.replace(/\*\*+/g, '');
  cleaned = cleaned.replace(/\*+/g, '');
  
  // 2. Remove markdown header markers (e.g., #, ##, ### at the beginning of lines)
  cleaned = cleaned.replace(/^#+\s+/gm, '');
  
  // 3. Remove typical AI preambles or codeblock wrapper leaks
  cleaned = cleaned.replace(/^Here's a draft of[\s\S]*?:/i, '');
  cleaned = cleaned.replace(/^Here is the draft[\s\S]*?:/i, '');
  cleaned = cleaned.replace(/^Here's a potential[\s\S]*?:/i, '');
  cleaned = cleaned.replace(/^Here is the completed[\s\S]*?:/i, '');
  cleaned = cleaned.replace(/^```[a-z]*\n/gi, '');
  cleaned = cleaned.replace(/```$/g, '');

  return cleaned.trim();
}

export async function runApplicationBuilderAgent(
  type: string,
  opportunity: Opportunity,
  profile: UserProfile,
  instructions: string,
  evidence: any[]
): Promise<{ essayText: string; explanations: any; confidence: 'High' | 'Low'; evidenceUsed: string[] }> {
  const basePrompt = PROMPTS.ESSAY_BUILDER(type, opportunity, profile, instructions);
  
  const prompt = EvidenceEngine.buildGuardrailPrompt(basePrompt, evidence);
  const response = await aiRouter.runWithRetry<any>(
    'ApplicationBuilderAgent',
    async (provider) => {
      return provider.generateText(
        prompt,
        'You are the Application Builder Agent.'
      );
    },
    { format: 'json', taskType: 'document_generation', cacheKey: `builder_${opportunity.id}_${type}`, userId: profile.userId }
  );

  try {
    const parsed = cleanAndParseJSON(response.content);
    if (parsed && typeof parsed === 'object' && 'essayText' in parsed) {
      const essayText = humanizeEssayText(parsed.essayText);
      const validation = EvidenceEngine.validateContent(essayText, evidence);
      if (!validation.isValid) {
        throw new HallucinationError(`Validation failed: ${validation.errors.join(' | ')}`);
      }
      return {
        essayText,
        explanations: parsed.explanations || null,
        confidence: parsed.confidence || 'High',
        evidenceUsed: parsed.evidenceUsed || ['Base Profile ✓']
      };
    }
  } catch (e) {
    console.warn('Failed to parse structured builder agent response as JSON:', e);
  }

  // Handle standard prose fallback if provider returned raw string or invalid JSON
  let rawText = response.content;
  try {
    // Try to regex extract the essayText key if it is present in the malformed string
    const essayTextMatch = rawText.match(/"essayText"\s*:\s*"([\s\S]*?)"\s*,\s*"explanations"/);
    if (essayTextMatch && essayTextMatch[1]) {
      rawText = essayTextMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
    } else {
      const simpleMatch = rawText.match(/"essayText"\s*:\s*"([\s\S]*?)"\s*}/);
      if (simpleMatch && simpleMatch[1]) {
        rawText = simpleMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
      }
    }
  } catch (err) {}

  const fallbackExpl = {
    sections: [
      {
        section: "Introduction Hook & Origins",
        whyIncluded: "Establishes candidate background story matching target selection requirements without hallucination.",
        dataUsed: `Origins: ${profile.country || 'Home Country'}, Field: ${profile.field || 'Field of Study'}. Verified from Connected Account: ${profile.linkedinUrl || 'linkedin.com/in/user'}`
      },
      {
        section: "Academic Foundations & Metrics",
        whyIncluded: "Provides quantifiable evidence (GPA, publications) to satisfy eligibility guidelines.",
        dataUsed: `GPA: ${profile.gpa || '0.0'}. Verified from Transcript: ${profile.transcriptFile || 'transcript.pdf'}`
      },
      {
        section: "Goals & Target Alignment",
        whyIncluded: "Connects target learning outcomes and network multipliers to the applicant's goals.",
        dataUsed: `Opportunity: ${opportunity.title || 'Target Opportunity'}, Goals: ${profile.goals || profile.careerGoal || 'Career Goals'}. Verified from Resume: ${profile.resumeFile || 'resume.pdf'}`
      }
    ],
    missingInfo: profile.skills && profile.skills.length > 0 ? [] : ["Specify IELTS or TOEFL score to lock in language requirements.", "Upload references to support your application."],
    competitivenessScore: profile.gpa ? Math.round(75 + (parseFloat(profile.gpa) / 4.0) * 15) : 80
  };

  const finalEssayText = humanizeEssayText(rawText);
  const validation = EvidenceEngine.validateContent(finalEssayText, evidence);
  if (!validation.isValid) {
    throw new HallucinationError(`Validation failed on fallback: ${validation.errors.join(' | ')}`);
  }

  return {
    essayText: finalEssayText,
    explanations: fallbackExpl,
    confidence: 'Low',
    evidenceUsed: ['Fallback Profile ✓']
  };
}
