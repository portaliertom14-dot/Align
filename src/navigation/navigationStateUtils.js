/**
 * Garde-fous pour l'état React Navigation (web + linking) : getState / getRootState
 * peuvent être incomplets pendant une transition ; tout accès à .routes doit être null-safe.
 */
export function getSafeRoutesFromNavigation(navigation) {
  if (navigation == null || typeof navigation.getState !== 'function') return [];
  try {
    const state = navigation.getState();
    return state?.routes ?? [];
  } catch (_) {
    return [];
  }
}

export function getSafeRootRoutesFromRef(navRef) {
  if (navRef == null || typeof navRef.getRootState !== 'function') return [];
  try {
    if (typeof navRef.isReady === 'function' && !navRef.isReady()) return [];
    const state = navRef.getRootState();
    return state?.routes ?? [];
  } catch (_) {
    return [];
  }
}

/**
 * Enveloppe getStateFromPath : ne jamais renvoyer un état partiel sans tableau routes
 * (évite des chemins où le linking interne lit state.routes).
 */
export function createSafeGetStateFromPath(getStateFromPathImpl) {
  return function safeGetStateFromPath(path, config) {
    try {
      const state = getStateFromPathImpl(path, config);
      if (state != null && !Array.isArray(state.routes)) {
        if (__DEV__) console.warn('[Navigation] getStateFromPath: état sans routes', path);
        return undefined;
      }
      return state;
    } catch (e) {
      if (__DEV__) console.warn('[Navigation] getStateFromPath', path, e?.message ?? e);
      return undefined;
    }
  };
}
