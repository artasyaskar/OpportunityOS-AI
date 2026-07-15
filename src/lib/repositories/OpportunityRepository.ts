import { db } from '../firebase';
import { collection, doc, getDocs, getDoc, setDoc, query, where, limit } from 'firebase/firestore';
import { Opportunity } from '../gemini';

export class OpportunityRepository {
  /**
   * Retrieves all available opportunities.
   * In a production environment with many opportunities, this should be paginated.
   */
  static async getAllOpportunities(): Promise<Opportunity[]> {
    try {
      const q = query(collection(db, 'opportunities'), limit(100)); // limit for safety
      const querySnapshot = await getDocs(q);
      const docs: Opportunity[] = [];
      querySnapshot.forEach((docSnap) => {
        docs.push(docSnap.data() as Opportunity);
      });
      return docs;
    } catch (error) {
      console.warn("OpportunityRepository: Failed to fetch opportunities. Check Firestore rules.", error);
      return [];
    }
  }

  /**
   * Retrieves a specific opportunity by ID.
   */
  static async getOpportunityById(id: string): Promise<Opportunity | null> {
    try {
      const docRef = doc(db, 'opportunities', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as Opportunity;
      }
      return null;
    } catch (error) {
      console.warn(`OpportunityRepository: Failed to fetch opportunity ${id}.`, error);
      return null;
    }
  }

  /**
   * Saves or updates an opportunity.
   */
  static async saveOpportunity(opportunity: Opportunity): Promise<void> {
    const docRef = doc(db, 'opportunities', opportunity.id);
    await setDoc(docRef, opportunity, { merge: true });
  }

  /**
   * Bulk insert opportunities (useful for migration).
   */
  static async bulkInsert(opportunities: Opportunity[]): Promise<void> {
    // In production, this should use batched writes, but for the seed script, Promise.all is okay
    await Promise.all(opportunities.map(opp => this.saveOpportunity(opp)));
  }
}
