import { db } from '../firebase';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';

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
    const docRef = doc(db, 'profiles', uid);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return 0;
    
    const data = snap.data();
    // If field doesn't exist yet for older profiles, assume 500.
    if (data.aiCredits === undefined) {
      await updateDoc(docRef, { aiCredits: 500 });
      return 500;
    }
    
    return data.aiCredits as number;
  }

  /**
   * Checks if the user has enough credits and deducts them if so.
   * Throws InsufficientCreditsError if not.
   */
  static async deductCredits(uid: string, taskType: keyof typeof CreditManager.COSTS = 'general'): Promise<void> {
    const cost = this.COSTS[taskType] || this.COSTS.general;
    
    const docRef = doc(db, 'profiles', uid);
    const snap = await getDoc(docRef);
    
    if (!snap.exists()) {
      throw new Error("Profile not found");
    }

    let currentCredits = snap.data().aiCredits;
    if (currentCredits === undefined) {
      currentCredits = 500; // Initialize old accounts
    }

    if (currentCredits < cost) {
      throw new InsufficientCreditsError();
    }

    await updateDoc(docRef, {
      aiCredits: increment(-cost)
    });
  }
}
