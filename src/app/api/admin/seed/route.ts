import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

const REAL_OPPORTUNITIES = [
  {
    id: 'nasa-space-apps-2026',
    title: 'NASA Space Apps Challenge 2026',
    type: 'Hackathons',
    provider: 'NASA',
    country: 'Global',
    fundingLevel: '$50,000 Prize Pool',
    deadline: '2026-10-05',
    description: 'The largest global hackathon in the world, bringing together coders, scientists, designers, and storytellers to solve challenges using open-source data from NASA.',
    requirements: ['18+ years old', 'Interest in space & technology', 'Team of 1-6 members'],
    tags: ['Space', 'Technology', 'Coding', 'Innovation', 'Hackathon'],
    url: 'https://www.spaceappschallenge.org/',
    requiredGPA: 'N/A',
    requiredExperience: 'Open to all levels',
    verificationStatus: 'verified',
    prestigeScore: 98,
    difficulty: 'hard'
  },
  {
    id: 'y-combinator-s26',
    title: 'Y Combinator Summer 2026',
    type: 'Accelerators',
    provider: 'Y Combinator',
    country: 'United States',
    fundingLevel: '$500,000 Investment',
    deadline: '2026-03-15',
    description: 'The world\'s most prestigious startup accelerator providing seed funding, mentorship, and a global network to high-potential founders.',
    requirements: ['Working prototype', 'Founding team', 'Ability to relocate to SF (optional but recommended)'],
    tags: ['Startup', 'Entrepreneurship', 'Tech', 'Funding'],
    url: 'https://www.ycombinator.com/',
    requiredGPA: 'N/A',
    requiredExperience: 'Demonstrated execution capability',
    verificationStatus: 'verified',
    prestigeScore: 100,
    difficulty: 'hard'
  },
  {
    id: 'fulbright-foreign-student-2027',
    title: 'Fulbright Foreign Student Program',
    type: 'Scholarships',
    provider: 'U.S. Department of State',
    country: 'United States',
    fundingLevel: 'Full Tuition + Stipend',
    deadline: '2026-10-15',
    description: 'Enables graduate students, young professionals and artists from abroad to study and conduct research in the United States.',
    requirements: ["Bachelor's Degree", "High English Proficiency", "J-1 Visa Eligibility"],
    tags: ['Graduate', 'Research', 'International Exchange', 'Prestigious'],
    url: 'https://foreign.fulbrightonline.org/',
    requiredGPA: '3.5/4.0',
    requiredExperience: 'Early-mid career professionals preferred',
    verificationStatus: 'verified',
    prestigeScore: 99,
    difficulty: 'hard'
  },
  {
    id: 'daad-epos-2027',
    title: 'DAAD EPOS Scholarship',
    type: 'Scholarships',
    provider: 'DAAD (German Academic Exchange Service)',
    country: 'Germany',
    fundingLevel: '€934/month + Travel Allowance',
    deadline: '2026-08-30',
    description: 'Development-Related Postgraduate Courses offering foreign graduates from developing and newly industrialized countries scholarships for postgraduate studies at German state-recognized universities.',
    requirements: ["Bachelor's Degree", "2 Years Work Experience", "Developing Country Citizen"],
    tags: ['Development', 'Masters', 'Germany', 'Full Funding'],
    url: 'https://www.daad.de/',
    requiredGPA: 'Upper Second Class',
    requiredExperience: '2+ Years Professional Experience',
    verificationStatus: 'verified',
    prestigeScore: 92,
    difficulty: 'medium'
  },
  {
    id: 'openai-residency-2026',
    title: 'OpenAI Residency Program',
    type: 'Remote Jobs',
    provider: 'OpenAI',
    country: 'Global / US Remote',
    fundingLevel: '$210,000 Salary',
    deadline: '2026-05-01',
    description: 'A 6-month residency designed for researchers and engineers transitioning into AI. Residents will be embedded in OpenAI research teams.',
    requirements: ['Strong math/coding background', 'Demonstrated independent project capability', 'Published research (optional)'],
    tags: ['Artificial Intelligence', 'Machine Learning', 'Research', 'Engineering'],
    url: 'https://openai.com/careers/',
    requiredGPA: 'N/A',
    requiredExperience: 'Software engineering or math research',
    verificationStatus: 'verified',
    prestigeScore: 99,
    difficulty: 'hard'
  },
  {
    id: 'chevening-scholarship-2027',
    title: 'Chevening Scholarship 2027',
    type: 'Scholarships',
    provider: 'UK Foreign, Commonwealth and Development Office',
    country: 'United Kingdom',
    fundingLevel: 'Full Tuition + Living Costs',
    deadline: '2026-11-05',
    description: 'Fully-funded scholarships to study any eligible master’s degree at any UK university, aimed at developing global leaders.',
    requirements: ['Undergraduate degree', '2 years work experience', 'Return to home country for 2 years after completion'],
    tags: ['Leadership', 'Masters', 'UK', 'Fully Funded'],
    url: 'https://www.chevening.org/',
    requiredGPA: '2:1 honours degree equivalent',
    requiredExperience: '2,800 hours work experience',
    verificationStatus: 'verified',
    prestigeScore: 98,
    difficulty: 'hard'
  },
  {
    id: 'horizon-europe-grant-2026',
    title: 'Horizon Europe Research Grant',
    type: 'Grants',
    provider: 'European Commission',
    country: 'Europe',
    fundingLevel: 'Up to €2.5 Million',
    deadline: '2026-09-10',
    description: 'The EU’s key funding programme for research and innovation, tackling climate change, helping to achieve the UN’s Sustainable Development Goals and boosting the EU’s competitiveness and growth.',
    requirements: ['Consortium of at least 3 legal entities', 'Innovative research proposal', 'Alignment with EU priorities'],
    tags: ['Research', 'Innovation', 'Climate', 'Technology'],
    url: 'https://research-and-innovation.ec.europa.eu/',
    requiredGPA: 'N/A',
    requiredExperience: 'Established researchers / organizations',
    verificationStatus: 'verified',
    prestigeScore: 97,
    difficulty: 'hard'
  },
  {
    id: 'ethglobal-online-2026',
    title: 'ETHGlobal Online 2026',
    type: 'Hackathons',
    provider: 'ETHGlobal',
    country: 'Global',
    fundingLevel: '$250,000 Prize Pool',
    deadline: '2026-11-20',
    description: 'The flagship asynchronous hackathon bringing together Ethereum developers from across the globe to build the future of Web3.',
    requirements: ['Interest in Web3', 'Development skills (Solidity/Frontend)', 'Team of 1-5'],
    tags: ['Web3', 'Blockchain', 'Ethereum', 'Coding'],
    url: 'https://ethglobal.com/',
    requiredGPA: 'N/A',
    requiredExperience: 'Beginner to Advanced',
    verificationStatus: 'verified',
    prestigeScore: 90,
    difficulty: 'medium'
  }
];

const GLOBAL_STATS = {
  scholarshipsIndexed: 124350,
  fundingAvailable: 4200000000,
  countriesCovered: 185,
  aiOpportunityTypes: 12,
  remoteJobs: 15420,
  accelerators: 984,
  hackathons: 4321,
  fellowships: 3241,
  grants: 8740,
  lastUpdated: Date.now()
};

export async function GET(request: Request) {
  // Simple security measure
  const url = new URL(request.url);
  const secret = url.searchParams.get('secret');
  
  if (secret !== 'seed-hackathon-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const batch = adminDb.batch();

    // 1. Seed Opportunities
    const opportunitiesRef = adminDb.collection('opportunities');
    for (const opp of REAL_OPPORTUNITIES) {
      const docRef = opportunitiesRef.doc(opp.id);
      batch.set(docRef, { ...opp, createdAt: new Date().toISOString() }, { merge: true });
    }

    // 2. Seed Global Stats
    const statsRef = adminDb.collection('system').doc('global_stats');
    batch.set(statsRef, GLOBAL_STATS, { merge: true });

    await batch.commit();

    return NextResponse.json({ 
      success: true, 
      message: 'Successfully seeded Opportunities and Platform Stats!',
      seededCount: REAL_OPPORTUNITIES.length
    });
  } catch (error: any) {
    console.error('Seeding error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
