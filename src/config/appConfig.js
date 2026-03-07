/**
 * Configuration publique de l'app (pré-launch).
 * Aucune clé secrète ici — uniquement URLs et emails de contact.
 */

/** Email de contact support (configurable via EXPO_PUBLIC_SUPPORT_EMAIL en build) */
export const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL || 'align.app.contact@gmail.com';

/** URL politique de confidentialité (si différente de l'app) */
export const PRIVACY_POLICY_URL = process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL || null;

/**
 * Feature flag paywall.
 * - "true" → paywall actif (redirection Paywall, vérif premium, Stripe).
 * - "false" → paywall désactivé (flux gratuit, pas de blocage, pas de Stripe).
 * - Non défini : en dev (__DEV__) = actif, en prod = désactivé.
 * Variables lues : EXPO_PUBLIC_PAYWALL_ENABLED ou NEXT_PUBLIC_PAYWALL_ENABLED.
 */
export function isPaywallEnabled() {
  const raw =
    (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_PAYWALL_ENABLED) ||
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_PAYWALL_ENABLED);
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return typeof __DEV__ !== 'undefined' && __DEV__;
}
