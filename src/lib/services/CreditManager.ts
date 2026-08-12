import { adminDb } from '../firebase-admin';

export class InsufficientCreditsError extends Error {
  constructor(message: string = "You have used your 1,000 daily free credits (250 credits per AI generation). Your 1,000 credits automatically renew every 24 hours, or you can upgrade to Pro for unlimited generations!") {
    super(message);
    this.name = "InsufficientCreditsError";
  }
}

export class CreditManager {
  // Free tier daily allowance
  static FREE_TIER_DAILY_CREDITS = 1000;
  // Credit cost per AI run
  static DEFAULT_TASK_COST = 250;

  static COSTS = {
    complex_reasoning: 250,
    document_generation: 250,
    fast_chat: 250,
    general: 250,
    resume_parsing: 250,
    vision: 250
  };

  /**
   * Checks if user has an active Pro or Lifetime subscription.
   * Automatically expires 30-day monthly plans when period completes.
   */
  private static async checkSubscriptionStatus(uid: string): Promise<{ isUnlimited: boolean; isExpiredMonthly: boolean }> {
    try {
      const snap = await adminDb.collection('subscriptions').doc(uid).get();
      if (!snap.exists) return { isUnlimited: false, isExpiredMonthly: false };
      
      const data = snap.data() || {};
      const status = (data.status || data.state || '').toString().toUpperCase();
      const planId = (data.planId || '').toString().toLowerCase();
      
      // Lifetime / Enterprise plan is always active and unlimited
      if (status === 'LIFETIME' || planId.includes('lifetime') || status === 'ENTERPRISE') {
        return { isUnlimited: true, isExpiredMonthly: false };
      }

      // Monthly Pro Plan (30/31 days validation)
      if (status === 'ACTIVE' || status === 'APPROVED') {
        const startedAt = data.startedAt ? new Date(data.startedAt).getTime() : Date.now();
        const expiresAt = data.expiresAt ? new Date(data.expiresAt).getTime() : (startedAt + 30 * 24 * 60 * 60 * 1000);
        
        if (Date.now() > expiresAt) {
          // Automatically mark plan as EXPIRED in Firestore
          await adminDb.collection('subscriptions').doc(uid).set({
            status: 'EXPIRED',
            expiredAt: new Date().toISOString()
          }, { merge: true });
          return { isUnlimited: false, isExpiredMonthly: true };
        }
        return { isUnlimited: true, isExpiredMonthly: false };
      }

      const isExpiredMonthly = status === 'EXPIRED' || Date.now() > (data.expiresAt ? new Date(data.expiresAt).getTime() : 0);
      return { isUnlimited: false, isExpiredMonthly };
    } catch (err) {
      console.error('CreditManager: failed to check subscription status:', err);
      return { isUnlimited: false, isExpiredMonthly: false };
    }
  }

  /**
   * Retrieves the user's current AI credits balance.
   * Free users automatically have their 1,000 credits renewed every 24 hours.
   */
  static async getBalance(uid: string): Promise<{ credits: number; hoursUntilReset: number; isUnlimited: boolean }> {
    const { isUnlimited } = await this.checkSubscriptionStatus(uid);
    if (isUnlimited) {
      return { credits: 999999, hoursUntilReset: 0, isUnlimited: true };
    }

    const docRef = adminDb.collection('profiles').doc(uid);
    const snap = await docRef.get();
    const now = Date.now();

    if (!snap.exists) {
      await docRef.set({ 
        aiCredits: this.FREE_TIER_DAILY_CREDITS,
        lastCreditReset: now 
      }, { merge: true });
      return { credits: this.FREE_TIER_DAILY_CREDITS, hoursUntilReset: 24, isUnlimited: false };
    }

    const data = snap.data() || {};
    let credits = data.aiCredits !== undefined ? Number(data.aiCredits) : this.FREE_TIER_DAILY_CREDITS;
    const lastReset = data.lastCreditReset ? Number(data.lastCreditReset) : 0;
    const elapsedMs = now - lastReset;
    const resetIntervalMs = 24 * 60 * 60 * 1000; // 24 Hours

    // 24-Hour Reset logic: Automatically renew 1,000 credits after 24 hours
    if (elapsedMs >= resetIntervalMs || lastReset === 0) {
      credits = this.FREE_TIER_DAILY_CREDITS;
      await docRef.set({
        aiCredits: this.FREE_TIER_DAILY_CREDITS,
        lastCreditReset: now
      }, { merge: true });
      return { credits: this.FREE_TIER_DAILY_CREDITS, hoursUntilReset: 24, isUnlimited: false };
    }

    const remainingMs = resetIntervalMs - elapsedMs;
    const hoursUntilReset = Math.ceil(remainingMs / (1000 * 60 * 60));

    return { credits, hoursUntilReset, isUnlimited: false };
  }

  /**
   * Checks whether the user can afford an AI generation (250 credits cost).
   */
  static async canAfford(uid: string, taskType: keyof typeof CreditManager.COSTS = 'general'): Promise<boolean> {
    const { isUnlimited } = await this.checkSubscriptionStatus(uid);
    if (isUnlimited) return true;

    const { credits } = await this.getBalance(uid);
    const cost = CreditManager.COSTS[taskType] || CreditManager.DEFAULT_TASK_COST;
    return credits >= cost;
  }

  /**
   * Deducts 250 credits per AI generation for free users.
   */
  static async deductCredits(uid: string, taskType: keyof typeof CreditManager.COSTS = 'general'): Promise<void> {
    const { isUnlimited } = await this.checkSubscriptionStatus(uid);
    if (isUnlimited) return; // Unlimited for Pro / Lifetime users

    const { credits } = await this.getBalance(uid);
    const cost = CreditManager.COSTS[taskType] || CreditManager.DEFAULT_TASK_COST;

    if (credits < cost) {
      throw new InsufficientCreditsError();
    }

    const newBalance = credits - cost;
    const docRef = adminDb.collection('profiles').doc(uid);
    await docRef.set({
      aiCredits: newBalance
    }, { merge: true });

    console.log(`[CreditManager] Deducted ${cost} credits from user ${uid}. New balance: ${newBalance}`);
  }
}
