import { db } from '../firebase';
import { collection, doc, getDocs, getDoc, setDoc, query, writeBatch } from 'firebase/firestore';
import type { Opportunity } from '../gemini';

// Simple in-memory cache to prevent excessive Firestore reads and speed up filtering
let cachedOpportunities: Opportunity[] | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 1000 * 60 * 5; // 5 minutes

export interface OpportunityFilterOptions {
  searchQuery?: string;
  category?: string;
  region?: string;
  fundingType?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResult {
  data: Opportunity[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

export class OpportunityRepository {
  /**
   * Retrieves all available opportunities (with caching).
   */
  static async getAllOpportunities(forceRefresh = false): Promise<Opportunity[]> {
    const now = Date.now();
    if (!forceRefresh && cachedOpportunities && (now - lastCacheTime < CACHE_TTL_MS)) {
      return cachedOpportunities;
    }

    try {
      // For the seed database size (~500), we can load all into memory for fast filtering
      const q = query(collection(db, 'opportunities'));
      const querySnapshot = await getDocs(q);
      const docs: Opportunity[] = [];
      querySnapshot.forEach((docSnap) => {
        docs.push(docSnap.data() as Opportunity);
      });
      
      cachedOpportunities = docs;
      lastCacheTime = now;
      return docs;
    } catch (error) {
      console.warn("OpportunityRepository: Failed to fetch opportunities. Check Firestore rules.", error);
      return cachedOpportunities || [];
    }
  }

  /**
   * Retrieves a specific opportunity by ID.
   */
  static async getOpportunityById(id: string): Promise<Opportunity | null> {
    // Check cache first
    if (cachedOpportunities) {
      const found = cachedOpportunities.find(o => o.id === id);
      if (found) return found;
    }

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
   * Smart Filtering, Search, and Pagination
   */
  static async getOpportunitiesWithFilters(options: OpportunityFilterOptions): Promise<PaginatedResult> {
    let allOpps = await this.getAllOpportunities();

    // 1. Search Query
    if (options.searchQuery && options.searchQuery.trim() !== '') {
      const q = options.searchQuery.toLowerCase();
      allOpps = allOpps.filter(opp => 
        opp.title.toLowerCase().includes(q) || 
        opp.provider.toLowerCase().includes(q) ||
        opp.tags?.some(tag => tag.toLowerCase().includes(q)) ||
        opp.description.toLowerCase().includes(q)
      );
    }

    // 2. Category Filter
    if (options.category && options.category !== 'All') {
      allOpps = allOpps.filter(opp => opp.type === options.category);
    }

    // 3. Region Filter
    if (options.region && options.region !== 'All') {
      allOpps = allOpps.filter(opp => opp.region === options.region);
    }

    // 4. Funding Type Filter
    if (options.fundingType && options.fundingType !== 'All') {
      const ft = options.fundingType.toLowerCase();
      if (ft === 'fully funded') {
        allOpps = allOpps.filter(opp => opp.fundingLevel?.toLowerCase().includes('full'));
      } else if (ft === 'partial') {
        allOpps = allOpps.filter(opp => !opp.fundingLevel?.toLowerCase().includes('full') && (opp.fundingAmount || 0) > 0);
      }
    }

    // 5. Pagination
    const page = options.page || 1;
    const limitPerPage = options.limit || 20;
    const total = allOpps.length;
    const totalPages = Math.ceil(total / limitPerPage);
    
    const startIndex = (page - 1) * limitPerPage;
    const endIndex = startIndex + limitPerPage;
    const paginatedData = allOpps.slice(startIndex, endIndex);

    return {
      data: paginatedData,
      total,
      page,
      totalPages,
      hasMore: page < totalPages
    };
  }

  /**
   * Saves or updates an opportunity.
   */
  static async saveOpportunity(opportunity: Opportunity): Promise<void> {
    const docRef = doc(db, 'opportunities', opportunity.id);
    await setDoc(docRef, opportunity, { merge: true });
    // Invalidate cache
    cachedOpportunities = null;
  }

  /**
   * Bulk insert using Firestore Batches (Max 500 per batch)
   */
  static async seedOpportunitiesToFirestore(opportunities: Opportunity[]): Promise<void> {
    const batches = [];
    let currentBatch = writeBatch(db);
    let count = 0;

    for (const opp of opportunities) {
      const docRef = doc(db, 'opportunities', opp.id);
      currentBatch.set(docRef, opp, { merge: true });
      count++;

      // Firestore limit is 500 writes per batch
      if (count === 490) {
        batches.push(currentBatch.commit());
        currentBatch = writeBatch(db);
        count = 0;
      }
    }

    if (count > 0) {
      batches.push(currentBatch.commit());
    }

    await Promise.all(batches);
    // Invalidate cache
    cachedOpportunities = null;
  }
}
