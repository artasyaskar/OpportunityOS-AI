import { db } from '../firebase';
import { collection, doc, getDocs, getDoc, setDoc, query, writeBatch } from 'firebase/firestore';
import type { Opportunity } from '../gemini';
import { DeduplicationService } from '../services/DeduplicationService';
import { GLOBAL_OPPORTUNITIES } from '../opportunities-data';

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
   * Automatically merges static GLOBAL_OPPORTUNITIES with Firestore data.
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
      
      // Merge with static data to ensure no hardcoded opportunity is ever missing
      const { unique } = DeduplicationService.deduplicate([...GLOBAL_OPPORTUNITIES, ...docs]);
      
      cachedOpportunities = unique;
      lastCacheTime = now;
      return unique;
    } catch (error) {
      console.warn("OpportunityRepository: Failed to fetch opportunities. Check Firestore rules.", error);
      // Fallback to static data if Firestore fails
      const { unique } = DeduplicationService.deduplicate([...GLOBAL_OPPORTUNITIES, ...(cachedOpportunities || [])]);
      return unique;
    }
  }

  /**
   * Retrieves a specific opportunity by ID.
   */
  static async getOpportunityById(id: string | string[]): Promise<Opportunity | null> {
    const normalizedId = Array.isArray(id) ? id[0] : id;
    
    // Check cache first
    if (cachedOpportunities) {
      const found = cachedOpportunities.find(o => o.id === normalizedId);
      if (found) return found;
    }

    // Check static data as secondary fallback
    const staticFound = GLOBAL_OPPORTUNITIES.find(o => o.id === normalizedId);
    if (staticFound) return staticFound;

    try {
      const docRef = doc(db, 'opportunities', normalizedId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as Opportunity;
      }
      return null;
    } catch (error) {
      console.warn(`OpportunityRepository: Failed to fetch opportunity ${normalizedId}.`, error);
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
   * Prevents duplicates: if the incoming opportunity matches an existing one
   * (by URL / provider+title / domain+country) under a *different* id, the
   * two are merged into the canonical record instead of creating a duplicate.
   */
  static async saveOpportunity(opportunity: Opportunity): Promise<void> {
    // Dedup guard against the cached corpus (best-effort; skipped on cache miss).
    let target = opportunity;
    if (cachedOpportunities) {
      const existing = DeduplicationService.findExisting(
        opportunity,
        cachedOpportunities.filter(o => o.id !== opportunity.id)
      );
      if (existing) {
        const canonical = DeduplicationService.pickCanonical(existing, opportunity);
        const duplicate = canonical === existing ? opportunity : existing;
        target = { ...DeduplicationService.merge(canonical, duplicate), id: canonical.id };
      }
    }

    const docRef = doc(db, 'opportunities', target.id);
    await setDoc(docRef, target, { merge: true });
    // Invalidate cache
    cachedOpportunities = null;
  }

  /**
   * Bulk insert using Firestore Batches (Max 500 per batch).
   * Runs deduplication across the incoming set first so a single seed call can
   * never introduce duplicate entries.
   */
  static async seedOpportunitiesToFirestore(opportunities: Opportunity[]): Promise<void> {
    const { unique } = DeduplicationService.deduplicate(opportunities);

    const batches = [];
    let currentBatch = writeBatch(db);
    let count = 0;

    for (const opp of unique) {
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
