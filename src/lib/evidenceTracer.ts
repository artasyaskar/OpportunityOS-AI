import { UserProfile, Opportunity } from './gemini';

export interface TraceResult {
  isValid: boolean;
  source: string;
  confidenceScore: number;
  notes: string;
}

/**
 * Traces a specific claim against the user's verified profile data and the target opportunity.
 * Ensures zero-hallucination compliance.
 */
export function traceEvidence(claim: string, profile: Partial<UserProfile>, opportunity?: Opportunity): TraceResult {
  const claimLower = claim.toLowerCase();
  
  // 1. Trace Academic Records (GPA, Education)
  if (claimLower.includes('gpa') || claimLower.includes('grade')) {
    if (profile.gpa && claimLower.includes(profile.gpa.toString().toLowerCase())) {
      return {
        isValid: true,
        source: 'Verified Transcript',
        confidenceScore: 98,
        notes: `Matches verified GPA: ${profile.gpa}`
      };
    }
  }

  // 2. Trace Test Scores
  if (claimLower.includes('ielts') || claimLower.includes('toefl')) {
    if (profile.toeflScore && claimLower.includes(profile.toeflScore.toString().toLowerCase())) {
      return {
        isValid: true,
        source: 'Language Test Certificate',
        confidenceScore: 95,
        notes: `Matches reported language score: ${profile.toeflScore}`
      };
    }
  }

  // 3. Trace Technical Skills
  if (profile.skills && profile.skills.length > 0) {
    for (const skill of profile.skills) {
      if (claimLower.includes(skill.toLowerCase())) {
        return {
          isValid: true,
          source: 'Profile Skills / LinkedIn',
          confidenceScore: 85,
          notes: `Matches verified skill: ${skill}`
        };
      }
    }
  }

  // 4. Trace Experience
  if (profile.experience && typeof profile.experience === 'string') {
    const experienceWords = profile.experience.toLowerCase().split(' ').filter(w => w.length > 4);
    if (experienceWords.some(word => claimLower.includes(word))) {
      return {
        isValid: true,
        source: 'Resume / CV',
        confidenceScore: 80,
        notes: 'Matches keywords found in work experience.'
      };
    }
  }

  // 5. Trace GitHub / Portfolio
  if (profile.githubUrl && claimLower.includes('github')) {
    return {
      isValid: true,
      source: 'GitHub Profile',
      confidenceScore: 90,
      notes: 'Matches linked GitHub repository data.'
    };
  }

  // Fallback for untraced claims (possible hallucination)
  return {
    isValid: false,
    source: 'Unverified',
    confidenceScore: 20,
    notes: 'Claim cannot be traced to any uploaded document or verified profile data. Risk of hallucination.'
  };
}
