import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { serverStorageProvider } from '@/lib/storage/ServerStorageProvider';
import { config } from '@/lib/config';

export async function GET() {
  const status: Record<string, string> = {
    status: 'healthy',
  };

  try {
    // Check Firestore
    await adminDb.collection('health_check').limit(1).get();
    status.firestore = 'ok';
  } catch (e) {
    status.firestore = 'error';
    status.status = 'degraded';
  }

  try {
    // Check R2
    await serverStorageProvider.exists('health_check_dummy');
    status.r2 = 'ok';
  } catch (e) {
    status.r2 = 'error';
    status.status = 'degraded';
  }

  // Basic API Key checks
  status.gemini = process.env.GEMINI_API_KEY ? 'ok' : 'missing';
  status.groq = process.env.GROQ_API_KEY ? 'ok' : 'missing';

  return NextResponse.json(status, { status: status.status === 'healthy' ? 200 : 503 });
}
