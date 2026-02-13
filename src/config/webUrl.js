/**
 * Origine web de l'app (sans slash final).
 * Ne jamais hardcoder de domaine dans le code ; utiliser getWebOrigin().
 *
 * Variables d'environnement (au moins une doit être définie pour le web) :
 * - EXPO_PUBLIC_WEB_URL_PROD ou WEB_URL_PROD (ex: https://align-app.fr)
 * - EXPO_PUBLIC_WEB_URL_PREVIEW ou WEB_URL_PREVIEW (ex: https://align-vercel.vercel.app) optionnel
 * - EXPO_PUBLIC_WEB_URL_DEV ou WEB_URL_DEV (ex: http://localhost:5173)
 */

function getEnv(name) {
  if (typeof process === 'undefined' || !process.env) return undefined;
  const v = process.env[`EXPO_PUBLIC_${name}`] ?? process.env[name];
  return typeof v === 'string' && v.trim() ? v.trim().replace(/\/$/, '') : undefined;
}

const WEB_URL_PROD = getEnv('WEB_URL_PROD');
const WEB_URL_PREVIEW = getEnv('WEB_URL_PREVIEW');
const WEB_URL_DEV = getEnv('WEB_URL_DEV');

/**
 * Retourne l'origine web à utiliser (prod, preview ou dev).
 * - En production (NODE_ENV === 'production') → WEB_URL_PROD
 * - En preview (ex: Vercel preview) si WEB_URL_PREVIEW est défini → WEB_URL_PREVIEW
 * - Sinon → WEB_URL_DEV (fallback local)
 * @returns {string} Origine sans slash final (ex: https://align-app.fr)
 */
export function getWebOrigin() {
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd && WEB_URL_PROD) return WEB_URL_PROD;
  const isPreview = process.env.VERCEL_ENV === 'preview' || process.env.EXPO_PUBLIC_VERCEL_PREVIEW === '1';
  if (isPreview && WEB_URL_PREVIEW) return WEB_URL_PREVIEW;
  return WEB_URL_DEV || WEB_URL_PROD || (typeof window !== 'undefined' && window.location?.origin) || '';
}

/**
 * Source unique pour l’URL de base web (reset password, redirections).
 * En prod (hostname !== localhost) → EXPO_PUBLIC_WEB_URL_PROD (ex. https://align-app.fr).
 * En dev (localhost) → EXPO_PUBLIC_WEB_URL_DEV (ex. http://localhost:5173).
 * Ne jamais utiliser window.location.origin en prod pour éviter localhost / ancien domaine Vercel.
 */
export function getWebBaseUrl() {
  const isWeb = typeof window !== 'undefined';
  if (!isWeb) return null;

  const prod = (process.env.EXPO_PUBLIC_WEB_URL_PROD || '').trim().replace(/\/$/, '') || WEB_URL_PROD;
  const dev = (process.env.EXPO_PUBLIC_WEB_URL_DEV || '').trim().replace(/\/$/, '') || WEB_URL_DEV;
  const host = window.location?.hostname || '';

  if (host !== 'localhost' && host !== '127.0.0.1') {
    return (prod || window.location?.origin || '').replace(/\/$/, '');
  }
  return (dev || window.location?.origin || '').replace(/\/$/, '');
}

export { WEB_URL_PROD, WEB_URL_PREVIEW, WEB_URL_DEV };
