/**
 * Parse une URL de deep link (mobile) ou redirect pour en extraire les paramètres recovery.
 * Supporte: code= (PKCE), access_token + refresh_token (fragment ou query).
 * À utiliser côté mobile (Linking.getInitialURL() / 'url' event).
 */

/**
 * Parse une URL brute (align://..., https://..., exp://...).
 * @param {string} url - URL complète du deep link ou redirect
 * @returns {{ type: 'code', code: string } | { type: 'tokens', access_token: string, refresh_token: string } | null}
 */
export function parseRecoveryParamsFromUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    // Gérer fragment (#) et query (?): certains clients mettent tokens dans fragment
    const hashIndex = trimmed.indexOf('#');
    const queryIndex = trimmed.indexOf('?');
    const hashPart = hashIndex >= 0 ? trimmed.slice(hashIndex + 1) : '';
    const queryPart = queryIndex >= 0 ? trimmed.slice(queryIndex + 1).split('#')[0] : '';
    const combined = [queryPart, hashPart].filter(Boolean).join('&');
    const params = new URLSearchParams(combined);

    const code = params.get('code') || null;
    const access_token = params.get('access_token') || null;
    const refresh_token = params.get('refresh_token') || null;
    const type = params.get('type') || '';

    if (code) {
      return { type: 'code', code };
    }
    if ((type === 'recovery' || access_token) && access_token && refresh_token) {
      return { type: 'tokens', access_token, refresh_token };
    }
    return null;
  } catch (e) {
    if (__DEV__) console.warn('[RECOVERY_DEEPLINK] parse error', e?.message);
    return null;
  }
}

/**
 * Indique si l'URL ressemble à un lien de reset password (à appeler avant parse pour éviter de traiter n'importe quel lien).
 */
export function isRecoveryUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const u = url.toLowerCase();
  return u.indexOf('reset-password') !== -1 || u.indexOf('recovery') !== -1 || u.indexOf('type=recovery') !== -1 || u.indexOf('access_token=') !== -1 || u.indexOf('code=') !== -1;
}
