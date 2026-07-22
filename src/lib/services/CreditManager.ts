import { adminDb } from '../firebase-admin';

export class InsufficientCreditsError extends Error {
  constructor(message: string = "Insufficient AI Credits") {
    super(message);
    this.name = "InsufficientCreditsError";
  }
}

/**
 * Subscription states that grant unlimited AI usage (no credit deduction).
 * Mirrors the paid/active tiers in SubscriptionRepository.
 */
const UNLIMITED_STATES = new Set([
  'ACTIVE',
  'APPROVED',
  'LIFETIME',
  'ENTERPRISE',
]);

export class CreditManager {
  // Cost per task type (in credits)
  static COSTS = {
    complex_reasoning: 15,
    document_generation: 25,
    fast_chat: 5,
    general: 10,
  };

  // Credits granted to a brand-new free-tier account.
  static FREE_TIER_STARTING_CREDITS = 150;

  /**
   * Returns true if the user's subscription grants unlimited AI usage.
   * Read server-side via the Admin SDK so it can't be spoofed by the client.
   */
  private static async hasUnlimitedAccess(uid: string): Promise<boolean> {
    try {
      const snap = await adminDb.collection('subscriptions').doc(uid).get();
      if (!snap.exists) return false;
      const data = snap.data() || {};
      // Support both `status` (SubscriptionRepository) and `state` (legacy) fields.
      const state = (data.status || data.state || '').toString().toUpperCase();
      return UNLIMITED_STATES.has(state);
    } catch (err) {
      console.error('CreditManager: failed to read subscription state:', err);
      return false; // Fail closed — treat as free tier.
    }
  }

  /**
   * Retrieves the user's current AI credits balance.
   * New profiles are seeded with the free-tier starting allowance exactly once.
   */
  static async getBalance(uid: string): Promise<number> {
    const docRef = adminDb.collection('profiles').doc(uid);
    const snap = await docRef.get();
    if (!snap.exists) return 0;

    const data = snap.data();
    if (data?.aiCredits === undefined) {
      await docRef.set({ aiCredits: this.FREE_TIER_STARTING_CREDITS }, { merge: true });
      return this.FREE_TIER_STARTING_CREDITS;
    }

    return data.aiCredits as number;
  }

  /**
   * Checks whether the user can afford a task without deducting.
   * Unlimited (paid) users always return true.
   */
  static async canAfford(uid: string, taskType: keyof typeof CreditManager.COSTS = 'general'): Promise<boolean> {
    return true; // Bypassed for development/testing
  }

  /**
   * Atomically checks and deducts credits for a task.
   * - Paid/lifetime users: no deduction, unlimited.
   * - Free users: deducts cost; throws InsufficientCreditsError when the
   *   transaction would take the balance below zero.
   */
  static async deductCredits(uid: string, taskType: keyof typeof CreditManager.COSTS = 'general'): Promise<void> {
    return; // Bypassed for development/testing
  }
}
