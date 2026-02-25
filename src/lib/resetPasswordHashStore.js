/**
 * Store pour le hash de reset password et le flag "recovery flow" (bloquer redirections vers Onboarding/Main).
 * Utilisé par App.js, RootGate, AuthContext, ResetPasswordScreen, recoveryFlow.js (RecoveryGate).
 * IMPORTANT : ne jamais logger access_token, refresh_token, email ni aucune PII.
 */
const RECOVERY_FLOW_KEY = 'align_recovery_flow';
let capturedHash = '';
let recoveryFlowActive = false;

function readRecoveryFlowFromStorage() {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return window.sessionStorage.getItem(RECOVERY_FLOW_KEY) === '1';
    }
  } catch (_) {}
  return false;
}

function isRecoveryHash(hash) {
  if (!hash || typeof hash !== 'string') return false;
  const h = hash.replace(/^#/, '');
  return h.includes('access_token') || h.includes('type=recovery');
}

/** Supabase renvoie parfois vers la home avec #error=access_denied&error_code=otp_expired quand le lien est expiré/invalide. */
function isRecoveryErrorInUrl() {
  if (typeof window === 'undefined' || !window.location) return false;
  const hash = (window.location.hash || '').replace(/^#/, '');
  const search = window.location.search || '';
  const combined = hash + '&' + search;
  return (
    combined.includes('error=access_denied') ||
    combined.includes('error_code=otp_expired') ||
    (combined.includes('error_description=') && (combined.includes('invalid') || combined.includes('expired')))
  );
}

export function setRecoveryFlowActive(active) {
  recoveryFlowActive = !!active;
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    try { console.log('[RECOVERY_FLOW]', active ? 'active' : 'inactive'); } catch (_) {}
  }
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      if (recoveryFlowActive) window.sessionStorage.setItem(RECOVERY_FLOW_KEY, '1');
      else window.sessionStorage.removeItem(RECOVERY_FLOW_KEY);
    }
  } catch (_) {}
}

export function getRecoveryFlowActive() {
  return recoveryFlowActive || readRecoveryFlowFromStorage();
}

export function clearRecoveryFlowActive() {
  setRecoveryFlowActive(false);
}

export function captureResetPasswordHash() {
  if (typeof window !== 'undefined' && window.location) {
    const pathname = (window.location.pathname || '').replace(/\/$/, '');
    const pathNormalized = pathname.endsWith('/reset-password') || pathname === 'reset-password' || pathname === '/reset-password';
    const hash = window.location.hash || '';
    if (isRecoveryHash(hash)) {
      capturedHash = hash;
      setRecoveryFlowActive(true);
    }
    if (pathNormalized) {
      setRecoveryFlowActive(true);
    }
    if (!pathNormalized && isRecoveryHash(hash)) {
      const search = window.location.search || '';
      const base = window.location.origin || '';
      const target = `${base}/reset-password${search}${hash}`;
      window.location.replace(target);
      return true;
    }
    if (!pathNormalized && isRecoveryErrorInUrl()) {
      setRecoveryFlowActive(true);
      const base = window.location.origin || '';
      window.location.replace(base + '/reset-password');
      return true;
    }
  }
  return false;
}

/** True si l’URL (hash ou search) contient des tokens de recovery (access_token ou type=recovery). */
export function isRecoveryFlow() {
  if (getRecoveryFlowActive()) return true;
  if (typeof window === 'undefined' || !window.location) return false;
  const path = (window.location.pathname || '').replace(/^\/|\/$/g, '');
  const hash = window.location.hash || '';
  const search = window.location.search || '';
  if (path === 'reset-password' || path.startsWith('reset-password/')) return true;
  if (hash.includes('type=recovery')) return true;
  if (hash.includes('access_token=') || hash.includes('refresh_token=')) return true;
  if (hash.includes('error_code=otp_expired') || hash.includes('error=access_denied')) return true;
  if (search.includes('error_code=otp_expired') || search.includes('error=access_denied')) return true;
  return false;
}

export function isRecoveryInProgress() {
  return isRecoveryFlow();
}

/** True si l’URL contient une erreur Supabase de type lien expiré/invalide (redirection vers reset-password). */
export function isRecoveryErrorInProgress() {
  return isRecoveryErrorInUrl();
}

export function getResetPasswordHash() {
  return capturedHash;
}
