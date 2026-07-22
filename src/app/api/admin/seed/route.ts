import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { validateAdminRequest } from '@/lib/auth/serverAuth';
import { GLOBAL_OPPORTUNITIES, getCategoryCounts, getCountryCounts, getTotalFundingValue } from '@/lib/opportunities-data';

/**
 * Global platform stats are COMPUTED from the real seed dataset — never fabricated.
 * Every number below is derived from the actual opportunities that get written
 * to Firestore in the same request, so counts can never drift from reality.
 */
function computeGlobalStats() {
  const categoryCounts = getCategoryCounts();
  const countryCounts = getCountryCounts();

  const countByType = (predicate: (type: string) => boolean) =>
    GLOBAL_OPPORTUNITIES.filter(o => predicate((o.type || '').toLowerCase())).length;

  return {
    opportunitiesIndexed: GLOBAL_OPPORTUNITIES.length,
    fundingAvailable: getTotalFundingValue(),
    countriesCovered: Object.keys(countryCounts).length,
    opportunityTypes: Object.keys(categoryCounts).length,
    remoteOpportunities: GLOBAL_OPPORTUNITIES.filter(o => o.remote === true).length,
    accelerators: countByType(t => t.includes('acceler') || t.includes('incubat')),
    hackathons: countByType(t => t.includes('hackathon')),
    fellowships: countByType(t => t.includes('fellowship')),
    grants: countByType(t => t.includes('grant')),
    scholarships: countByType(t => t.includes('scholarship') || t.includes('government funding')),
    categoryCounts,
    lastUpdated: new Date().toISOString(),
  };
}

export async function POST(request: NextRequest) {
  // Real admin authentication: verify a Firebase ID token belonging to a
  // whitelisted admin. Replaces the old hardcoded ?secret= query param, which
  // could leak in logs/referrers and was not tied to any identity.
  const auth = await validateAdminRequest(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const batch = adminDb.batch();

    // 1. Seed Opportunities
    const opportunitiesRef = adminDb.collection('opportunities');
    for (const opp of GLOBAL_OPPORTUNITIES) {
      const docRef = opportunitiesRef.doc(opp.id);
      batch.set(docRef, { ...opp, createdAt: new Date().toISOString() }, { merge: true });
    }

    // 2. Seed Global Stats (computed from the exact same real dataset)
    const statsRef = adminDb.collection('system').doc('global_stats');
    batch.set(statsRef, computeGlobalStats(), { merge: true });

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: 'Successfully seeded Opportunities and Platform Stats!',
      seededCount: GLOBAL_OPPORTUNITIES.length
    });
  } catch (error: any) {
    console.error('Seeding error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
