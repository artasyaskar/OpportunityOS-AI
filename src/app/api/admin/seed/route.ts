import { NextResponse } from 'next/server';
import { OpportunityRepository } from '@/lib/repositories/OpportunityRepository';
import { SEED_OPPORTUNITIES } from '@/lib/opportunities';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    // In production, this should verify a valid admin Firebase token.
    // For this migration MVP, we'll use a simple secret token.
    if (authHeader !== `Bearer ${process.env.ADMIN_SECRET || 'dev-secret'}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await OpportunityRepository.bulkInsert(SEED_OPPORTUNITIES);
    
    return NextResponse.json({ 
      success: true, 
      message: `Successfully seeded ${SEED_OPPORTUNITIES.length} opportunities.` 
    });
  } catch (error: any) {
    console.error('Seed Error:', error);
    return NextResponse.json({ error: 'Failed to seed opportunities: ' + error.message }, { status: 500 });
  }
}
