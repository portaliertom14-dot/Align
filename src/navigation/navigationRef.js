/**
 * Référence centralisée du NavigationContainer et garde "prêt".
 * À utiliser pour éviter tout reset/navigate avant que le container soit monté.
 */

import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

/** true une fois que NavigationContainer a appelé onReady. Ne jamais reset avant. */
export const isReadyRef = { current: false };

/**
 * Reset sécurisé : n'exécute que si le container est prêt et que le state est valide.
 * @param {string} routeName - Nom de la route (ex: 'Main', 'Onboarding', 'Welcome')
 * @param {object} [params] - Paramètres optionnels (ex: { screen: 'Feed' }, { step: 2 })
 */
export function safeReset(routeName, params = undefined) {
  if (!isReadyRef.current) {
    if (__DEV__) console.log('[navigationRef] safeReset skipped — container not ready');
    return false;
  }
  if (!navigationRef.isReady()) {
    if (__DEV__) console.log('[navigationRef] safeReset skipped — ref not ready');
    return false;
  }
  const routes = params != null ? [{ name: routeName, params }] : [{ name: routeName }];
  try {
    navigationRef.reset({
      index: 0,
      routes,
    });
    return true;
  } catch (err) {
    if (__DEV__) console.warn('[navigationRef] safeReset error:', err?.message ?? err);
    return false;
  }
}
