import { type UserProfile, type Opportunity } from './gemini';

// ========================
// EVIDENCE-BASED MATCHING TYPES
// ========================

export type RequirementStatus = 'ready' | 'missing' | 'weak' | 'unknown';

export interface EvidenceMatch {
  requirement: string;
  status: RequirementStatus;
  evidence?: string;       // What evidence supports this
  source?: string;         // Where the evidence came from (e.g. "Resume", "Transcript", "Manual Entry")
  confidence: 'high' | 'medium' | 'low';
  lastUpdated?: string;
}

export interface EvidenceMatchResult {
  ready: EvidenceMatch[];
  missing: EvidenceMatch[];
  weak: EvidenceMatch[];
  unknown: EvidenceMatch[];
  documentsReady: string[];
  documentsMissing: string[];
  overallReadiness: number;  // 0-100 computed from evidence
}

// ========================
// LEGACY SCORE TYPES (preserved for backward compat)
// ========================

export interface ScoreBreakdown {
  eligibility: number;
  readiness: number;
  roi: number;
  probability: number;
  competition: number;
}

export interface ScoreResult {
  score: number;
  breakdown: ScoreBreakdown;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  riskLevel: 'low' | 'medium' | 'high';
  evidenceMatch: EvidenceMatchResult; // NEW: evidence-based matching
}

// ========================
// HELPER: Normalize skills to array
// ========================

function normalizeSkills(skills: any): string[] {
  if (Array.isArray(skills)) return skills;
  if (typeof skills === 'string') return skills.split(',').map((s: string) => s.trim()).filter(Boolean);
  return [];
}

// ========================
// EVIDENCE-BASED MATCHING ENGINE
// ========================

export function computeEvidenceMatch(
  profile: UserProfile | null,
  opportunity: Opportunity
): EvidenceMatchResult {
  const ready: EvidenceMatch[] = [];
  const missing: EvidenceMatch[] = [];
  const weak: EvidenceMatch[] = [];
  const unknown: EvidenceMatch[] = [];
  const documentsReady: string[] = [];
  const documentsMissing: string[] = [];

  if (!profile) {
    // No profile — everything is unknown
    (opportunity.requirements || []).forEach(req => {
      unknown.push({ requirement: req, status: 'unknown', confidence: 'low' });
    });
    return { ready, missing, weak, unknown, documentsReady, documentsMissing, overallReadiness: 0 };
  }

  // --- Academic Standing ---
  if (profile.gpa) {
    const gpaNum = parseFloat(profile.gpa);
    const requiredGPA = opportunity.requiredGPA ? parseFloat(opportunity.requiredGPA) : null;
    
    if (!isNaN(gpaNum)) {
      if (requiredGPA && !isNaN(requiredGPA)) {
        if (gpaNum >= requiredGPA) {
          ready.push({ requirement: `GPA ≥ ${requiredGPA}`, status: 'ready', evidence: `GPA ${profile.gpa}`, source: 'Transcript / Profile', confidence: 'high' });
        } else {
          weak.push({ requirement: `GPA ≥ ${requiredGPA}`, status: 'weak', evidence: `GPA ${profile.gpa} is below ${requiredGPA}`, source: 'Transcript / Profile', confidence: 'high' });
        }
      } else if (gpaNum >= 3.5) {
        ready.push({ requirement: 'Strong Academic Standing', status: 'ready', evidence: `GPA ${profile.gpa} (Top Percentile)`, source: 'Transcript / Profile', confidence: 'high' });
      } else if (gpaNum >= 3.0) {
        weak.push({ requirement: 'Strong Academic Standing', status: 'weak', evidence: `GPA ${profile.gpa} — slightly below elite benchmarks`, source: 'Transcript / Profile', confidence: 'high' });
      } else {
        weak.push({ requirement: 'Strong Academic Standing', status: 'weak', evidence: `GPA ${profile.gpa} — below competitive threshold`, source: 'Transcript / Profile', confidence: 'high' });
      }
    }
  } else {
    missing.push({ requirement: 'Academic Standing (GPA)', status: 'missing', confidence: 'low' });
  }

  // --- English Proficiency ---
  const requiresEnglish = opportunity.requirements?.some(r => r.toLowerCase().includes('ielts') || r.toLowerCase().includes('toefl') || r.toLowerCase().includes('english'));
  const requiredTests = opportunity.requiredTests || [];
  
  if (profile.ieltsScore) {
    const ieltsNum = parseFloat(profile.ieltsScore);
    const requiredIelts = requiredTests.find(t => t.toLowerCase().includes('ielts'));
    const requiredMin = requiredIelts ? parseFloat(requiredIelts.replace(/[^\d.]/g, '')) : 6.5;
    
    if (!isNaN(ieltsNum) && ieltsNum >= requiredMin) {
      ready.push({ requirement: `IELTS ≥ ${requiredMin}`, status: 'ready', evidence: `IELTS Band ${profile.ieltsScore}`, source: 'Test Score / Profile', confidence: 'high' });
      documentsReady.push('IELTS Certificate');
    } else {
      weak.push({ requirement: `IELTS ≥ ${requiredMin}`, status: 'weak', evidence: `IELTS ${profile.ieltsScore} is below ${requiredMin}`, source: 'Test Score / Profile', confidence: 'high' });
      documentsMissing.push('IELTS Certificate (needs improvement)');
    }
  } else if (profile.toeflScore) {
    ready.push({ requirement: 'English Proficiency', status: 'ready', evidence: `TOEFL Score ${profile.toeflScore}`, source: 'Test Score / Profile', confidence: 'high' });
    documentsReady.push('TOEFL Certificate');
  } else if (requiresEnglish) {
    missing.push({ requirement: 'English Proficiency (IELTS/TOEFL)', status: 'missing', confidence: 'low' });
    documentsMissing.push('IELTS/TOEFL Certificate');
  }

  // --- Research / Publications ---
  const requiresResearch = opportunity.requirements?.some(r => r.toLowerCase().includes('research') || r.toLowerCase().includes('publication'));
  const paperCount = profile.researchPapers?.length || profile.publicationsCount || 0;
  
  if (paperCount > 0) {
    const paperEvidence = profile.researchPapers?.length
      ? profile.researchPapers.map(p => p.title).join(', ')
      : `${paperCount} publication(s)`;
    ready.push({ requirement: 'Research Experience', status: 'ready', evidence: paperEvidence, source: 'Resume / Profile', confidence: 'high' });
  } else if (requiresResearch) {
    missing.push({ requirement: 'Research / Publications', status: 'missing', confidence: 'low' });
  }

  // --- Work Experience ---
  const requiresExperience = opportunity.requirements?.some(r => r.toLowerCase().includes('work experience') || r.toLowerCase().includes('professional'));
  const hasExperience = (profile.workExperience && profile.workExperience.length > 0) || !!profile.experience;
  
  if (hasExperience) {
    const expEvidence = profile.workExperience?.length
      ? profile.workExperience.map(w => `${w.role} at ${w.company}`).join(', ')
      : profile.experience || 'Work experience on record';
    ready.push({ requirement: 'Work Experience', status: 'ready', evidence: expEvidence, source: 'Resume / Profile', confidence: 'medium' });
  } else if (requiresExperience || opportunity.requiredExperience) {
    missing.push({ requirement: opportunity.requiredExperience || 'Work Experience', status: 'missing', confidence: 'low' });
  }

  // --- Leadership ---
  const requiresLeadership = opportunity.requirements?.some(r => r.toLowerCase().includes('leadership'));
  const skillsArray = normalizeSkills(profile.skills);
  const hasLeadership = skillsArray.some(s => s.toLowerCase().includes('lead') || s.toLowerCase().includes('organize') || s.toLowerCase().includes('manage') || s.toLowerCase().includes('president') || s.toLowerCase().includes('captain'));
  
  if (hasLeadership) {
    const leaderSkills = skillsArray.filter(s => s.toLowerCase().includes('lead') || s.toLowerCase().includes('manage') || s.toLowerCase().includes('organize'));
    ready.push({ requirement: 'Leadership Experience', status: 'ready', evidence: leaderSkills.join(', '), source: 'Skills / Profile', confidence: 'medium' });
  } else if (requiresLeadership) {
    missing.push({ requirement: 'Leadership Experience', status: 'missing', confidence: 'low' });
  }

  // --- Passport ---
  const hasPassport = profile.country || profile.verifiedEvidence?.some(e => e.source.toLowerCase().includes('passport'));
  if (hasPassport) {
    ready.push({ requirement: 'Valid Passport', status: 'ready', evidence: 'Passport on file', source: 'Profile', confidence: 'high' });
    documentsReady.push('Passport Copy');
  } else {
    missing.push({ requirement: 'Valid Passport', status: 'missing', confidence: 'low' });
    documentsMissing.push('Passport Copy');
  }

  // --- Recommendation Letters ---
  const requiresLOR = opportunity.requirements?.some(r => r.toLowerCase().includes('recommendation') || r.toLowerCase().includes('letter'));
  const lorCount = profile.lorDetails?.length || 0;
  
  if (lorCount > 0 || profile.hasLOR) {
    const lorEvidence = profile.lorDetails?.length
      ? profile.lorDetails.map(l => `${l.recommenderName} (${l.relationship || 'Reference'})`).join(', ')
      : 'Letters of Recommendation on file';
    ready.push({ requirement: 'Recommendation Letters', status: 'ready', evidence: lorEvidence, source: 'Profile / Uploads', confidence: 'medium' });
    documentsReady.push('Recommendation Letters');
  } else if (requiresLOR) {
    missing.push({ requirement: 'Recommendation Letters', status: 'missing', confidence: 'low' });
    documentsMissing.push('Recommendation Letters');
  }

  // --- Resume ---
  const hasResume = profile.verifiedEvidence?.some(e => e.source.toLowerCase().includes('resume')) || false;
  if (hasResume) {
    documentsReady.push('Resume / CV');
  } else {
    documentsMissing.push('Resume / CV');
  }

  // --- Transcript ---
  const hasTranscript = profile.verifiedEvidence?.some(e => e.source.toLowerCase().includes('transcript')) || false;
  if (hasTranscript) {
    documentsReady.push('Official Transcript');
  } else {
    documentsMissing.push('Official Transcript');
  }

  // Compute overall readiness from evidence
  const totalChecks = ready.length + missing.length + weak.length + unknown.length;
  const overallReadiness = totalChecks > 0 ? Math.round((ready.length / totalChecks) * 100) : 0;

  return { ready, missing, weak, unknown, documentsReady, documentsMissing, overallReadiness };
}

// ========================
// MAIN SCORING FUNCTION (PRESERVED + EXTENDED)
// ========================

export function calculateOpportunityScore(
  profile: UserProfile | null,
  opportunity: Opportunity
): ScoreResult {
  // Compute evidence-based matching first
  const evidenceMatch = computeEvidenceMatch(profile, opportunity);

  // 1. Calculate Eligibility Score from evidence
  let eligibility = 50;
  if (profile) {
    const totalEv = evidenceMatch.ready.length + evidenceMatch.missing.length + evidenceMatch.weak.length;
    if (totalEv > 0) {
      eligibility = Math.round(((evidenceMatch.ready.length + evidenceMatch.weak.length * 0.4) / totalEv) * 100);
    }
  }

  // 2. Calculate Readiness Score from documents
  let readiness = 50;
  const totalDocs = evidenceMatch.documentsReady.length + evidenceMatch.documentsMissing.length;
  if (totalDocs > 0) {
    readiness = Math.round((evidenceMatch.documentsReady.length / totalDocs) * 100);
  }

  // 3. Calculate ROI Score (0-100)
  let roi = 70;
  const funding = opportunity.fundingLevel?.toLowerCase() || '';
  if (funding.includes('full') || funding.includes('100%')) {
    roi = 98;
  } else if (funding.includes('stipend') || funding.includes('€') || funding.includes('£') || funding.includes('$')) {
    roi = 85;
  } else {
    roi = 60;
  }

  // 4. Probability — derived from evidence readiness (no fabricated percentages)
  const probability = evidenceMatch.overallReadiness;

  // 5. Calculate Competition Score
  let competition = 75;
  if (opportunity.competitionLevel === 'high') {
    competition = 45;
  } else if (opportunity.competitionLevel === 'medium') {
    competition = 70;
  } else {
    competition = 90;
  }

  // 6. Compute Unified Opportunity Score
  const score = Math.round(
    eligibility * 0.3 +
    readiness * 0.2 +
    roi * 0.15 +
    probability * 0.2 +
    competition * 0.15
  );

  // 7. Risk level
  let riskLevel: 'low' | 'medium' | 'high' = 'medium';
  if (score >= 80) riskLevel = 'low';
  else if (score < 60) riskLevel = 'high';

  // 8. Generate explanations from evidence
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];

  // Strengths from ready evidence
  evidenceMatch.ready.forEach(e => {
    strengths.push(`${e.requirement}: ${e.evidence || 'Verified'} (Source: ${e.source || 'Profile'})`);
  });

  // Weaknesses from weak/missing evidence
  evidenceMatch.weak.forEach(e => {
    weaknesses.push(`Weak: ${e.requirement} — ${e.evidence || 'Below threshold'}`);
  });
  evidenceMatch.missing.forEach(e => {
    weaknesses.push(`Missing: ${e.requirement}`);
  });

  // Recommendations from missing evidence
  evidenceMatch.missing.forEach(e => {
    if (e.requirement.toLowerCase().includes('ielts') || e.requirement.toLowerCase().includes('english')) {
      recommendations.push('Register for IELTS exam to meet English proficiency requirements.');
    } else if (e.requirement.toLowerCase().includes('passport')) {
      recommendations.push('Obtain a valid travel passport early in the preparation process.');
    } else if (e.requirement.toLowerCase().includes('recommendation') || e.requirement.toLowerCase().includes('letter')) {
      recommendations.push('Request formal recommendation letters from academic or professional supervisors.');
    } else if (e.requirement.toLowerCase().includes('research') || e.requirement.toLowerCase().includes('publication')) {
      recommendations.push('Participate in research projects or publish findings to strengthen your profile.');
    } else if (e.requirement.toLowerCase().includes('leadership')) {
      recommendations.push('Lead a university society, community project, or professional initiative.');
    } else if (e.requirement.toLowerCase().includes('experience')) {
      recommendations.push('Gain relevant work or internship experience in your field.');
    } else {
      recommendations.push(`Address: ${e.requirement}`);
    }
  });

  evidenceMatch.weak.forEach(e => {
    if (e.requirement.toLowerCase().includes('gpa') || e.requirement.toLowerCase().includes('academic')) {
      recommendations.push('Strengthen your academic transcript through additional coursework or certifications.');
    } else if (e.requirement.toLowerCase().includes('ielts')) {
      recommendations.push('Retake IELTS and aim for a higher band score.');
    }
  });

  if (evidenceMatch.documentsMissing.length > 0) {
    recommendations.push(`Upload missing documents: ${evidenceMatch.documentsMissing.join(', ')}`);
  }

  // Defaults
  if (strengths.length === 0) strengths.push('Complete your profile to see evidence-based strengths.');
  if (weaknesses.length === 0) weaknesses.push('No specific weaknesses identified yet.');
  if (recommendations.length === 0) recommendations.push('Use the Application Builder to generate evidence-first application documents.');

  return {
    score,
    breakdown: { eligibility, readiness, roi, probability, competition },
    strengths,
    weaknesses,
    recommendations,
    riskLevel,
    evidenceMatch,
  };
}

// ========================
// PROFILE COMPLETENESS
// ========================

export interface CompletenessItem {
  name: string;
  status: 'complete' | 'missing';
  weight: number;
}

export function calculateProfileCompleteness(profile: any | null): {
  score: number;
  items: CompletenessItem[];
} {
  const defaultItems: CompletenessItem[] = [
    { name: 'Resume Uploaded', status: 'missing', weight: 20 },
    { name: 'Transcript Uploaded', status: 'missing', weight: 15 },
    { name: 'LinkedIn Connected', status: 'missing', weight: 10 },
    { name: 'IELTS / TOEFL Certified', status: 'missing', weight: 10 },
    { name: 'Passport Available', status: 'missing', weight: 10 },
    { name: 'Recommendation Letters', status: 'missing', weight: 10 },
    { name: 'Work Experience', status: 'missing', weight: 10 },
    { name: 'Projects Documented', status: 'missing', weight: 10 },
    { name: 'Career Goal Set', status: 'missing', weight: 5 },
  ];

  if (!profile) {
    return { score: 0, items: defaultItems };
  }

  const hasResume = profile.verifiedEvidence?.some((e: any) => e.source.toLowerCase().includes('resume')) || false;
  const hasTranscript = profile.verifiedEvidence?.some((e: any) => e.source.toLowerCase().includes('transcript')) || false;
  const hasLinkedin = profile.verifiedEvidence?.some((e: any) => e.source.toLowerCase().includes('linkedin')) || false;
  const hasPassport = profile.country || profile.verifiedEvidence?.some((e: any) => e.source.toLowerCase().includes('passport')) || false;

  const items: CompletenessItem[] = [
    { name: 'Resume Uploaded', status: hasResume ? 'complete' : 'missing', weight: 20 },
    { name: 'Transcript Uploaded', status: hasTranscript ? 'complete' : 'missing', weight: 15 },
    { name: 'LinkedIn Connected', status: hasLinkedin ? 'complete' : 'missing', weight: 10 },
    { name: 'IELTS / TOEFL Certified', status: (profile.ielts || profile.toeflScore) ? 'complete' : 'missing', weight: 10 },
    { name: 'Passport Available', status: hasPassport ? 'complete' : 'missing', weight: 10 },
    { name: 'Recommendation Letters', status: (profile.hasLOR || (profile.lorDetails && profile.lorDetails.length > 0)) ? 'complete' : 'missing', weight: 10 },
    { name: 'Work Experience', status: (profile.experience || (profile.workExperience && profile.workExperience.length > 0)) ? 'complete' : 'missing', weight: 10 },
    { name: 'Projects Documented', status: (profile.projects && profile.projects.length > 0) ? 'complete' : 'missing', weight: 10 },
    { name: 'Career Goal Set', status: (profile.careerGoal || profile.goals) ? 'complete' : 'missing', weight: 5 },
  ];

  let score = 0;
  items.forEach(item => {
    if (item.status === 'complete') {
      score += item.weight;
    }
  });

  return { score, items };
}
