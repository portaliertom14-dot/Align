/**
 * Point d'entrée principal du système d'authentification et navigation
 * API simplifiée pour gérer tous les flux
 */

// Export des services principaux
export {
  getAuthState,
  isAuthenticated,
  hasCompletedOnboarding,
  isFirstLogin,
  markOnboardingCompleted,
  updateOnboardingStep,
  getOnboardingStep,
  clearAuthState,
  refreshAuthState,
  recordLogin,
  isNewAccount,
} from './authState';

export {
  determineInitialRoute,
  redirectAfterLogin,
  redirectAfterSignup,
  redirectAfterOnboarding,
  redirectAfterLogout,
  canAccessRoute,
  protectRoute,
  checkAndRedirectOnFocus,
  ROUTES,
} from './navigationService';

export {
  handleLogin,
  handleSignup,
  handleOnboardingCompletion,
  handleLogout,
  checkInitialAuthState,
  setupAuthStateListener,
  guardNavigation,
} from './authNavigation';

// Export des hooks
export {
  useRouteProtection,
  useAuth,
  useMainAppProtection,
  useOnboardingProtection,
  useInitialNavigation,
  useRequiresOnboarding,
} from '../hooks/useRouteProtection';

// Export des composants
export { default as ProtectedRoute, withRouteProtection } from '../components/ProtectedRoute';

/**
 * API SIMPLIFIÉE POUR LES CAS D'USAGE COURANTS
 */

/**
 * Gère la connexion complète (auth + redirection)
 */
import { handleLogin as login } from './authNavigation';
export const signInAndRedirect = login;

/**
 * Gère la création de compte complète (auth + redirection)
 */
import { handleSignup as signup } from './authNavigation';
export const signUpAndRedirect = signup;

/**
 * Complète l'onboarding et redirige vers l'app
 */
import { handleOnboardingCompletion as completeOnboarding } from './authNavigation';
export const completeOnboardingAndRedirect = completeOnboarding;

/**
 * Déconnecte et redirige vers l'auth
 */
import { handleLogout as logout } from './authNavigation';
export const signOutAndRedirect = logout;

/**
 * DOCUMENTATION
 */
export const AUTH_FLOW_DOCS = {
  version: '1.0.0',
  description: 'Système de redirection intelligent basé sur l\'authentification et l\'onboarding',
  features: [
    'Détection automatique état utilisateur',
    'Redirection intelligente selon le contexte',
    'Protection des routes',
    'Gestion onboarding complet',
    'Support reconnexion',
    'Persistence Supabase + AsyncStorage',
  ],
  cases: {
    nonAuthenticated: 'Redirection vers Auth',
    authenticatedWithOnboarding: 'Redirection vers Main/Feed',
    authenticatedWithoutOnboarding: 'Redirection vers Onboarding',
  },
  integration: {
    login: 'Utiliser signInAndRedirect(email, password, navigation)',
    signup: 'Utiliser signUpAndRedirect(email, password, navigation)',
    onboarding: 'Utiliser completeOnboardingAndRedirect(navigation)',
    logout: 'Utiliser signOutAndRedirect(navigation)',
  },
};

export default {
  signInAndRedirect,
  signUpAndRedirect,
  completeOnboardingAndRedirect,
  signOutAndRedirect,
  AUTH_FLOW_DOCS,
};
