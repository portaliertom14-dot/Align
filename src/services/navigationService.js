/**
 * Service de navigation et redirection intelligente
 * Gère les redirections selon l'état d'authentification et d'onboarding
 */

import {
  getAuthState,
  isAuthenticated,
  hasCompletedOnboarding,
  isFirstLogin,
  getOnboardingStep,
} from './authState';
import { sanitizeOnboardingStep, ONBOARDING_MAX_STEP } from '../lib/onboardingSteps';

export { ONBOARDING_MAX_STEP, sanitizeOnboardingStep };

function getSafeOnboardingRedirectStep(onboardingStep) {
  const safe = sanitizeOnboardingStep(onboardingStep);
  return Math.min(ONBOARDING_MAX_STEP, Math.max(2, safe));
}

/**
 * Routes disponibles dans l'application
 */
export const ROUTES = {
  // Authentification
  AUTH: 'Auth',
  LOGIN: 'Login',
  SIGNUP: 'Signup',
  
  // Onboarding
  ONBOARDING: 'Onboarding',
  ONBOARDING_START: 'OnboardingStart',
  
  // Application principale
  MAIN: 'Main',
  HOME: 'Home',
  FEED: 'Feed',
};

/**
 * Détermine la route initiale selon l'état utilisateur
 * 
 * CAS 1: Non authentifié → Auth
 * CAS 2: Authentifié + Onboarding complété → Main/Feed
 * CAS 3: Authentifié + Onboarding non complété → Onboarding
 */
export async function determineInitialRoute() {
  try {
    console.log('[NavigationService] Détermination de la route initiale...');

    // Récupérer l'état complet
    const authState = await getAuthState();

    console.log('[NavigationService] État utilisateur:', {
      isAuthenticated: authState.isAuthenticated,
      hasCompletedOnboarding: authState.hasCompletedOnboarding,
      onboardingStep: authState.onboardingStep,
    });

    // CAS 1: Utilisateur non authentifié
    if (!authState.isAuthenticated) {
      console.log('[NavigationService] → Route: Onboarding (non authentifié)');
      // CRITICAL: Utiliser "Onboarding" au lieu de "Auth" car "Auth" n'existe pas dans le navigator
      return {
        route: ROUTES.ONBOARDING,
        params: null,
      };
    }

    // CAS 2: Utilisateur authentifié + Onboarding complété
    if (authState.hasCompletedOnboarding) {
      console.log('[NavigationService] → Route: Main/Feed (onboarding complété)');
      return {
        route: ROUTES.MAIN,
        params: { screen: ROUTES.FEED },
      };
    }

    // CAS 3: Utilisateur authentifié + Onboarding non complété
    const step = getSafeOnboardingRedirectStep(authState.onboardingStep);
    console.log('[NavigationService] → Route: Onboarding step', step);
    return {
      route: ROUTES.ONBOARDING,
      params: { step },
    };
  } catch (error) {
    console.error('[NavigationService] Erreur lors de la détermination de la route:', error);
    // Fallback: Onboarding (la route "Auth" n'existe pas)
    return {
      route: ROUTES.ONBOARDING,
      params: null,
    };
  }
}

// Idempotent: only redirect once per target per session (avoid duplicate resets)
let lastRedirectTarget = null;
// Single-flight navigation: évite boucle de redirect (multiples SIGNED_IN / INITIAL_SESSION)
let _redirecting = false;

/**
 * Redirige après la connexion.
 * NE FAIT PLUS de navigation.reset : RootGate affiche le bon stack selon l'état auth/onboarding.
 */
export async function redirectAfterLogin(navigation) {
  console.log('[NAV] redirectAfterLogin (no-op, RootGate drives UI)');
}

/**
 * Redirige après la création de compte.
 * NE FAIT PLUS de reset : RootGate affiche Onboarding selon l'état.
 */
export async function redirectAfterSignup(navigation) {
  console.log('[NAV] redirectAfterSignup (no-op, RootGate drives UI)');
}

/**
 * Décision de route (sans navigate): utilisé pour savoir où on devrait être.
 * RootGate fait le rendu; plus de reset ici.
 */
export async function determineAndNavigate(navigation) {
  try {
    const authState = await getAuthState();
    if (!authState.isAuthenticated) {
      return { success: true, route: ROUTES.ONBOARDING, params: null };
    }
    if (!authState.hasCompletedOnboarding) {
      const step = getSafeOnboardingRedirectStep(authState.onboardingStep);
      return { success: true, route: ROUTES.ONBOARDING, params: { step } };
    }
    return { success: true, route: ROUTES.MAIN, params: { screen: ROUTES.FEED } };
  } catch (error) {
    console.error('[NavigationService] determineAndNavigate:', error);
    return { success: false, route: ROUTES.ONBOARDING, params: null };
  }
}

/**
 * Redirige après la complétion de l'onboarding.
 * NE FAIT PLUS de reset : RootGate affiche Main quand onboardingStatus === 'complete'.
 */
export function redirectAfterOnboarding(navigation) {
  console.log('[NAV] redirectAfterOnboarding (no-op, RootGate drives UI)');
}

/**
 * Redirige après la déconnexion.
 * NE FAIT PLUS de reset : RootGate affiche Welcome quand authStatus === 'signedOut'.
 */
export function redirectAfterLogout(navigation) {
  lastRedirectTarget = null;
  console.log('[NAV] redirectAfterLogout (no-op, RootGate drives UI)');
}

/**
 * Vérifie si l'utilisateur peut accéder à une route protégée
 * 
 * @param {string} routeName - Nom de la route
 * @returns {Promise<{allowed: boolean, redirectTo: string|null}>}
 */
export async function canAccessRoute(routeName) {
  try {
    const authState = await getAuthState();

    // Routes publiques (toujours accessibles)
    // CRITICAL: Utiliser ROUTES.ONBOARDING au lieu de ROUTES.AUTH (route n'existe pas)
    const publicRoutes = [ROUTES.ONBOARDING, ROUTES.LOGIN, ROUTES.SIGNUP];
    if (publicRoutes.includes(routeName)) {
      return { allowed: true, redirectTo: null };
    }

    // Utilisateur non authentifié ne peut pas accéder aux routes protégées
    if (!authState.isAuthenticated) {
      console.log('[NavigationService] Accès refusé: utilisateur non authentifié');
      return { allowed: false, redirectTo: ROUTES.ONBOARDING };
    }

    // Route Onboarding
    if (routeName === ROUTES.ONBOARDING || routeName === ROUTES.ONBOARDING_START) {
      // Si onboarding déjà complété, rediriger vers Home
      if (authState.hasCompletedOnboarding) {
        console.log('[NavigationService] Accès Onboarding refusé: déjà complété');
        return { allowed: false, redirectTo: ROUTES.MAIN };
      }
      // Sinon, accès autorisé
      return { allowed: true, redirectTo: null };
    }

    // Routes principales (Main, Home, Feed, etc.)
    const mainRoutes = [ROUTES.MAIN, ROUTES.HOME, ROUTES.FEED];
    if (mainRoutes.includes(routeName)) {
      // Si onboarding pas complété, rediriger vers Onboarding
      if (!authState.hasCompletedOnboarding) {
        console.log('[NavigationService] Accès Main refusé: onboarding non complété');
        return { allowed: false, redirectTo: ROUTES.ONBOARDING };
      }
      // Sinon, accès autorisé
      return { allowed: true, redirectTo: null };
    }

    // Par défaut, autoriser l'accès
    return { allowed: true, redirectTo: null };
  } catch (error) {
    console.error('[NavigationService] Erreur lors de la vérification d\'accès:', error);
    // CRITICAL: Utiliser ROUTES.ONBOARDING au lieu de ROUTES.AUTH
    return { allowed: false, redirectTo: ROUTES.ONBOARDING };
  }
}

/**
 * Protège une route : retourne allowed/redirectTo sans appeler reset.
 * RootGate gère l'affichage; le caller ne doit pas naviguer vers une route interdite.
 */
export async function protectRoute(routeName, navigation) {
  try {
    const { allowed, redirectTo } = await canAccessRoute(routeName);
    if (!allowed && redirectTo) {
      console.log(`[NavigationService] Accès refusé: ${routeName} → ${redirectTo} (RootGate gère l’affichage)`);
      return false;
    }
    return true;
  } catch (error) {
    console.error('[NavigationService] protectRoute:', error);
    return false;
  }
}

/**
 * Hook pour gérer la navigation basée sur l'état
 * À utiliser dans les composants
 */
export async function handleNavigationState(navigation) {
  try {
    const initialRoute = await determineInitialRoute();
    
    if (initialRoute.params) {
      navigation.navigate(initialRoute.route, initialRoute.params);
    } else {
      navigation.navigate(initialRoute.route);
    }
  } catch (error) {
    console.error('[NavigationService] Erreur lors de la gestion de la navigation:', error);
  }
}

/**
 * Vérifie et redirige si nécessaire au focus d'un écran
 * Utile pour les écrans protégés
 */
export async function checkAndRedirectOnFocus(routeName, navigation) {
  try {
    const { allowed, redirectTo } = await canAccessRoute(routeName);
    
    if (!allowed && redirectTo) {
      console.log(`[NavigationService] Redirection au focus: ${routeName} → ${redirectTo}`);
      await protectRoute(routeName, navigation);
    }
  } catch (error) {
    console.error('[NavigationService] Erreur lors de la vérification au focus:', error);
  }
}
