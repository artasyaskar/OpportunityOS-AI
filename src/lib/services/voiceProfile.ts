// =============================================================================
// Voice Profile Store — persistent per-user writing fingerprint.
//
// This is the "humanize forever" memory: each time we generate for a user we
// measure their real voice (from interview answers, goals, instructions), blend
// it with what we've learned before, and persist it. Future essays reuse the
// accumulated fingerprint so the applicant's voice stays consistent across every
// document — without any model fine-tuning (not available on free tiers).
// All operations are best-effort and NEVER throw into the generation path.
// =============================================================================

import { adminDb } from '@/lib/firebase-admin';
import type { VoiceProfile } from '@/lib/services/writingQuality';

const COLLECTION = 'voiceProfiles';

export async function loadVoiceProfile(userId?: string): Promise<Partial<VoiceProfile> | null> {
  if (!userId) return null;
  try {
    const snap = await adminDb.collection(COLLECTION).doc(userId).get();
    if (!snap.exists) return null;
    const data = snap.data() as any;
    return (data?.profile as Partial<VoiceProfile>) || null;
  } catch (err) {
    console.warn('[VoiceProfile] load failed (non-fatal):', (err as Error)?.message);
    return null;
  }
}

export async function saveVoiceProfile(userId: string | undefined, profile: VoiceProfile): Promise<void> {
  if (!userId) return;
  // Only persist when we actually measured something — never overwrite a rich
  // learned profile with empty defaults.
  if (profile.dataQuality === 'none') return;
  try {
    await adminDb.collection(COLLECTION).doc(userId).set(
      {
        userId,
        profile,
        updatedAt: new Date().toISOString(),
        samples: (profile.wordsSampled || 0),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('[VoiceProfile] save failed (non-fatal):', (err as Error)?.message);
  }
}
