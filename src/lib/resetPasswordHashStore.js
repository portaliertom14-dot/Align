/**
 * Store pour le hash de reset password, capturé au plus tôt (avant que la navigation ne modifie l'URL).
 * Utilisé par App.js (capture) et ResetPasswordScreen.js (lecture).
 */
let capturedHash = '';

export function captureResetPasswordHash() {
  if (typeof window !== 'undefined' && window.location) {
    const pathname = (window.location.pathname || '');
    const hash = window.location.hash || '';
    if (pathname.includes('reset-password') && hash.includes('access_token')) {
      capturedHash = hash;
    }
  }
}

export function getResetPasswordHash() {
  return capturedHash;
}
