/**
 * Bootstrap recovery (reset password) : s'exécute au chargement du bundle, AVANT tout import Supabase.
 * Met le flag en sessionStorage et redirige vers /reset-password si l'URL contient des tokens/erreur.
 * Évite que Supabase consomme le hash avant notre code (bug : 1er clic → Onboarding).
 * Aucune dépendance (pas de supabase, pas de React).
 */
(function () {
  if (typeof window === 'undefined' || !window.location) return;
  var path = (window.location.pathname || '').replace(/\/$/, '');
  var isResetPage = path === 'reset-password' || path === '/reset-password' || path.endsWith('/reset-password');
  var hash = window.location.hash || '';
  var search = window.location.search || '';
  var hasRecovery = hash.indexOf('access_token') !== -1 || hash.indexOf('type=recovery') !== -1 || hash.indexOf('refresh_token') !== -1;
  var hasError = hash.indexOf('error_code=otp_expired') !== -1 || hash.indexOf('error=access_denied') !== -1 || search.indexOf('error_code=otp_expired') !== -1;
  if (hasRecovery || hasError) {
    try { window.sessionStorage.setItem('align_recovery_flow', '1'); } catch (_) {}
  }
  if (!isResetPage && (hasRecovery || hasError)) {
    window.location.replace(window.location.origin + '/reset-password' + search + hash);
  }
})();
