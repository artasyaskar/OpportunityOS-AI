export interface PromoCode {
  code: string;
  discountPercentage: number;
  description: string;
}

export const AVAILABLE_PROMOS: PromoCode[] = [
  { code: 'HACKATHON50', discountPercentage: 50, description: 'Hackathon special discount (50% Off)' },
  { code: 'STUDENT25', discountPercentage: 25, description: 'Student verification code (25% Off)' },
  { code: 'EARLYBIRD', discountPercentage: 15, description: 'Early adopter coupon (15% Off)' },
  { code: 'FOUNDER', discountPercentage: 30, description: 'Founder launch promotion (30% Off)' },
];

export function validatePromo(code: string): PromoCode | null {
  const normalized = code.trim().toUpperCase();
  return AVAILABLE_PROMOS.find(p => p.code === normalized) || null;
}

export function applyReferral(refCode: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const referrals = localStorage.getItem('referral_conversions') ? JSON.parse(localStorage.getItem('referral_conversions')!) : [];
    if (!referrals.includes(refCode)) {
      referrals.push(refCode);
      localStorage.setItem('referral_conversions', JSON.stringify(referrals));
      // Give current user +50 credits
      const currentCredits = parseInt(localStorage.getItem('user_ai_credits') || '100', 10);
      localStorage.setItem('user_ai_credits', (currentCredits + 50).toString());
      return true;
    }
  } catch (e) {}
  return false;
}
