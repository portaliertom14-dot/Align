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

/**
 * Redirige après la connexion (idempotent: skip if already on target)
 * 
 * - Si onboarding complété → Main/Feed
 * - Sinon → Onboarding
 */
export async function redirectAfterLogin(navigation) {
  try {
    const authState = await getAuthState();
    const target = authState.hasCompletedOnboarding ? `${ROUTES.MAIN}:${ROUTES.FEED}` : `${ROUTES.ONBOARDING}`;
    if (lastRedirectTarget === target) {
      if (__DEV__) console.log('[NavigationService] redirectAfterLogin skipped (already on target)');
      return;
    }
    lastRedirectTarget = target;

    if (authState.hasCompletedOnboarding) {
      console.log('[NavigationService] → Redirection vers Main/Feed');
      navigation.reset({
        index: 0,
        routes: [{ name: ROUTES.MAIN, params: { screen: ROUTES.FEED } }],
      });
    } else {
      const step = getSafeOnboardingRedirectStep(authState.onboardingStep);
      console.log('[NavigationService] → Redirection vers Onboarding step', step);
      navigation.reset({
        index: 0,
        routes: [{ name: ROUTES.ONBOARDING, params: { step } }],
      });
    }
  } catch (error) {
    console.error('[NavigationService] Erreur lors de la redirection après connexion:', error);
    lastRedirectTarget = null;
    navigation.reset({
      index: 0,
      routes: [{ name: ROUTES.MAIN, params: { screen: ROUTES.FEED } }],
    });
  }
}

/**
 * Redirige après la création de compte
 * 
 * Toujours → Onboarding (étape 0)
 */
export async function redirectAfterSignup(navigation) {
  try {
    console.log('[NavigationService] Redirection après création de compte...');
    console.log('[NavigationService] → Redirection vers Onboarding (étape 0)');

    navigation.reset({
      index: 0,
      routes: [{
        name: ROUTES.ONBOARDING,
        params: { step: 0 },
      }],
    });
  } catch (error) {
    console.error('[NavigationService] Erreur lors de la redirection après signup:', error);
    navigation.reset({
      index: 0,
      routes: [{ name: ROUTES.ONBOARDING }],
    });
  }
}

/**
 * CRITICAL: Fonction centralisée de décision de redirection
 * Logique unique: if !isAuthenticated -> Onboarding, else if !onboarding_completed -> OnboardingFlow, else -> Main/Feed
 * @param {Object} navigation - Navigation object (root navigator)
 * @returns {Promise<{success: boolean, route: string, params: object}>}
 */
export async function determineAndNavigate(navigation) {
  try {
    const authState = await getAuthState();
    
    // CAS 1: Non authentifié -> Onboarding
    if (!authState.isAuthenticated) {
      console.log('[NavigationService] → Redirection: Onboarding (non authentifié)');
      navigation.reset({
        index: 0,
        routes: [{ name: ROUTES.ONBOARDING }],
      });
      return { success: true, route: ROUTES.ONBOARDING, params: null };
    }
    
    // CAS 2: Authentifié mais onboarding non complété -> OnboardingFlow à l'étape sauvegardée
    if (!authState.hasCompletedOnboarding) {
      const step = getSafeOnboardingRedirectStep(authState.onboardingStep);
      console.log('[NavigationService] → Redirection: Onboarding step', step);
      navigation.reset({
        index: 0,
        routes: [{ name: ROUTES.ONBOARDING, params: { step } }],
      });
      return { success: true, route: ROUTES.ONBOARDING, params: { step } };
    }
    
    // CAS 3: Authentifié + onboarding complété -> Main/Feed
    console.log('[NavigationService] → Redirection: Main/Feed (onboarding complété)');
    navigation.reset({
      index: 0,
      routes: [{ name: ROUTES.MAIN, params: { screen: ROUTES.FEED } }],
    });
    return { success: true, route: ROUTES.MAIN, params: { screen: ROUTES.FEED } };
  } catch (error) {
    console.error('[NavigationService] Erreur determineAndNavigate:', error);
    // Fallback: Onboarding
    try {
      navigation.reset({
        index: 0,
        routes: [{ name: ROUTES.ONBOARDING }],
      });
    } catch (resetError) {
      console.error('[NavigationService] Erreur reset fallback:', resetError);
    }
    return { success: false, route: ROUTES.ONBOARDING, params: null };
  }
}

/**
 * Redirige après la complétion de l'onboarding
 * 
 * Toujours → Main/Feed (via fonction centralisée)
 */
export function redirectAfterOnboarding(navigation) {
  // CRITICAL: Utiliser la fonction centralisée
  determineAndNavigate(navigation).catch(err => {
    console.error('[NavigationService] Erreur redirectAfterOnboarding:', err);
  });
}

/**
 * Redirige après la déconnexion
 * 
 * Toujours → Onboarding (la route "Auth" n'existe pas dans le navigator)
 */
export function redirectAfterLogout(navigation) {
  lastRedirectTarget = null; // Allow redirect on next login
  try {
    console.log('[NavigationService] Redirection après déconnexion...');
    console.log('[NavigationService] → Redirection vers Onboarding');

    // CRITICAL: Utiliser "Onboarding" au lieu de "Auth" car "Auth" n'existe pas dans le navigator
    navigation.reset({
      index: 0,
      routes: [{ name: ROUTES.ONBOARDING }],
    });
  } catch (error) {
    console.error('[NavigationService] Erreur lors de la redirection après déconnexion:', error);
    // Fallback: navigate vers Onboarding
    try {
      navigation.navigate(ROUTES.ONBOARDING);
    } catch (navError) {
      console.error('[NavigationService] Erreur navigate vers Onboarding:', navError);
    }
  }
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
 * Protège une route et redirige si nécessaire
 * 
 * @param {string} routeName - Nom de la route
 * @param {Object} navigation - Objet navigation React Navigation
 */
export async function protectRoute(routeName, navigation) {
  try {
    const { allowed, redirectTo } = await canAccessRoute(routeName);

    if (!allowed && redirectTo) {
      console.log(`[NavigationService] Redirection forcée: ${routeName} → ${redirectTo}`);

      if (redirectTo === ROUTES.MAIN) {
        navigation.reset({
          index: 0,
          routes: [{ name: ROUTES.MAIN, params: { screen: ROUTES.FEED } }],
        });
      } else if (redirectTo === ROUTES.ONBOARDING) {
        const authState = await getAuthState();
        const step = getSafeOnboardingRedirectStep(authState.onboardingStep);
        navigation.reset({
          index: 0,
          routes: [{ name: ROUTES.ONBOARDING, params: { step } }],
        });
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: redirectTo }],
        });
      }

      return false;
    }

    return true;
  } catch (error) {
    console.error('[NavigationService] Erreur lors de la protection de route:', error);
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
