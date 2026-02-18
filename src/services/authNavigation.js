/**
 * Service d'intégration authentification et navigation
 * Gère le flux complet : connexion, création compte, onboarding
 */
import { devLog, devWarn, devError } from '../utils/devLog';
import { supabase } from './supabase';
import { getCurrentUser, signIn as authSignIn, signUp as authSignUp, signOut as authSignOut } from './auth';
import { upsertUser } from './userService';
import {
  getAuthState,
  markOnboardingCompleted,
  updateOnboardingStep,
  clearAuthState,
  recordLogin,
} from './authState';
import {
  redirectAfterLogin,
  redirectAfterSignup,
  redirectAfterOnboarding,
  redirectAfterLogout,
  ROUTES,
} from './navigationService';
import { clearAllUserData } from './authCleanup';
import { loadDraft } from '../lib/onboardingDraftStore';

// Import des systèmes pour réinitialisation après connexion
import { initializeModules } from '../lib/modules';
import { initializeQuests } from '../lib/quests/initQuests';

/**
 * Gère la connexion d'un utilisateur existant
 * 
 * @param {string} email
 * @param {string} password
 * @param {Object} navigation - Objet navigation React Navigation
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function handleLogin(email, password, navigation) {
  try {
    devLog('[AuthNavigation] Connexion:', email);

    const { user, error: authError } = await authSignIn(email, password);
    
    if (authError || !user) {
      devError('[AuthNavigation] Erreur:', authError);
      return {
        success: false,
        error: authError?.message || 'Erreur de connexion',
      };
    }

    devLog('[AuthNavigation] Auth OK');

    // Invalider le cache de progression pour forcer un fetch frais depuis DB
    try {
      const { invalidateProgressCache } = require('../lib/userProgressSupabase');
      invalidateProgressCache();
    } catch (_) {}

    await recordLogin();
    const authState = await getAuthState(true);

    try {
      await initializeQuests();
    } catch (questError) {
      devWarn('[AuthNavigation] Reinit quêtes:', questError?.message);
    }
    
    try {
      await initializeModules();
    } catch (moduleError) {
      devWarn('[AuthNavigation] Reinit modules:', moduleError?.message);
    }

    // 5. Rediriger selon l'état
    await redirectAfterLogin(navigation);

    setTimeout(async () => {
      try {
        const { initializeAutoSave } = require('../lib/autoSave');
        const { getUserProgress } = require('../lib/userProgressSupabase');
        // Pas de forceRefresh: Feed a déjà chargé, on utilise le cache (ou dedupe si encore en cours)
        await getUserProgress(false);
        await initializeAutoSave();
      } catch (error) {
        devError('[AuthNavigation] AutoSave:', error);
      }
    }, 1500);

    return { success: true };
  } catch (error) {
    devError('[AuthNavigation] Login:', error);
    return {
      success: false,
      error: error.message || 'Erreur inconnue',
    };
  }
}

/**
 * Gère la création d'un nouveau compte
 * 
 * @param {string} email
 * @param {string} password
 * @param {Object} navigation - Objet navigation React Navigation
 * @param {Object} userData - Données utilisateur additionnelles (optionnel)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function handleSignup(email, password, navigation, userData = {}) {
  try {
    devLog('[AuthNavigation] Tentative de création de compte:', email);

    // 1. Créer le compte utilisateur
    const { user, error: authError } = await authSignUp(email, password);
    
    if (authError || !user) {
      devError('[AuthNavigation] Erreur de création de compte:', authError);
      return {
        success: false,
        error: authError?.message || 'Erreur de création de compte',
      };
    }

    devLog('[AuthNavigation] ✅ Compte créé:', user.id);

    // 2. Fusionner le brouillon pré-compte (7 questions + DOB) dans le profil pour qu'il soit créé avec birthdate
    let profileData = {
      email: email,
      onboarding_completed: false, // IMPORTANT: false pour nouveau compte
      ...userData,
    };
    try {
      const draft = await loadDraft();
      if (draft?.dob) profileData.birthdate = draft.dob;
      if (draft?.schoolLevel) profileData.school_level = draft.schoolLevel;
    } catch (e) {
      devWarn('[AuthNavigation] Chargement brouillon (non bloquant):', e);
    }

    // 3. Créer le profil utilisateur dans la DB (avec birthdate si brouillon présent)
    const { error: profileError } = await upsertUser(user.id, profileData);
    
    if (profileError) {
      devWarn('[AuthNavigation] Erreur création profil (non-bloquant):', profileError);
      // Ne pas bloquer si le profil ne peut pas être créé (sera créé plus tard)
    }

    // 4. Initialiser l'étape d'onboarding à 0
    await updateOnboardingStep(0);

    devLog('[AuthNavigation] ✅ Profil initialisé avec onboarding_completed = false');

    // 5. Transférer le reste du brouillon (réponses 7 questions, colonnes onboarding_*) vers user_profiles
    // Sans cet appel, getAuthState() n'est pas exécuté après signup donc le draft n'est jamais transféré
    try {
      await getAuthState();
    } catch (transferErr) {
      devWarn('[AuthNavigation] Transfert brouillon onboarding (non bloquant):', transferErr);
    }

    // 6. Rediriger vers l'onboarding
    await redirectAfterSignup(navigation);

    devLog('[AuthNavigation] ✅ Création de compte et redirection réussies');

    return { success: true, userId: user.id };
  } catch (error) {
    devError('[AuthNavigation] Erreur lors de la création de compte:', error);
    return {
      success: false,
      error: error.message || 'Erreur inconnue',
    };
  }
}

/**
 * Gère la complétion de l'onboarding
 * 
 * @param {Object} navigation - Objet navigation React Navigation
 * @param {Object} finalData - Données finales de l'onboarding (optionnel)
 */
export async function handleOnboardingCompletion(navigation, finalData = {}) {
  try {
    devLog('[AuthNavigation] Complétion de l\'onboarding...');

    // CRITICAL: Récupérer l'utilisateur de plusieurs façons (session peut ne pas être propagée)
    let userId = null;
    
    // Méthode 1: getCurrentUser
    let user = await getCurrentUser();
    if (user?.id) {
      userId = user.id;
    }
    
    // Méthode 2: getSession (fallback si getCurrentUser échoue)
    if (!userId) {
      devLog('[AuthNavigation] getCurrentUser null, essai getSession...');
      const { supabase } = require('./supabase');
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user?.id) {
        userId = sessionData.session.user.id;
        devLog('[AuthNavigation] UserId récupéré via getSession:', userId?.substring(0, 8) + '...');
      }
    }
    
    // CRITICAL: Bloquer toute redirection si userId/session absent
    if (!userId) {
      devError('[AuthNavigation] ❌ BLOCAGE: Pas de session/userId - impossible de continuer');
      devError('[AuthNavigation] L\'utilisateur doit se reconnecter pour obtenir une session valide');
      // Ne PAS rediriger vers Main - rester sur Onboarding avec message d'erreur
      // Le RouteProtection détectera l'absence de session et redirigera vers Auth
      return { 
        success: false, 
        error: 'No session available. Please sign in again.',
        requiresReauth: true 
      };
    }

    // 1. Marquer l'onboarding comme complété (passer userId pour éviter l'erreur "no user")
    const result = await markOnboardingCompleted(userId);
    
    if (!result.success) {
      devError('[AuthNavigation] Erreur lors du marquage onboarding:', result.error);
      // Si le marquage échoue, on peut quand même continuer (les données sont déjà en DB)
    } else {
      devLog('[AuthNavigation] ✅ Onboarding marqué comme complété');
    }

    // 2. Optionnel: Sauvegarder des données finales
    if (finalData && Object.keys(finalData).length > 0 && userId) {
      await upsertUser(userId, {
        ...finalData,
        onboarding_completed: true,
      });
    }

    // 3. CRITICAL: Réinitialiser les systèmes pour le nouvel utilisateur connecté
    // Sans cela, FeedScreen crash car ModuleSystem n'est pas initialisé
    devLog('[AuthNavigation] 🔄 Réinitialisation des systèmes pour l\'utilisateur...');
    try {
      await initializeQuests();
      devLog('[AuthNavigation] ✅ Système de quêtes réinitialisé');
    } catch (questError) {
      devWarn('[AuthNavigation] ⚠️ Erreur réinit quêtes (non bloquant):', questError.message);
    }
    
    try {
      await initializeModules();
      devLog('[AuthNavigation] ✅ Système de modules réinitialisé');
    } catch (moduleError) {
      devWarn('[AuthNavigation] ⚠️ Erreur réinit modules (non bloquant):', moduleError.message);
    }

    // 4. Rediriger vers l'application principale (uniquement si userId valide)
    redirectAfterOnboarding(navigation);

    devLog('[AuthNavigation] ✅ Redirection vers l\'application principale');

    return { success: true };
  } catch (error) {
    devError('[AuthNavigation] Erreur lors de la complétion onboarding:', error);
    // Forcer la redirection quand même
    redirectAfterOnboarding(navigation);
    return { success: false, error: error.message };
  }
}

/**
 * Gère la déconnexion
 * 
 * @param {Object} navigation - Objet navigation React Navigation
 */
export async function handleLogout(navigation) {
  try {
    devLog('[AuthNavigation] Déconnexion...');

    // 1. CRITICAL: Nettoyer TOUTES les données (cache, AsyncStorage, modules) - inclut moduleSystem.deinitialize
    await clearAllUserData();

    // 2. Nettoyer l'état d'authentification
    await clearAuthState();

    // 3. Déconnecter de Supabase
    await authSignOut();

    devLog('[AuthNavigation] ✅ Déconnexion réussie');

    // 4. Rediriger vers l'écran d'authentification
    redirectAfterLogout(navigation);

    return { success: true };
  } catch (error) {
    devError('[AuthNavigation] Erreur lors de la déconnexion:', error);
    // Forcer la redirection quand même
    redirectAfterLogout(navigation);
    return { success: false, error: error.message };
  }
}

/**
 * Vérifie l'état d'authentification au démarrage de l'app
 * Retourne la route initiale
 */
export async function checkInitialAuthState() {
  try {
    devLog('[AuthNavigation] Vérification état initial...');

    const authState = await getAuthState();

    devLog('[AuthNavigation] État initial:', {
      isAuthenticated: authState.isAuthenticated,
      hasCompletedOnboarding: authState.hasCompletedOnboarding,
    });

    // Déterminer la route initiale
    if (!authState.isAuthenticated) {
      return { route: ROUTES.AUTH, params: null };
    }

    if (!authState.hasCompletedOnboarding) {
      return {
        route: ROUTES.ONBOARDING,
        params: { step: authState.onboardingStep || 0 },
      };
    }

    return {
      route: ROUTES.MAIN,
      params: { screen: ROUTES.FEED },
    };
  } catch (error) {
    devError('[AuthNavigation] Erreur lors de la vérification état initial:', error);
    return { route: ROUTES.AUTH, params: null };
  }
}

// Singleton: avoid multiple auth subscriptions on re-render
let authListenerSubscription = null;
// Guard: skip duplicate SIGNED_IN hydration in same session
let didHydrateForSession = false;

/**
 * Écoute les changements d'état d'authentification Supabase
 * et redirige automatiquement. Registered only once per app lifecycle.
 */
export function setupAuthStateListener(navigation) {
  if (authListenerSubscription) {
    devLog('[AuthNavigation] Auth listener already registered, skipping');
    return () => {};
  }
  devLog('[AuthNavigation] Configuration du listener d\'authentification');

  const { data: authListener } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      console.log('[AUTH_EVT]', event, 'user=' + (session?.user?.id ?? 'null'), 'timestamp=' + Date.now());
      devLog('[AuthNavigation] Changement d\'état auth:', event);

      switch (event) {
        case 'INITIAL_SESSION':
          // Mode "zéro session persistée" : pas d'hydratation au boot (signOut local + manualLoginRequired).
          // Modules/quêtes sont initialisés uniquement après login (SIGNED_IN / handleLogin).
          break;

        case 'SIGNED_IN': {
          devLog('[AuthNavigation] SIGNED_IN détecté');
          const evtStart = Date.now();
          await recordLogin();

          const GET_AUTH_STATE_AFTER_SIGNIN_MS = 5000;
          let authState;
          try {
            const statePromise = getAuthState();
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('EVT_SIGNED_IN_GET_AUTH_STATE_TIMEOUT')), GET_AUTH_STATE_AFTER_SIGNIN_MS));
            authState = await Promise.race([statePromise, timeoutPromise]);
          } catch (e) {
            const durationMs = Date.now() - evtStart;
            console.warn(JSON.stringify({
              phase: 'EVT_SIGNED_IN',
              errorCode: e?.message === 'EVT_SIGNED_IN_GET_AUTH_STATE_TIMEOUT' ? 'GET_AUTH_STATE_TIMEOUT' : (e?.message ?? 'unknown'),
              durationMs,
              authStatus: 'signedIn',
              onboardingStatus: 'incomplete',
            }));
            authState = { hasCompletedOnboarding: false };
          }
          const durationMs = Date.now() - evtStart;
          console.log(JSON.stringify({
            phase: 'EVT_SIGNED_IN',
            authStatus: 'signedIn',
            onboardingStatus: authState.hasCompletedOnboarding ? 'complete' : 'incomplete',
            durationMs,
          }));

          if (authState.hasCompletedOnboarding) {
            if (!didHydrateForSession) {
              didHydrateForSession = true;
              try {
                await initializeQuests();
                await initializeModules();
              } catch (e) {
                devWarn('[AuthNavigation] Erreur init modules (non bloquant):', e?.message);
              }
            }
            await redirectAfterLogin(navigation);
          } else {
            devLog('[AuthNavigation] Onboarding non complété - laisser OnboardingFlow gérer la navigation');
          }
          break;
        }

        case 'SIGNED_OUT':
          didHydrateForSession = false;
          devLog('[AuthNavigation] SIGNED_OUT détecté');
          await clearAllUserData();
          await clearAuthState();
          redirectAfterLogout(navigation);
          break;

        case 'USER_UPDATED':
          devLog('[AuthNavigation] USER_UPDATED détecté');
          await getAuthState();
          break;

        case 'PASSWORD_RECOVERY':
          // Utilisateur a cliqué sur le lien "reset password" dans l'email → ouvrir l'écran nouveau mdp
          devLog('[AuthNavigation] PASSWORD_RECOVERY → ResetPassword');
          if (navigation?.navigate) {
            navigation.navigate('ResetPassword');
          }
          break;

        default:
          devLog('[AuthNavigation] Événement auth:', event);
      }
    }
  );

  authListenerSubscription = authListener?.subscription ?? true;

  return () => {
    if (authListener?.subscription?.unsubscribe) {
      authListener.subscription.unsubscribe();
      authListenerSubscription = null;
    }
  };
}

/**
 * Vérifie si la route est autorisée (sans appeler reset).
 * RootGate gère l'affichage; retourne allowed/redirectTo uniquement.
 */
export async function guardNavigation(toRoute, navigation) {
  try {
    const { canAccessRoute } = require('./navigationService');
    const { allowed, redirectTo } = await canAccessRoute(toRoute);
    if (!allowed && redirectTo) {
      devLog(`[AuthNavigation] Accès refusé: ${toRoute} → ${redirectTo} (RootGate gère l’affichage)`);
      return false;
    }
    return true;
  } catch (error) {
    devError('[AuthNavigation] guardNavigation:', error);
    return false;
  }
}
