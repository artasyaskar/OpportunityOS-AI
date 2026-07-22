import type { Opportunity, UserProfile } from '../gemini';

// ============================================================
//  SMART RANKING SERVICE
// ============================================================
// Combines multiple explainable signals into a single 0..100 ranking score.
// Every component is transparent and traceable — no hallucinated confidence.
//
// The ranking ADAPTS to user behaviour through UserPreferenceSignals
// (saved / hidden / rejected / applied opportunities and preferred
// categories/countries). These are optional so the engine works with or
// without behavioural history, and is ready for the preferences schema.

export interface UserPreferenceSignals {
  savedIds?: string[];
  hiddenIds?: string[];
  rejectedIds?: string[];
  appliedIds?: string[];
  preferredCategories?: string[];
  preferredCountries?: string[];
  targetCountries?: string[];
  preferredIndustries?: string[];
}

export interface RankingSignal {
  label: string;
  weight: number;       // contribution weight
  value: number;        // 0..1 normalized signal strength
  points: number;       // weight * value (actual contribution)
}

export interface RankedOpportunity {
  opportunity: Opportunity;
  rankScore: number;              // 0..100 final composite
  compatibilityScore: number;     // passed through from matching engine
  signals: RankingSignal[];       // explainable breakdown
  isHidden: boolean;              // hidden by user (kept but flagged)
}

// Weighting of each ranking dimension. Sums to 100 for the positive signals;
// preference feedback applies multiplicative boosts/penalties on top.
const WEIGHTS = {
  compatibility: 40,   // how well the profile matches (from scoringEngine)
  deadline: 15,        // urgency — closer (but not past) ranks higher
  funding: 12,         // funding scale / ROI
  prestige: 13,        // provider prestige (derived, not fabricated)
  freshness: 10,       // data recency / verification
  competition: 10,     // lower competition ranks slightly higher for "winnable"
};

export class RankingService {
  /** Normalize deadline urgency to 0..1. Peak value for deadlines ~2–45 days out. */
  private static deadlineSignal(opp: Opportunity, now: Date): number {
    if (!opp.deadline) return 0.3;
    const d = new Date(opp.deadline);
    if (isNaN(d.getTime())) return 0.3;
    const days = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (days < 0) return 0;              // expired — should rank last
    if (days <= 7) return 1.0;           // closing this week — most urgent
    if (days <= 30) return 0.85;
    if (days <= 60) return 0.6;
    if (days <= 120) return 0.4;
    return 0.25;                          // far away — low urgency
  }

  /** Normalize funding to 0..1 on a log-ish scale so mega-grants don't dominate. */
  private static fundingSignal(opp: Opportunity): number {
    const amount = opp.fundingAmount || 0;
    const isFull = (opp.fundingLevel || '').toLowerCase().includes('full');
    if (isFull) return 0.95;
    if (amount <= 0) return 0.2;
    if (amount >= 100000) return 1.0;
    if (amount >= 50000) return 0.85;
    if (amount >= 20000) return 0.7;
    if (amount >= 5000) return 0.5;
    return 0.35;
  }

  private static prestigeSignal(opp: Opportunity): number {
    return Math.min(1, (opp.prestigeScore ?? 50) / 100);
  }

  private static freshnessSignal(opp: Opportunity): number {
    let s = (opp.dataFreshnessScore ?? 60) / 100;
    if (opp.verified || opp.verificationStatus === 'verified') s = Math.min(1, s + 0.1);
    return s;
  }

  /** Lower competition = higher "winnability" signal. */
  private static competitionSignal(opp: Opportunity): number {
    switch (opp.competitionLevel) {
      case 'low': return 1.0;
      case 'medium': return 0.6;
      case 'high': return 0.35;
      default: return 0.6;
    }
  }

  /**
   * Rank a single opportunity. `compatibilityScore` comes from the matching
   * engine (0..100); preference signals adapt the result.
   */
  static rankOne(
    opp: Opportunity,
    compatibilityScore: number,
    prefs: UserPreferenceSignals | undefined,
    profile: UserProfile | null,
    now: Date
  ): RankedOpportunity {
    const signals: RankingSignal[] = [];

    const push = (label: string, weight: number, value: number) => {
      const points = weight * value;
      signals.push({ label, weight, value: Math.round(value * 100) / 100, points: Math.round(points * 10) / 10 });
      return points;
    };

    let score = 0;
    score += push('Profile compatibility', WEIGHTS.compatibility, Math.min(1, compatibilityScore / 100));
    score += push('Deadline urgency', WEIGHTS.deadline, this.deadlineSignal(opp, now));
    score += push('Funding / ROI', WEIGHTS.funding, this.fundingSignal(opp));
    score += push('Prestige', WEIGHTS.prestige, this.prestigeSignal(opp));
    score += push('Data freshness', WEIGHTS.freshness, this.freshnessSignal(opp));
    score += push('Winnability (competition)', WEIGHTS.competition, this.competitionSignal(opp));

    // --- Adaptive preference feedback (multiplicative on top of base score) ---
    let isHidden = false;
    const id = opp.id;

    if (prefs) {
      if (prefs.savedIds?.includes(id)) {
        score *= 1.15; signals.push({ label: 'Saved by you', weight: 0, value: 1, points: +(score * 0.15).toFixed(1) });
      }
      if (prefs.appliedIds?.includes(id)) {
        // Already applied — de-prioritize in discovery so we surface new ones.
        score *= 0.5; signals.push({ label: 'Already applied', weight: 0, value: 0, points: 0 });
      }
      if (prefs.rejectedIds?.includes(id)) {
        score *= 0.15; signals.push({ label: 'Previously rejected', weight: 0, value: 0, points: 0 });
      }
      if (prefs.hiddenIds?.includes(id)) {
        isHidden = true; score = 0;
      }

      // Preferred category / country boosts.
      if (prefs.preferredCategories?.length && prefs.preferredCategories.includes(opp.type as string)) {
        score *= 1.1; signals.push({ label: 'Preferred category', weight: 0, value: 1, points: 0 });
      }
      const countryPrefs = [...(prefs.preferredCountries || []), ...(prefs.targetCountries || [])];
      if (countryPrefs.some(c => (opp.country || '').toLowerCase().includes(c.toLowerCase()))) {
        score *= 1.1; signals.push({ label: 'Target country', weight: 0, value: 1, points: 0 });
      }
    }

    // Field-of-study alignment from the profile (soft boost, explainable).
    if (profile?.field) {
      const field = profile.field.toLowerCase();
      const hay = `${opp.title} ${opp.description} ${(opp.tags || []).join(' ')} ${(opp.requiredSkills || []).join(' ')}`.toLowerCase();
      if (hay.includes(field)) {
        score *= 1.08; signals.push({ label: `Matches your field (${profile.field})`, weight: 0, value: 1, points: 0 });
      }
    }

    return {
      opportunity: opp,
      rankScore: Math.max(0, Math.min(100, Math.round(score))),
      compatibilityScore,
      signals: signals.sort((a, b) => b.points - a.points),
      isHidden,
    };
  }

  /**
   * Rank a full list. `scoreFor` supplies the compatibility score per opportunity
   * (injected so this service stays decoupled from the scoring engine).
   */
  static rank(
    opportunities: Opportunity[],
    scoreFor: (opp: Opportunity) => number,
    options: {
      prefs?: UserPreferenceSignals;
      profile?: UserProfile | null;
      now?: Date;
      includeHidden?: boolean;
    } = {}
  ): RankedOpportunity[] {
    const now = options.now || new Date();
    const ranked = opportunities.map(opp =>
      this.rankOne(opp, scoreFor(opp), options.prefs, options.profile ?? null, now)
    );

    const visible = options.includeHidden ? ranked : ranked.filter(r => !r.isHidden);
    return visible.sort((a, b) => b.rankScore - a.rankScore);
  }
}
