import { PRICING_PLANS } from './pricing';
import { SubscriptionRecord } from './subscription';

export type FeatureFlag = 
  | 'AI_BUILDER' 
  | 'PDF_EXPORT' 
  | 'EXECUTIVE_ADVISOR' 
  | 'KNOWLEDGE_GRAPH' 
  | 'SIMULATOR' 
  | 'UNLIMITED_AI';

export function isFeatureEnabled(flag: FeatureFlag, sub?: SubscriptionRecord | null): boolean {
  if (typeof window === 'undefined') return false;

  // 1. Check override settings / admin overrides
  try {
    const adminFlags = localStorage.getItem('admin_feature_flags');
    if (adminFlags) {
      const parsed = JSON.parse(adminFlags);
      if (parsed[flag] !== undefined) return parsed[flag];
    }
  } catch (e) {}

  // 2. Resolve active subscription plan settings
  // If subscription state is ACTIVE or LIFETIME or ENTERPRISE, unlock all features
  if (sub && ['ACTIVE', 'LIFETIME', 'ENTERPRISE'].includes(sub.state)) {
    return true;
  }

  // 3. Fallback to Free plan limits
  const plan = PRICING_PLANS.find(p => p.id === 'free');
  if (!plan) return false;

  switch (flag) {
    case 'AI_BUILDER':
      return true; // Explorer gets basic builder
    case 'PDF_EXPORT':
      return plan.pdfExportEnabled;
    case 'EXECUTIVE_ADVISOR':
      return plan.advisorEnabled;
    case 'SIMULATOR':
      return plan.simulatorEnabled;
    case 'UNLIMITED_AI':
      return false;
    case 'KNOWLEDGE_GRAPH':
      return false;
    default:
      return false;
  }
}

export function getFeatureGateLabel(flag: FeatureFlag): string {
  switch (flag) {
    case 'PDF_EXPORT':
      return '💼 Professional Investor Mode';
    case 'EXECUTIVE_ADVISOR':
      return '🤖 AI Chief Executive advisor';
    case 'SIMULATOR':
      return '⚡ Dynamic Probability Simulator';
    case 'KNOWLEDGE_GRAPH':
      return '🕸️ Opportunity Intelligence Graph';
    case 'UNLIMITED_AI':
      return '🧠 Priority AI Processing Quotas';
    default:
      return 'Premium Feature';
  }
}
