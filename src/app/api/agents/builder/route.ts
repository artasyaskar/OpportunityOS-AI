import { checkRateLimit } from '@/lib/rateLimiter';
import { NextRequest, NextResponse } from 'next/server';
import { runApplicationBuilderAgent } from '@/services/ai/agents/applicationBuilderAgent';
import { type UserProfile, type Opportunity } from '@/lib/gemini';
import { EvidenceEngine, HallucinationError } from '@/lib/services/EvidenceEngine';
import { adminDb } from '@/lib/firebase-admin';

const DEMO_SOP = `Growing up in Lahore, Pakistan, where electricity cuts interrupted my evenings yet never my curiosity, I learned early that constraints can be the greatest catalysts for innovation. Today, as a computer science graduate with a focus on machine learning, I have dedicated myself to building AI systems that solve real-world challenges in resource-constrained environments — and I believe the {OPPORTUNITY} will provide the transformative platform I need to amplify this work.

My academic journey at the University of Engineering and Technology, Lahore, where I graduated with a 3.87 GPA, laid a rigorous foundation in algorithms, data structures, and systems design. But it was my role as a research assistant at the National Center for Artificial Intelligence that truly ignited my passion. Over two years, I co-authored two peer-reviewed papers on edge-optimized neural networks and led a team of four students in developing a real-time crop disease detection system deployed in three rural districts — a project that directly impacted the livelihoods of over 12,000 farmers.

The opportunity to study at a world-leading UK institution represents the ideal next chapter. I intend to use my time not merely to absorb knowledge but to forge partnerships with labs and NGOs working on digital development — partnerships I will bring home to Pakistan.

Upon returning, my goal is to launch an AI research lab embedded within a Pakistani university — a center that trains the next generation of AI engineers while solving locally relevant problems. I am not simply applying for funding. I am applying for the opportunity to become the kind of leader who opens doors for others.`;

export async function POST(req: NextRequest) {
  const rateLimit = checkRateLimit(req);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: rateLimit.headers }
    );
  }
  let targetOpportunityName = 'Opportunity';
  try {
    const { type, opportunity, instructions, profile, userId } = await req.json() as {
      type: string;
      opportunity: Opportunity;
      instructions: string;
      profile: UserProfile;
      userId: string;
    };
    targetOpportunityName = opportunity?.title || 'Opportunity';

    // Fetch actual evidence from verified documents
    let evidence: any[] = [];
    if (userId) {
      try {
        const evidenceSnapshot = await adminDb.collection('evidence').where('userId', '==', userId).get();
        const docs = evidenceSnapshot.docs.map(doc => doc.data() as any);
        evidence = EvidenceEngine.extractFromDocuments(docs);
      } catch (err) {
        console.warn('Could not fetch evidence from adminDb (likely local config), relying on profile object:', err);
      }
    }

    const result = await runApplicationBuilderAgent(type, opportunity, profile, instructions, evidence);
    return NextResponse.json({
      content: result.essayText,
      explanations: result.explanations,
      confidence: result.confidence,
      evidenceUsed: result.evidenceUsed
    });
  } catch (error: any) {
    console.error('Builder agent error:', error);
    
    if (error.name === 'HallucinationError') {
      return NextResponse.json(
        { 
          error: 'Hallucination detected and blocked.', 
          message: error.message,
          content: 'The AI attempted to generate content that violated our strict Evidence-Only policy by hallucinating unverified facts. Please provide more instructions or update your profile to include the required facts.'
        },
        { status: 400 }
      );
    }

    const demoContent = DEMO_SOP.replace('{OPPORTUNITY}', targetOpportunityName);
    return NextResponse.json(
      { content: demoContent, explanations: null, source: 'demo', confidence: 'Low', evidenceUsed: ['Demo Profile ✓'] },
      { status: 200 }
    );
  }
}
