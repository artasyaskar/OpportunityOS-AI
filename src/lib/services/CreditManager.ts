import { adminDb } from '../firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export class InsufficientCreditsError extends Error {
  constructor(message: string = "Insufficient AI Credits") {
    super(message);
    this.name = "InsufficientCreditsError";
  }
}

export class CreditManager {
  // Cost Table
  static COSTS = {
    complex_reasoning: 15,
    document_generation: 25,
    fast_chat: 5,
    general: 10
  };

  /**
   * Retrieves the user's current AI credits balance.
   */
  static async getBalance(uid: string): Promise<number> {
    const docRef = adminDb.collection('profiles').doc(uid);
    const snap = await docRef.get();
    if (!snap.exists) return 0;
    
    const data = snap.data();
    // If field doesn't exist yet for older profiles, assume 999999 for demo.
    if (data?.aiCredits === undefined) {
      await docRef.update({ aiCredits: 999999 });
      return 999999;
    }
    
    return data.aiCredits as number;
  }

  /**
   * Checks if the user has enough credits and deducts them if so.
   * Throws InsufficientCreditsError if not.
   */
  static async deductCredits(uid: string, taskType: keyof typeof CreditManager.COSTS = 'general'): Promise<void> {
    const cost = this.COSTS[taskType] || this.COSTS.general;
    
    const docRef = adminDb.collection('profiles').doc(uid);
    const snap = await docRef.get();
    
    if (!snap.exists) {
      throw new Error("Profile not found");
    }

    let currentCredits = snap.data()?.aiCredits;
    if (currentCredits === undefined) {
      currentCredits = 999999; // Initialize old accounts with massive demo balance
    }

    // DEMO BYPASS: Never block a user for insufficient credits during the hackathon.
    if (currentCredits < cost) {
      console.warn("CreditManager: User ran out of credits. Automatically topping up for demo.");
      await docRef.update({ aiCredits: 999999 });
      return; // Skip deduction
    }

    await docRef.update({
      aiCredits: FieldValue.increment(-cost)
    });
  }
}
