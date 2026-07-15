import { isFeatureEnabled, FeatureFlag, getFeatureGateLabel } from './features';

export const ADMIN_WHITELIST = [
  'artasyaskar@gmail.com',
];

export function isUserAdmin(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  return (
    ADMIN_WHITELIST.includes(normalized) ||
    (typeof window !== 'undefined' && localStorage.getItem('dev_admin_override') === 'true')
  );
}

export function checkPermission(flag: FeatureFlag, sub?: any): { allowed: boolean; errorLabel?: string } {
  const allowed = isFeatureEnabled(flag, sub);
  if (!allowed) {
    return {
      allowed: false,
      errorLabel: `Gated under Professional: ${getFeatureGateLabel(flag)}`,
    };
  }
  return { allowed: true };
}

export function triggerUpgradeModal(flag: FeatureFlag) {
  if (typeof window === 'undefined') return;
  const event = new CustomEvent('open-upgrade-modal', { detail: { flag } });
  window.dispatchEvent(event);
}
