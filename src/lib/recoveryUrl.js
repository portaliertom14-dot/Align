/**
 * Utilitaire pour le flux reset password (hash/query Supabase).
 * Lit hash et search, détecte erreur recovery (otp_expired, access_denied, etc.) pour redirection vers /reset-password.
 * Aucun log de tokens ni email (prod-safe).
 */

const RECOVERY_FLOW_LOG = true;

/** Clé sessionStorage pour conserver le hash recovery si l’URL est réécrite (ex. par Supabase detectSessionInUrl). */
export const ALIGN_RECOVERY_HASH_KEY = 'align_recovery_hash';
/** Clé sessionStorage pour la query (ex. ?code=...) en cas de PKCE. */
export const ALIGN_RECOVERY_SEARCH_KEY = 'align_recovery_search';
/** Clé sessionStorage pour forcer key = 'recovery' du NavigationContainer dès le boot. */
export const ALIGN_RECOVERY_KEY_ACTIVE = 'align_recovery_key_active';

function logRecovery(msg, data) {
  if (RECOVERY_FLOW_LOG && typeof console !== 'undefined' && console.log) {
    console.log('[RECOVERY_FLOW]', msg, data != null ? data : '');
  }
}

/**
 * Parse window.location.hash ET window.location.search en un seul objet params.
 * @returns {URLSearchParams} params (get() pour access_token, error_code, etc.)
 */
export function parseAuthHashOrQuery() {
  if (typeof window === 'undefined' || !window.location) return new URLSearchParams();
  const hash = (window.location.hash || '').replace(/^#/, '');
  const search = (window.location.search || '').replace(/^\?/, '');
  const combined = [hash, search].filter(Boolean).join('&');
  return new URLSearchParams(combined);
}

/**
 * @param {URLSearchParams} params
 * @returns {{ access_token: string|null, refresh_token: string|null, type: string|null, error: string|null, error_code: string|null, error_description: string|null }}
 */
export function getParams(params) {
  const p = params || parseAuthHashOrQuery();
  return {
    access_token: p.get('access_token') || null,
    refresh_token: p.get('refresh_token') || null,
    type: p.get('type') || null,
    error: p.get('error') || null,
    error_code: p.get('error_code') || null,
    error_description: p.get('error_description') || null,
  };
}

/**
 * true si l’URL indique une erreur recovery (lien expiré/invalide, etc.).
 * - error=access_denied
 * - error_code=otp_expired
 * - error_description contient "invalid" ou "expired"
 * - type=recovery mais pas d’access_token
 */
export function isRecoveryError(params) {
  const p = params || parseAuthHashOrQuery();
  const obj = getParams(p);
  if (obj.error === 'access_denied') return true;
  if (obj.error_code === 'otp_expired') return true;
  const desc = (obj.error_description || '').toLowerCase();
  if (desc.includes('invalid') || desc.includes('expired')) return true;
  if (obj.type === 'recovery' && !obj.access_token) return true;
  return false;
}

/**
 * true si l’URL contient des tokens recovery (lien valide).
 */
export function isRecoveryToken(params) {
  const obj = getParams(params || parseAuthHashOrQuery());
  return !!(obj.access_token || (obj.type === 'recovery' && obj.refresh_token));
}

/**
 * true si l’app est en flux recovery (reset password) : pathname = /reset-password OU hash contient type=recovery/access_token.
 * À utiliser pour bypass guards et interdire le fetch user_profiles tant que setSession n’est pas fait sur ResetPasswordScreen.
 */
export function isRecoveryFlow() {
  if (typeof window === 'undefined' || !window.location) return false;
  const path = (window.location.pathname || '').replace(/\/$/, '').replace(/^\//, '');
  const hash = window.location.hash || '';
  if (path === 'reset-password' || path.endsWith('/reset-password')) return true;
  if (hash.indexOf('type=recovery') !== -1 || hash.indexOf('access_token') !== -1 || hash.indexOf('error=') !== -1) return true;
  return false;
}

/**
 * Sauvegarde hash et query recovery en sessionStorage dès le boot (avant que Supabase ou autre ne les consomme).
 * Appelé en tout premier dans l'app ; sauvegarde dès qu'une URL contient des tokens, quel que soit le path.
 */
export function persistRecoveryHashIfPresent() {
  if (typeof window === 'undefined' || !window.location || !window.sessionStorage) return;
  const hash = window.location.hash || '';
  const search = window.location.search || '';
  const hashHasTokens = hash.indexOf('access_token') !== -1 || hash.indexOf('type=recovery') !== -1;
  const searchHasTokens = search.indexOf('code=') !== -1 || search.indexOf('access_token=') !== -1;
  try {
    if (hashHasTokens) sessionStorage.setItem(ALIGN_RECOVERY_HASH_KEY, hash);
    if (searchHasTokens) sessionStorage.setItem(ALIGN_RECOVERY_SEARCH_KEY, search);
    if (hashHasTokens || searchHasTokens) sessionStorage.setItem(ALIGN_RECOVERY_KEY_ACTIVE, '1');
  } catch (_) {}
  // Juste après les setItem existants, ajouter :
  setTimeout(() => {
    try {
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname + (window.location.search || ''));
      }
    } catch (_) {}
  }, 0);
}

/**
 * À appeler au boot (web) : si le hash contient access_token ou type=recovery (Supabase redirige vers home),
 * forcer /reset-password en gardant le hash. Utilise replace (pas push).
 */
export function redirectRecoveryTokenToResetPassword() {
  if (typeof window === 'undefined' || !window.location) return;
  const path = (window.location.pathname || '').replace(/\/$/, '').replace(/^\//, '');
  const alreadyOnReset = path === 'reset-password' || path.endsWith('/reset-password') || (window.location.href || '').indexOf('reset-password') !== -1;
  if (alreadyOnReset) {
    if (RECOVERY_FLOW_LOG && typeof console !== 'undefined' && console.log) console.log('[RECOVERY] skip redirect because already on reset-password');
    return;
  }
  const hash = window.location.hash || '';
  if (hash.indexOf('access_token') === -1 && hash.indexOf('type=recovery') === -1) return;
  if (RECOVERY_FLOW_LOG && typeof console !== 'undefined' && console.log) {
    console.log('[RECOVERY_BOOT] forcing reset-password redirect');
  }
  const origin = window.location.origin || '';
  const search = window.location.search || '';
  window.location.replace(origin + '/reset-password' + search + hash);
}

/**
 * À appeler au boot (web) : si erreur recovery dans l’URL, redirige vers /reset-password?recovery_error=1.
 * Utilise replace pour éviter boucle.
 */
export function redirectRecoveryErrorToResetPassword() {
  if (typeof window === 'undefined' || !window.location) return;
  const path = (window.location.pathname || '').replace(/\/$/, '').replace(/^\//, '');
  const alreadyOnReset = path === 'reset-password' || path.endsWith('/reset-password') || (window.location.href || '').indexOf('reset-password') !== -1;
  if (alreadyOnReset) {
    if (RECOVERY_FLOW_LOG && typeof console !== 'undefined' && console.log) console.log('[RECOVERY] skip redirect because already on reset-password');
    return;
  }
  const params = parseAuthHashOrQuery();
  if (!isRecoveryError(params)) return;
  logRecovery('detected_error', true);
  logRecovery('redirecting_to_reset_password', '');
  const origin = window.location.origin || '';
  window.location.replace(origin + '/reset-password?recovery_error=1');
}
