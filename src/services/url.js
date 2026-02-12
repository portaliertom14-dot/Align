/**
 * URL de base pour le web (reset password, redirections, etc.).
 * En prod : EXPO_PUBLIC_WEB_URL_PROD. En dev : window.location.origin.
 * Ne pas utiliser window.location.origin directement en prod pour éviter les redirects localhost.
 */
export function getWebBaseUrl() {
  const isWeb = typeof window !== 'undefined';

  if (!isWeb) return null;

  const prodUrl = (process.env.EXPO_PUBLIC_WEB_URL_PROD || '').trim().replace(/\/$/, '');

  const isLocalhost =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

  if (!isLocalhost && prodUrl) {
    console.log('[RESET] Using PROD URL:', prodUrl);
    return prodUrl;
  }

  console.log('[RESET] Using window origin:', window.location.origin);
  return window.location.origin;
}
