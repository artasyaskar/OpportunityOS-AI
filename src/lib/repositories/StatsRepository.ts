import { db } from '../firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { GLOBAL_OPPORTUNITIES, getCategoryCounts, getCountryCounts, getTotalFundingValue } from '../opportunities-data';

export interface PlatformStats {
  // Canonical (computed) fields
  opportunitiesIndexed?: number;
  fundingAvailable: number;      // Real total funding value across the dataset
  countriesCovered: number;
  opportunityTypes?: number;
  remoteOpportunities?: number;
  accelerators: number;
  hackathons: number;
  fellowships: number;
  grants: number;
  scholarships?: number;

  // Legacy field aliases (backward compatibility with older consumers)
  scholarshipsIndexed?: number;
  aiOpportunityTypes?: number;
  remoteJobs?: number;

  lastUpdated: number | string;
}

/**
 * Build the default platform stats FROM THE REAL SEED DATASET.
 * No fabricated numbers — every value is computed from the opportunities that
 * actually exist in the app. Computed once at module load.
 */
function computeDefaultStats(): PlatformStats {
  const categoryCounts = getCategoryCounts();
  const countryCounts = getCountryCounts();

  const countByType = (predicate: (type: string) => boolean) =>
    GLOBAL_OPPORTUNITIES.filter(o => predicate((o.type || '').toLowerCase())).length;

  const scholarships = countByType(t => t.includes('scholarship') || t.includes('government funding'));
  const accelerators = countByType(t => t.includes('acceler') || t.includes('incubat'));
  const hackathons = countByType(t => t.includes('hackathon'));
  const fellowships = countByType(t => t.includes('fellowship'));
  const grants = countByType(t => t.includes('grant'));
  const remote = GLOBAL_OPPORTUNITIES.filter(o => o.remote === true).length;
  const countries = Object.keys(countryCounts).length;
  const types = Object.keys(categoryCounts).length;

  return {
    opportunitiesIndexed: GLOBAL_OPPORTUNITIES.length,
    fundingAvailable: getTotalFundingValue(),
    countriesCovered: countries,
    opportunityTypes: types,
    remoteOpportunities: remote,
    accelerators,
    hackathons,
    fellowships,
    grants,
    scholarships,
    // Legacy aliases kept in sync so old UI keys still resolve to real numbers
    scholarshipsIndexed: scholarships,
    aiOpportunityTypes: types,
    remoteJobs: remote,
    lastUpdated: Date.now(),
  };
}

const DEFAULT_STATS: PlatformStats = computeDefaultStats();

export class StatsRepository {
  /**
   * Fetches global platform statistics.
   * If they don't exist, seeds stats COMPUTED from the real dataset.
   */
  static async getPlatformStats(): Promise<PlatformStats> {
    try {
      const docRef = doc(db, 'system', 'global_stats');
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return docSnap.data() as PlatformStats;
      } else {
        // Seed initial stats (real, computed) if they don't exist
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
