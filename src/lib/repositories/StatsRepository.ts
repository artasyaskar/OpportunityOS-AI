import { db } from '../firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

export interface PlatformStats {
  scholarshipsIndexed: number;
  fundingAvailable: number; // In billions or raw number
  countriesCovered: number;
  aiOpportunityTypes: number;
  remoteJobs: number;
  accelerators: number;
  hackathons: number;
  fellowships: number;
  grants: number;
  lastUpdated: number;
}

const DEFAULT_STATS: PlatformStats = {
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

export class StatsRepository {
  /**
   * Fetches global platform statistics.
   * If they don't exist, it seeds the default realistic stats for the hackathon demo.
   */
  static async getPlatformStats(): Promise<PlatformStats> {
    try {
      const docRef = doc(db, 'system', 'global_stats');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data() as PlatformStats;
      } else {
        // Seed initial stats if they don't exist
        await setDoc(docRef, DEFAULT_STATS);
        return DEFAULT_STATS;
      }
    } catch (error) {
      console.warn("StatsRepository: Failed to fetch platform stats.", error);
      return DEFAULT_STATS;
    }
  }

  /**
   * Subscribes to real-time updates for platform statistics.
   */
  static subscribeToStats(callback: (stats: PlatformStats) => void): () => void {
    const docRef = doc(db, 'system', 'global_stats');
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as PlatformStats);
      } else {
        callback(DEFAULT_STATS);
      }
    }, (error) => {
      console.warn("StatsRepository: Subscription error.", error);
      callback(DEFAULT_STATS);
    });
  }
}
