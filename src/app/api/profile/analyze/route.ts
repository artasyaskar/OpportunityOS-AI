import { NextRequest, NextResponse } from 'next/server';
import { type UserProfile } from '@/lib/gemini';
import { calculateOpportunityScore } from '@/lib/scoring';
import { SEED_OPPORTUNITIES } from '@/lib/opportunities';

export async function POST(req: NextRequest) {
  try {
    const { profile } = await req.json() as { profile: UserProfile };

    // Simulate multi-agent activation sequences
    const opportunityScore = calculateOpportunityScore({
      education: profile.gpa ? parseFloat(profile.gpa) * 25 : 75,
      experience: profile.experience ? 80 : 50,
      skills: profile.skills ? 85 : 60,
      achievements: profile.achievements ? 80 : 65,
      profileCompleteness: 100,
      applicationActivity: 30,
    });

    return NextResponse.json({
      success: true,
      opportunityScore,
      readinessScore: 58,
      portfolioHealth: 72,
      recommendationCount: SEED_OPPORTUNITIES.length,
    });
  } catch (error) {
    console.error('Master analyze route error:', error);
    return NextResponse.json({
      success: false,
      opportunityScore: 78,
      readinessScore: 58,
      portfolioHealth: 72,
      recommendationCount: SEED_OPPORTUNITIES.length,
    });
  }
}
