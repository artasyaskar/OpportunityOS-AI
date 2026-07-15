import { checkRateLimit } from '@/lib/rateLimiter';
import { NextRequest, NextResponse } from 'next/server';
import { runSubmissionPlannerAgent } from '@/services/ai/agents/submissionPlannerAgent';
import { type Opportunity } from '@/lib/gemini';

const DEMO_PLANNER = {
  totalDays: 45,
  phases: [
    {
      phase: 'Preparation (Days 1-10)',
      days: 'Day 1-10',
      tasks: [
        { day: 1, task: 'Request recommendation letters from 3 referees', priority: 'critical', duration: '30 minutes' },
        { day: 2, task: 'Gather all academic transcripts', priority: 'critical', duration: '1 hour' },
        { day: 3, task: 'Research application requirements in detail', priority: 'high', duration: '2 hours' },
        { day: 5, task: 'Create application account on scholarship portal', priority: 'high', duration: '20 minutes' },
      ],
    },
    {
      phase: 'Writing (Days 11-30)',
      days: 'Day 11-30',
      tasks: [
        { day: 11, task: 'Draft Statement of Purpose (SOP) v1', priority: 'critical', duration: '4 hours' },
        { day: 15, task: 'Review SOP with AI Agent', priority: 'critical', duration: '1 hour' },
        { day: 18, task: 'Revise SOP based on AI feedback', priority: 'critical', duration: '3 hours' },
        { day: 22, task: 'Draft personal statement', priority: 'high', duration: '3 hours' },
        { day: 25, task: 'Confirm referees have submitted letters', priority: 'critical', duration: '30 minutes' },
      ],
    },
    {
      phase: 'Review & Submit (Days 31-45)',
      days: 'Day 31-45',
      tasks: [
        { day: 31, task: 'Compliance check all documents', priority: 'critical', duration: '2 hours' },
        { day: 35, task: 'Final review of complete application', priority: 'critical', duration: '3 hours' },
        { day: 38, task: 'Get peer review from mentor', priority: 'medium', duration: '1 hour' },
        { day: 42, task: 'Submit application (3 days before deadline)', priority: 'critical', duration: '2 hours' },
      ],
    },
  ],
  criticalMilestones: [
    { day: 5, milestone: 'All referee requests sent', buffer: '5 days' },
    { day: 20, milestone: 'SOP complete and reviewed', buffer: '10 days' },
    { day: 42, milestone: 'Application submitted', buffer: '3 days' },
  ],
};

export async function POST(req: NextRequest) {
  const rateLimit = checkRateLimit(req);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: rateLimit.headers }
    );
  }
  try {
    const body = await req.json();
    const { opportunity, daysUntilDeadline, userId } = body;
    const result = await runSubmissionPlannerAgent(opportunity, daysUntilDeadline, userId);
    return NextResponse.json(result);
  } catch (error: any) {
    if (error?.name === 'InsufficientCreditsError') return NextResponse.json({ requireUpgrade: true, error: 'Insufficient AI Credits' }, { status: 402 });
    console.error('Planner agent error:', error);
    return NextResponse.json(DEMO_PLANNER);
  }
}
