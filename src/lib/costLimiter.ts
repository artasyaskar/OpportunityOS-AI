export interface QuotaState {
  dailyRequests: number;
  monthlyRequests: number;
  lastRequestTime: number;
  totalTokensUsed: number;
  estimatedCostUSD: number;
}

const DEFAULT_QUOTA: QuotaState = {
  dailyRequests: 0,
  monthlyRequests: 0,
  lastRequestTime: 0,
  totalTokensUsed: 0,
  estimatedCostUSD: 0,
};

export function getQuotaState(): QuotaState {
  if (typeof window === 'undefined') return DEFAULT_QUOTA;
  try {
    const stored = localStorage.getItem('ai_quota_usage');
    if (stored) return JSON.parse(stored);
  } catch (e) {}
  return DEFAULT_QUOTA;
}

export function saveQuotaState(state: QuotaState) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('ai_quota_usage', JSON.stringify(state));
  } catch (e) {}
}

export function recordAiRequest(tokensUsed: number = 2000, modelType: 'groq' | 'gemini' = 'groq'): boolean {
  const state = getQuotaState();
  const now = Date.now();
  
  // Rate limiting cooldown (minimum 2 seconds between requests)
  if (now - state.lastRequestTime < 2000) {
    console.warn('AI request blocked by rate limiter: Cooldown active');
    return false;
  }

  // Token Cost Estimation
  // Groq Llama-3 cost: ~$0.15 per million tokens
  // Gemini 1.5 Pro: ~$1.25 per million tokens
  const tokenCost = modelType === 'gemini' 
    ? (tokensUsed / 1000000) * 1.25 
    : (tokensUsed / 1000000) * 0.15;

  const nextState: QuotaState = {
    dailyRequests: state.dailyRequests + 1,
    monthlyRequests: state.monthlyRequests + 1,
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
    dailyRequests: 0,
  });
}
