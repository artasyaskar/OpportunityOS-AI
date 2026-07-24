export interface QuotaState {
  dailyCredits: number;
  monthlyCredits: number;
  lastRequestTime: number;
  totalTokensUsed: number;
  estimatedCostUSD: number;
}

const DEFAULT_QUOTA: QuotaState = {
  dailyCredits: 1000,
  monthlyCredits: 30000,
  lastRequestTime: 0,
  totalTokensUsed: 0,
  estimatedCostUSD: 0,
};

export function getQuotaState(): QuotaState {
  if (typeof window === 'undefined') return DEFAULT_QUOTA;
  try {
    const stored = localStorage.getItem('ai_quota_usage_v2');
    if (stored) return JSON.parse(stored);
  } catch (e) {}
  return DEFAULT_QUOTA;
}

export function saveQuotaState(state: QuotaState) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('ai_quota_usage_v2', JSON.stringify(state));
  } catch (e) {}
}

export class OutOfCreditsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OutOfCreditsError';
  }
}

export function recordAiRequest(tokensUsed: number = 2000, modelType: 'groq' | 'gemini' = 'groq', isPro: boolean = false): boolean {
  const state = getQuotaState();
  const now = Date.now();
  
  if (state.dailyCredits < 250 && !isPro) {
    throw new OutOfCreditsError('You have completely exhausted your 1000 daily AI credits.');
  }

  if (now - state.lastRequestTime < 2000 && !isPro) {
    console.warn('AI request blocked by rate limiter: Cooldown active');
    return false;
  }

  const tokenCost = modelType === 'gemini' 
    ? (tokensUsed / 1000000) * 1.25 
    : (tokensUsed / 1000000) * 0.15;

  const nextState: QuotaState = {
    dailyCredits: Math.max(0, state.dailyCredits - 250),
    monthlyCredits: Math.max(0, state.monthlyCredits - 250),
    lastRequestTime: now,
    totalTokensUsed: state.totalTokensUsed + tokensUsed,
    estimatedCostUSD: parseFloat((state.estimatedCostUSD + tokenCost).toFixed(6)),
  };

  saveQuotaState(nextState);
  return true;
}

export function resetDailyQuotas() {
  const state = getQuotaState();
  saveQuotaState({
    ...state,
    dailyCredits: 1000,
  });
}
