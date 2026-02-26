/**
 * Version / identifiant du build pour vérifier que le bon bundle est chargé.
 * En prod : défini au build (ex. EXPO_PUBLIC_BUILD_ID en CI) ou dérivé de package version.
 * Affiché uniquement en __DEV__ ou quand l'URL contient ?showVersion=1 (aucun impact UX en prod).
 */

/** Version ou hash du build (injecté en CI via EXPO_PUBLIC_BUILD_ID, sinon fallback). */
export const BUILD_VERSION =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_BUILD_ID) ||
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_APP_VERSION) ||
  '1.0.0';

/**
 * Log la version du build en console si :
 * - __DEV__ est true, ou
 * - (web) l'URL contient showVersion=1 (ex. https://www.align-app.fr/?showVersion=1)
 * N'impacte pas l'UX en prod pour les utilisateurs normaux.
 */
export function logBuildVersionIfNeeded() {
  const isDev = typeof __DEV__ !== 'undefined' && __DEV__;
  const urlFlag =
    typeof window !== 'undefined' &&
    typeof window.location?.search === 'string' &&
    window.location.search.includes('showVersion=1');
  if (!isDev && !urlFlag) return;
  if (typeof console !== 'undefined' && console.log) {
    console.log('[Align] build version:', BUILD_VERSION);
  }
}
