import { UserProfile, Opportunity } from '@/lib/gemini';
import { EvidenceDocument, EvidenceRepository, PassportData, IELTSData, TranscriptData, DocumentStatus } from '@/lib/repositories/EvidenceRepository';

export type EvidenceClassification = 'Verified' | 'Missing' | 'Weak' | 'User Confirmation Required' | 'Not Provided';

export interface EvidenceNode {
  type: 'academic' | 'experience' | 'skill' | 'origin' | 'goal' | 'award' | 'project' | 'metric';
  fact: string;
  source: string; // Granular Document Source, e.g. "Transcript", "Resume", "Passport"
  classification: EvidenceClassification;
}

export class HallucinationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HallucinationError';
  }
}

export class EvidenceEngine {
  /**
   * Translates verified EvidenceDocuments into undeniable EvidenceNodes.
   */
  static extractFromDocuments(docs: EvidenceDocument[]): EvidenceNode[] {
    const evidence: EvidenceNode[] = [];
    
    docs.forEach(doc => {
      const expiration = EvidenceRepository.getExpirationStatus(doc);
      if (expiration === 'Expired') return; // Skip expired evidence for core claims
      
      const sourceStr = `${doc.type.toUpperCase()} (${doc.fileName})`;
      
      if (doc.type === 'passport' && doc.status === DocumentStatus.VERIFIED && doc.extractedData) {
        const p = doc.extractedData as PassportData;
        evidence.push({ type: 'origin', fact: `Applicant nationality is ${p.nationality}.`, source: sourceStr, classification: 'Verified' });
        evidence.push({ type: 'origin', fact: `Applicant has valid passport (No. ${p.number}) until ${p.expiryDate}.`, source: sourceStr, classification: 'Verified' });
      }

      if (doc.type === 'ielts' && doc.status === DocumentStatus.VERIFIED && doc.extractedData) {
        const i = doc.extractedData as IELTSData;
        evidence.push({ type: 'metric', fact: `Applicant IELTS Overall Band is ${i.overall} (L:${i.listening}, R:${i.reading}, W:${i.writing}, S:${i.speaking}).`, source: sourceStr, classification: 'Verified' });
      }
      
      if (doc.type === 'transcript' && doc.status === DocumentStatus.VERIFIED && doc.extractedData) {
        const t = doc.extractedData as TranscriptData;
        evidence.push({ type: 'academic', fact: `Applicant CGPA is ${t.cgpa} from ${t.institution}.`, source: sourceStr, classification: 'Verified' });
      }

      if (doc.type === 'resume' && doc.status === DocumentStatus.VERIFIED) {
        evidence.push({ type: 'experience', fact: `Resume uploaded and verified on ${doc.uploadedAt}.`, source: sourceStr, classification: 'Verified' });
        
        if (doc.extractedData) {
          const r = doc.extractedData as any;
          if (r.skills && Array.isArray(r.skills)) {
            r.skills.forEach((s: string) => {
              evidence.push({ type: 'skill', fact: `Applicant possesses skill: ${s}.`, source: sourceStr, classification: 'Verified' });
            });
          }
          if (r.experience && Array.isArray(r.experience)) {
            r.experience.forEach((e: any) => {
              evidence.push({ type: 'experience', fact: `Worked at ${e.company} as ${e.role} (${e.duration}).`, source: sourceStr, classification: 'Verified' });
            });
          }
          if (r.projects && Array.isArray(r.projects)) {
            r.projects.forEach((p: any) => {
              evidence.push({ type: 'project', fact: `Completed project: ${p.title}.`, source: sourceStr, classification: 'Verified' });
            });
          }
        }
      }

      if (doc.type === 'linkedin' && doc.status === DocumentStatus.VERIFIED && doc.extractedData) {
        const l = doc.extractedData as any;
        evidence.push({ type: 'experience', fact: `LinkedIn profile connected and verified.`, source: sourceStr, classification: 'Verified' });
        if (l.skills && Array.isArray(l.skills)) {
          l.skills.forEach((s: string) => {
            evidence.push({ type: 'skill', fact: `Applicant possesses skill: ${s}.`, source: sourceStr, classification: 'Verified' });
          });
        }
      }
    });

    return evidence;
  }

  /**
   * Translates a raw UserProfile into a set of undeniable facts.
   * DEPRECATED: Evidence must now exclusively come from verified documents.
   * User preferences and goals are handled separately by the Personalization Engine.
   */
  static extractEvidence(profile: UserProfile): EvidenceNode[] {
    return []; // Completely disabled. Use extractFromDocuments instead.
  }

  /**
   * Injects the global strict guardrail and specific evidence into the prompt.
   */
  static buildGuardrailPrompt(basePrompt: string, evidence: EvidenceNode[]): string {
    const evidenceText = evidence.map((e, idx) => `[Fact ${idx + 1}] [${e.classification}] (${e.source}): ${e.fact}`).join('\n');

    const guardrail = `
=============================================
STRICT EVIDENCE & GUARDRAILS (SYSTEM DIRECTIVE)
=============================================
You are bound by a ZERO HALLUCINATION policy.
You MUST NOT invent, imply, or assume any facts about the applicant that are not explicitly provided in the EVIDENCE LIST below.
If a prompt or instruction asks you to mention a skill, award, degree, GPA, or experience that is NOT in the evidence list, you MUST explicitly state "Not Provided" or use a generic placeholder.

When categorizing data, strictly use these labels: Verified, Missing, Weak, User Confirmation Required, Not Provided.

EVIDENCE LIST:
${evidenceText || "No verified evidence available. Do not state specific facts."}

RULES:
1. Do not hallucinate universities, GPAs, names, or locations.
2. Only claim skills or experiences present in the Evidence List.
3. Your tone should be confident but strictly factual.
=============================================
`;

    return `${guardrail}\n\n${basePrompt}`;
  }

  /**
   * Post-generation validation to catch hallucinations.
   * Uses basic heuristics. For production, this could use a secondary fast LLM pass (e.g. Gemini Flash).
   */
  static validateContent(content: string, evidence: EvidenceNode[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check for common hallucination red flags (e.g. claiming a 4.0 GPA when the evidence doesn't support it)
    const gpaMatch = content.match(/GPA (?:of |is )?([0-4]\.\d{1,2})/i);
    if (gpaMatch) {
      const claimedGpa = gpaMatch[1];
      const hasGpaEvidence = evidence.some(e => e.type === 'metric' && e.fact.includes(`GPA`) && e.fact.includes(claimedGpa));
      if (!hasGpaEvidence) {
        errors.push(`Hallucination detected: Claimed GPA ${claimedGpa} is not supported by evidence.`);
      }
    }

    // Check for "Nobel Prize" or other extreme hallucinations just as an example heuristic
    if (content.toLowerCase().includes('nobel prize')) {
      const hasNobel = evidence.some(e => e.fact.toLowerCase().includes('nobel prize'));
      if (!hasNobel) {
        errors.push(`Hallucination detected: Claimed Nobel Prize not supported by evidence.`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
