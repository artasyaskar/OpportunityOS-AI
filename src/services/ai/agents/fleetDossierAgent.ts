import { aiRouter } from '../router';
import { type UserProfile, type Opportunity } from '@/lib/gemini';

export interface FleetDossierResult {
  // 1. Discovery Agent (#01)
  discovery: {
    matchedCategory: string;
    targetTier: 'Reach' | 'Target' | 'Safety';
    similarOpportunities: Array<{ title: string; provider: string; matchScore: number }>;
  };
  // 2. Probability Engine (#02)
  probability: {
    successProbability: number;
    confidence: 'high' | 'medium' | 'low';
    recommendation: 'apply_now' | 'strengthen_first' | 'skip';
    reasoning: string;
    strengths: string[];
    weaknesses: string[];
    factors: {
      academic: { score: number; note: string };
      experience: { score: number; note: string };
      skills: { score: number; note: string };
      leadership: { score: number; note: string };
      fit: { score: number; note: string };
    };
  };
  // 3. Eligibility Agent (#03)
  eligibility: {
    eligible: boolean;
    eligibilityScore: number;
    metRequirements: string[];
    missingRequirements: string[];
    summary: string;
  };
  // 4. Gap Analysis Agent (#04)
  gapAnalysis: {
    readinessPercentage: number;
    estimatedTimeToReady: string;
    gaps: Array<{ item: string; priority: 'critical' | 'high' | 'medium' | 'low'; timeEstimate: string }>;
    actionPlan: Array<{ step: number; action: string; timeline: string; resources: string[] }>;
  };
  // 5. Strategist Agent (#05)
  strategist: {
    priorityRank: string;
    bestTimeToApply: string;
    strategicRationale: string;
    sequencingAdvice: string;
  };
  // 6. Application Builder (#06)
  applicationDraft: {
    title: string;
    type: string;
    essayText: string;
    evidenceUsed: string[];
    confidence: 'High' | 'Medium' | 'Low';
  };
  // 7. Review Agent (#07)
  reviewer: {
    overallScore: number;
    scores: {
      relevance: number;
      clarity: number;
      impact: number;
      authenticity: number;
      structure: number;
    };
    verdict: string;
    keyFeedback: string;
    criticalWeakness: string;
  };
  // 8. Compliance Agent (#08)
  compliance: {
    overallCompliant: boolean;
    completionPercentage: number;
    checklist: Array<{ requirement: string; status: 'complete' | 'incomplete' | 'warning'; note?: string }>;
  };
  // 9. Planner Agent (#09)
  planner: {
    totalDays: number;
    phases: Array<{
      phase: string;
      days: string;
      tasks: Array<{ day: number; task: string; priority: 'critical' | 'high' | 'medium' | 'low'; duration: string }>;
    }>;
    criticalMilestones: Array<{ day: number; milestone: string; buffer: string }>;
  };
  // 10. Rejection Learner (#10)
  rejectionLearner: {
    likelyCauses: string[];
    pitfallPrevention: string[];
    competitiveEdge: string;
  };
  // 11. Portfolio Agent (#11)
  portfolio: {
    portfolioHealthScore: number;
    riskLevel: 'Low' | 'Medium' | 'High';
    diversificationAdvice: string;
  };
  // 12. Readiness Agent (#12)
  readiness: {
    overallScore: number;
    breakdown: {
      resume: { score: number; status: string; note: string };
      transcripts: { score: number; status: string; note: string };
      essays: { score: number; status: string; note: string };
      recommendations: { score: number; status: string; note: string };
    };
  };
  executiveSummary: string;
  coordinatedAgents: string[];
}

export async function runFleetDossierAgent(
  profile: UserProfile,
  opportunity: Opportunity,
  evidenceContext?: string,
  userId?: string
): Promise<FleetDossierResult> {
  const safeOpp = opportunity || {
    id: 'opp_general',
    title: 'Global Scholarship & Fellowship Program',
    provider: 'OpportunityOS',
    type: 'Scholarship',
    description: 'Competitive global opportunity requiring top merit, leadership, and verified achievements.'
  };

  const prompt = `You are the AI Chief Opportunity Officer for OpportunityOS.
Execute a single-pass master orchestration coordinating ALL 12 specialized models behind the scenes.

CRITICAL OBJECTIVITY & REALISM DIRECTIVES:
1. STRICT HONEST TRUTH — ZERO ARTIFICIAL FLATTERY:
   - Provide a realistic, grounded, and candid evaluation. Do NOT give unearned 95-100% scores unless the candidate's verified vault evidence proves world-class distinction.
   - Accurately assess the candidate's actual qualifications against the target opportunity.
2. EVIDENCE GROUNDING:
   - Base all factors strictly on the verified documents in the Vault and Profile information.
   - If the candidate has only 1 or 2 documents uploaded, explicitly note missing verification items (e.g. unverified transcripts, pending LORs, uncertified test scores).
3. PROBABILITY & GAP CALIBRATION:
   - Highly competitive opportunities (e.g., Rhodes, Fulbright, top-tier fellowships) typically have real win rates between 15% and 55% for competitive candidates. Do not artificially inflate to 95%.
   - Clearly state real bottlenecks, missing credentials, and specific pitfalls.

CANDIDATE PROFILE:
${JSON.stringify(profile)}

VERIFIED VAULT EVIDENCE:
${evidenceContext || '1 Verified Document recorded in Vault.'}

TARGET OPPORTUNITY:
${JSON.stringify(safeOpp)}

Respond STRICTLY with valid JSON adhering to the complete FleetDossierResult schema:
{
  "discovery": {
    "matchedCategory": "Target Opportunity Discipline",
    "targetTier": "Target",
    "similarOpportunities": [
      { "title": "Related Opportunity Title", "provider": "Provider Name", "matchScore": 78 }
    ]
  },
  "probability": {
    "successProbability": 68,
    "confidence": "medium",
    "recommendation": "strengthen_first",
    "reasoning": "Objective assessment of candidate qualifications against competitive applicant pool.",
    "strengths": ["Demonstrated domain foundation", "Targeted academic alignment"],
    "weaknesses": ["Limited formal proof of external leadership", "Missing official recommendation endorsements"],
    "factors": {
      "academic": { "score": 75, "note": "Solid baseline, but requires official certified transcript" },
      "experience": { "score": 70, "note": "Demonstrated projects, needs deeper documented impact metrics" },
      "skills": { "score": 80, "note": "Strong relevant skillset match for program requirements" },
      "leadership": { "score": 60, "note": "Requires verifiable community or institutional leadership evidence" },
      "fit": { "score": 75, "note": "Aligned with program theme, but needs explicit value-add framing" }
    }
  },
  "eligibility": {
    "eligible": true,
    "eligibilityScore": 82,
    "metRequirements": ["Basic field criteria", "Language foundation"],
    "missingRequirements": ["Official Letter of Recommendation from academic referee", "Certified institutional endorsement"],
    "summary": "Meets core eligibility criteria; supplemental endorsements required prior to submission."
  },
  "gapAnalysis": {
    "readinessPercentage": 68,
    "estimatedTimeToReady": "2-3 Weeks",
    "gaps": [
      { "item": "Secure 2 verified academic recommendation letters", "priority": "critical", "timeEstimate": "10-14 days" },
      { "item": "Quantify measurable impact metrics in project portfolio", "priority": "high", "timeEstimate": "3-5 days" }
    ],
    "actionPlan": [
      { "step": 1, "action": "Refine project portfolio with verified metrics", "timeline": "Days 1-4", "resources": ["Vault Evidence"] },
      { "step": 2, "action": "Formally request reference letters from faculty mentors", "timeline": "Days 5-14", "resources": ["Faculty Mentors"] },
      { "step": 3, "action": "Iterate personal statement draft through AI Rubric Review", "timeline": "Days 15-20", "resources": ["Review Agent"] }
    ]
  },
  "strategist": {
    "priorityRank": "Primary Target (#1)",
    "bestTimeToApply": "21 Days Before Final Deadline",
    "strategicRationale": "Submitting three weeks early bypasses portal congestion and places draft in initial reviewer cohort.",
    "sequencingAdvice": "Finalize recommendation letters before locking the final SOP submission."
  },
  "applicationDraft": {
    "title": "Statement of Purpose / Personal Statement",
    "type": "Personal Statement",
    "essayText": "Personal statement draft written in an authentic, executive voice strictly grounded in the candidate's actual vault background...",
    "evidenceUsed": ["Candidate Vault Evidence"],
    "confidence": "High"
  },
  "reviewer": {
    "overallScore": 78,
    "scores": {
      "relevance": 8,
      "clarity": 8,
      "impact": 7,
      "authenticity": 9,
      "structure": 7
    },
    "verdict": "Solid Draft - Needs Stronger Evidence Anchors",
    "keyFeedback": "The narrative is authentic, but claims regarding project outcomes need direct quantified metrics.",
    "criticalWeakness": "Project descriptions lack quantitative scope and outcome data."
  },
  "compliance": {
    "overallCompliant": false,
    "completionPercentage": 75,
    "checklist": [
      { "requirement": "Statement of Purpose Word Limit", "status": "complete", "note": "Within limits" },
      { "requirement": "Official Academic Transcript Upload", "status": "warning", "note": "Requires official seal" },
      { "requirement": "Two Reference Contact Letters", "status": "incomplete", "note": "Letters pending confirmation" }
    ]
  },
  "planner": {
    "totalDays": 45,
    "phases": [
      {
        "phase": "Phase 1: Evidence Assembly & LOR Outreach",
        "days": "Days 1-14",
        "tasks": [
          { "day": 3, "task": "Request Letters of Recommendation from referees", "priority": "critical", "duration": "2 hours" },
          { "day": 8, "task": "Upload verified transcript to Vault", "priority": "high", "duration": "1 hour" }
        ]
      },
      {
        "phase": "Phase 2: Draft Refinement & Compliance Audit",
        "days": "Days 15-30",
        "tasks": [
          { "day": 18, "task": "Run AI Reviewer rubric scoring on SOP draft", "priority": "high", "duration": "2 hours" },
          { "day": 25, "task": "Verify all portal requirement fields", "priority": "critical", "duration": "1 hour" }
        ]
      },
      {
        "phase": "Phase 3: Final Polish & Early Submission",
        "days": "Days 31-45",
        "tasks": [
          { "day": 38, "task": "Submit completed application bundle 7 days before deadline", "priority": "critical", "duration": "1 hour" }
        ]
      }
    ],
    "criticalMilestones": [
      { "day": 14, "milestone": "All core credentials and LOR confirmations secured", "buffer": "5 days" },
      { "day": 38, "milestone": "Final Early Submission Completed", "buffer": "7 days" }
    ]
  },
  "rejectionLearner": {
    "likelyCauses": [
      "Submitting generic personal statements without verifiable project metrics",
      "Delayed letter of recommendation submissions past the portal cutoff"
    ],
    "pitfallPrevention": [
      "Ground every ambition in concrete evidence already completed in candidate vault.",
      "Follow up with referees at least 14 days before the official deadline."
    ],
    "competitiveEdge": "Authentic practical background and focused specialization in domain technologies."
  },
  "portfolio": {
    "portfolioHealthScore": 74,
    "riskLevel": "Medium",
    "diversificationAdvice": "Balance this competitive program with 2 additional target-tier and 1 safety-tier applications."
  },
  "readiness": {
    "overallScore": 70,
    "breakdown": {
      "resume": { "score": 85, "status": "Verified", "note": "Up to date in Vault" },
      "transcripts": { "score": 75, "status": "Unverified", "note": "Requires official uploaded copy" },
      "essays": { "score": 80, "status": "Draft Ready", "note": "Master draft prepared by Builder" },
      "recommendations": { "score": 40, "status": "Pending", "note": "Referees not yet uploaded" }
    }
  },
  "executiveSummary": "Realistic, objective executive appraisal across all 12 specialized models showing a viable candidate foundation with specific credential gaps in recommendation letters and formal verification that must be completed prior to submission.",
  "coordinatedAgents": [
    "Discovery Agent (#01)",
    "Probability Engine (#02)",
    "Eligibility Agent (#03)",
    "Gap Analysis Agent (#04)",
    "Strategist Agent (#05)",
    "Application Builder (#06)",
    "Review Agent (#07)",
    "Compliance Agent (#08)",
    "Planner Agent (#09)",
    "Rejection Learner (#10)",
    "Portfolio Agent (#11)",
    "Readiness Agent (#12)"
  ]
}`;

  const response = await aiRouter.runWithRetry<FleetDossierResult>(
    'FleetDossierAgent',
    async (provider) => {
      return provider.generateJSON<FleetDossierResult>(
        prompt,
        'You are the AI Chief Opportunity Officer providing an objective, unvarnished, truthful 12-agent intelligence dossier.'
      );
    },
    {
      format: 'json',
      taskType: 'complex_reasoning',
      cacheKey: `fleet_12_dossier_${profile?.userId || 'anon'}_${safeOpp.id}_${evidenceContext?.length || 0}`,
      userId
    }
  );

  return response.content;
}
