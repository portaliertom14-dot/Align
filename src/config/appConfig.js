/**
 * Configuration publique de l'app (pré-launch).
 * Aucune clé secrète ici — uniquement URLs et emails de contact.
 */

/** Email de contact support (configurable via EXPO_PUBLIC_SUPPORT_EMAIL en build) */
export const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL || 'contact@align-app.fr';

/** URL politique de confidentialité (si différente de l'app) */
export const PRIVACY_POLICY_URL = process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL || null;
