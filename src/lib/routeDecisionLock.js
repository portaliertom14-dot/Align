/**
 * Verrou global pour les transitions critiques (profile fetch, décision de route).
 * Tant que le verrou est actif, une seule décision de navigation peut être prise ;
 * les mises à jour d'état ne doivent pas déclencher de redécision contradictoire.
 *
 * Logs standardisés : ROUTE_DECISION, ROUTE_SKIPPED, STATE_LOCKED, STATE_UNLOCKED.
 */

let _locked = false;
let _lockedReason = '';

export function isLocked() {
  return _locked;
}

export function getLock(reason = 'profile_fetch') {
  if (_locked && __DEV__) {
    console.log('[STATE_LOCKED] already locked', { reason: _lockedReason, attempted: reason });
    return;
  }
  _locked = true;
  _lockedReason = reason;
  if (__DEV__) console.log('[STATE_LOCKED]', { reason });
}

export function releaseLock() {
  if (!_locked) return;
  if (__DEV__) console.log('[STATE_UNLOCKED]', { reason: _lockedReason });
  _locked = false;
  _lockedReason = '';
}

/**
 * Log une décision de route prise par RootGate.
 * @param {string} decision - 'AuthStack' | 'Loader' | 'AppStackMain' | 'OnboardingStart' | 'OnboardingResume'
 * @param {object} [context] - authStatus, onboardingStatus, hasProfileRow, etc.
 */
export function logRouteDecision(decision, context = {}) {
  if (__DEV__) {
    console.log('[ROUTE_DECISION]', JSON.stringify({ decision, ...context }));
  }
}

/**
 * Log quand une décision est ignorée (idempotence : déjà dans le stack cible).
 */
export function logRouteSkipped(reason, context = {}) {
  if (__DEV__) {
    console.log('[ROUTE_SKIPPED]', JSON.stringify({ reason, ...context }));
  }
}
