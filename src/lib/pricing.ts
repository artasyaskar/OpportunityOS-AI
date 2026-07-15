export interface PricingPlan {
  id: 'free' | 'professional_monthly' | 'professional_yearly' | 'founder_lifetime' | 'teams' | 'enterprise';
  name: string;
  priceUSD: number;
  pricePKR: number;
  billingCycle: 'monthly' | 'yearly' | 'one-time' | 'custom';
  aiLimitDaily: number;
  opportunitiesLimit: number;
  pdfExportEnabled: boolean;
  advisorEnabled: boolean;
  simulatorEnabled: boolean;
  teamsEnabled: boolean;
  prioritySupport: boolean;
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: 'Explorer',
    priceUSD: 0,
    pricePKR: 0,
    billingCycle: 'monthly',
    aiLimitDaily: 3,
    opportunitiesLimit: 5,
    pdfExportEnabled: false,
    advisorEnabled: false,
    simulatorEnabled: false,
    teamsEnabled: false,
    prioritySupport: false,
  },
  {
    id: 'professional_monthly',
    name: 'Professional Monthly',
    priceUSD: 4.99,
    pricePKR: 999,
    billingCycle: 'monthly',
    aiLimitDaily: 999,
    opportunitiesLimit: 999,
    pdfExportEnabled: true,
    advisorEnabled: true,
    simulatorEnabled: true,
    teamsEnabled: false,
    prioritySupport: false,
  },
  {
    id: 'professional_yearly',
    name: 'Professional Yearly',
    priceUSD: 49.0,
    pricePKR: 8999,
    billingCycle: 'yearly',
    aiLimitDaily: 999,
    opportunitiesLimit: 999,
    pdfExportEnabled: true,
    advisorEnabled: true,
    simulatorEnabled: true,
    teamsEnabled: false,
    prioritySupport: true,
  },
  {
    id: 'founder_lifetime',
    name: 'Founder Lifetime',
    priceUSD: 39.0,
    pricePKR: 9999,
    billingCycle: 'one-time',
    aiLimitDaily: 999,
    opportunitiesLimit: 999,
    pdfExportEnabled: true,
    advisorEnabled: true,
    simulatorEnabled: true,
    teamsEnabled: false,
    prioritySupport: true,
  },
  {
    id: 'teams',
    name: 'Teams',
    priceUSD: 19.0,
    pricePKR: 4999,
    billingCycle: 'monthly',
    aiLimitDaily: 999,
    opportunitiesLimit: 999,
    pdfExportEnabled: true,
    advisorEnabled: true,
    simulatorEnabled: true,
    teamsEnabled: true,
    prioritySupport: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    priceUSD: 0,
    pricePKR: 0,
    billingCycle: 'custom',
    aiLimitDaily: 9999,
    opportunitiesLimit: 9999,
    pdfExportEnabled: true,
    advisorEnabled: true,
    simulatorEnabled: true,
    teamsEnabled: true,
    prioritySupport: true,
  },
];
