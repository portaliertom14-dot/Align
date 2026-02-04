/**
 * Source de l'action auth en cours : "login" (Se connecter) ou "signup" (Créer un compte).
 * Persisté en mémoire pour décider la redirection post-signIn sans dépendre de hasCompletedOnboarding.
 */
let sourceAuthAction = null;

export function setSourceAuthAction(action) {
  sourceAuthAction = action;
}

export function getSourceAuthAction() {
  return sourceAuthAction;
}
