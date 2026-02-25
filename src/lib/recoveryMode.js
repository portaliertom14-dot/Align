/**
 * Recovery Mode — priorité absolue sur le routing normal (onboarding/home).
 * Si l'URL ou le flag indique un flow reset password, l'app force /reset-password
 * et ne doit jamais exécuter la logique onboarding/home.
 *
 * RÈGLE : ne jamais logger le hash complet (tokens). Uniquement des booléens si besoin.
 */

const RECOVERY_MODE_KEY = 'align_recovery_flow';

function getStored() {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return window.sessionStorage.getItem(RECOVERY_MODE_KEY) === '1';
    }
  } catch (_) {}
  return false;
}

export function setRecoveryModeActive(active) {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      if (active) window.sessionStorage.setItem(RECOVERY_MODE_KEY, '1');
      else window.sessionStorage.removeItem(RECOVERY_MODE_KEY);
    }
  } catch (_) {}
}

export function clearRecoveryMode() {
  setRecoveryModeActive(false);
}

/** true si hash ou search contient type=recovery OU access_token= OU refresh_token= */
export function hasRecoveryTokensInUrl() {
  if (typeof window === 'undefined' || !window.location) return false;
  const hash = window.location.hash || '';
  const search = window.location.search || '';
  const h = hash.replace(/^#/, '');
  return (
    h.includes('type=recovery') ||
    h.includes('access_token=') ||
    h.includes('refresh_token=') ||
    search.includes('type=recovery') ||
    search.includes('access_token=') ||
    search.includes('refresh_token=')
  );
}

/** true si hash ou search contient error=access_denied OU error_code=otp_expired OU invalid OU expired */
export function hasRecoveryErrorInUrl() {
  if (typeof window === 'undefined' || !window.location) return false;
  const hash = (window.location.hash || '').replace(/^#/, '');
  const search = window.location.search || '';
  const combined = hash + '&' + search;
  return (
    combined.includes('error=access_denied') ||
    combined.includes('error_code=otp_expired') ||
    combined.includes('invalid') ||
    combined.includes('expired')
  );
}

/** Mode recovery actif : flag stocké OU tokens dans l'URL OU erreur dans l'URL. */
export function isRecoveryMode() {
  return getStored() || hasRecoveryTokensInUrl() || hasRecoveryErrorInUrl();
}
