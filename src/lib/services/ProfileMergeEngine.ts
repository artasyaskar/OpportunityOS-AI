import { UserProfileData } from '../repositories/UserRepository';
import { EvidenceNode } from './EvidenceEngine';

/**
 * Priorities for merging evidence into the Canonical Profile.
 * Higher number means higher priority.
 */
const SOURCE_PRIORITY: Record<string, number> = {
  'Manual User Input': 100,
  'Passport': 90,
  'National ID': 90,
  'Transcript': 80,
  'IELTS': 80,
  'TOEFL': 80,
  'Resume': 70,
  'LinkedIn': 60,
  'GitHub': 50,
  'AI Guess': 10,
};

function getPriority(source: string): number {
  const normalizedSource = source.toLowerCase();
  for (const [key, value] of Object.entries(SOURCE_PRIORITY)) {
    if (normalizedSource.includes(key.toLowerCase())) {
      return value;
    }
  }
  return 0; // Default lowest priority
}

export class ProfileMergeEngine {
  /**
   * Generates or updates a Canonical User Profile based on verified evidence.
   */
  static generateCanonicalProfile(
    existingProfile: UserProfileData,
    verifiedEvidence: EvidenceNode[]
  ): UserProfileData {
    const canonicalProfile: UserProfileData = { ...existingProfile, verifiedEvidence };

    // Group evidence by category/type to resolve conflicts
    const evidenceByType: Record<string, EvidenceNode[]> = {};
    verifiedEvidence.forEach(node => {
      if (!evidenceByType[node.type]) {
        evidenceByType[node.type] = [];
      }
      evidenceByType[node.type].push(node);
    });

    // Resolve conflicts and update the canonical profile
    for (const [type, nodes] of Object.entries(evidenceByType)) {
      // Sort nodes by priority descending
      nodes.sort((a, b) => getPriority(b.source) - getPriority(a.source));

      // The highest priority node wins for singular fields
      const winningNode = nodes[0];

      switch (type) {
        case 'academic':
          // Extract GPA if available
          const gpaMatch = winningNode.fact.match(/CGPA is ([\d.]+)/i) || winningNode.fact.match(/GPA\s*([\d.]+)/i);
          if (gpaMatch) {
            canonicalProfile.gpa = gpaMatch[1];
          }
          const instMatch = winningNode.fact.match(/from ([a-zA-Z\s]+)/i);
          if (instMatch) {
            canonicalProfile.education = instMatch[1].trim();
          }
          break;

        case 'metric':
          if (winningNode.fact.includes('IELTS')) {
            const ieltsMatch = winningNode.fact.match(/Band is ([\d.]+)/i);
            if (ieltsMatch) {
              canonicalProfile.ielts = ieltsMatch[1];
            }
          }
          break;

        case 'origin':
          const natMatch = winningNode.fact.match(/nationality is ([a-zA-Z\s]+)/i);
          if (natMatch) {
            canonicalProfile.country = natMatch[1].trim();
          }
          break;

        case 'skill':
          // Skills are cumulative, no single winner, but we can deduplicate
          const allSkills = new Set(canonicalProfile.skills ? canonicalProfile.skills.split(',').map(s => s.trim()) : []);
          nodes.forEach(n => {
            const skillMatch = n.fact.match(/skill:\s*(.+)\./i);
            if (skillMatch) {
              allSkills.add(skillMatch[1].trim());
            }
          });
          canonicalProfile.skills = Array.from(allSkills).join(', ');
          break;
          
        case 'experience':
          canonicalProfile.experience = nodes.map(n => n.fact).join(' | ');
          break;
      }
    }

    return canonicalProfile;
  }
}
