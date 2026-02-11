/**
 * Service d'intégration authentification et navigation
 * Gère le flux complet : connexion, création compte, onboarding
 */

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
    console.log('[AuthNavigation] Tentative de connexion:', email);

    // 1. Authentifier l'utilisateur
    const { user, error: authError } = await authSignIn(email, password);
    
    if (authError || !user) {
      console.error('[AuthNavigation] Erreur de connexion:', authError);
      return {
        success: false,
        error: authError?.message || 'Erreur de connexion',
      };
    }

    console.log('[AuthNavigation] ✅ Authentification réussie');

    // 2. Enregistrer la connexion
    await recordLogin();

    // 3. Vérifier l'état de l'onboarding (FORCER le refresh depuis la DB)
    console.log('[AuthNavigation] 🔄 Forçage du rechargement depuis la DB...');
    const authState = await getAuthState(true); // forceRefresh = true
    
    console.log('[AuthNavigation] État utilisateur:', {
      hasCompletedOnboarding: authState.hasCompletedOnboarding,
      onboardingStep: authState.onboardingStep,
    });

    // 4. CRITICAL: Réinitialiser les systèmes pour l'utilisateur connecté AVANT la redirection
    console.log('[AuthNavigation] 🔄 Réinitialisation des systèmes pour l\'utilisateur...');
    try {
      await initializeQuests();
      console.log('[AuthNavigation] ✅ Système de quêtes réinitialisé');
    } catch (questError) {
      console.warn('[AuthNavigation] ⚠️ Erreur réinit quêtes (non bloquant):', questError.message);
    }
    
    try {
      await initializeModules();
      console.log('[AuthNavigation] ✅ Système de modules réinitialisé');
    } catch (moduleError) {
      console.warn('[AuthNavigation] ⚠️ Erreur réinit modules (non bloquant):', moduleError.message);
    }

    // 5. Rediriger selon l'état
    await redirectAfterLogin(navigation);

    // 6. CRITICAL: Initialiser AutoSave APRÈS la connexion et APRÈS avoir chargé la progression
    // Attendre un délai pour que la DB soit prête et que la progression soit hydratée
    setTimeout(async () => {
      try {
        const { initializeAutoSave } = require('../lib/autoSave');
        const { getUserProgress } = require('../lib/userProgressSupabase');
        
        // Forcer un refresh depuis DB avant d'initialiser AutoSave
        const progress = await getUserProgress(true); // Force refresh
        console.log('[AuthNavigation] 📊 Progression chargée après login:', {
          xp: progress.currentXP,
          stars: progress.totalStars,
          level: progress.currentLevel
        });
        
        // Initialiser AutoSave avec les vraies valeurs
        await initializeAutoSave();
        console.log('[AuthNavigation] ✅ AutoSave initialisé après connexion');
      } catch (error) {
        console.error('[AuthNavigation] ❌ Erreur lors de l\'initialisation d\'AutoSave:', error);
        // Ne pas bloquer si AutoSave échoue
      }
    }, 1500); // Délai de 1.5s pour laisser la DB se synchroniser

    console.log('[AuthNavigation] ✅ Connexion et redirection réussies');

    return { success: true };
  } catch (error) {
    console.error('[AuthNavigation] Erreur lors de la connexion:', error);
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
    console.log('[AuthNavigation] Tentative de création de compte:', email);

    // 1. Créer le compte utilisateur
    const { user, error: authError } = await authSignUp(email, password);
    
    if (authError || !user) {
      console.error('[AuthNavigation] Erreur de création de compte:', authError);
      return {
        success: false,
        error: authError?.message || 'Erreur de création de compte',
      };
    }

    console.log('[AuthNavigation] ✅ Compte créé:', user.id);

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
      console.warn('[AuthNavigation] Chargement brouillon (non bloquant):', e);
    }

    // 3. Créer le profil utilisateur dans la DB (avec birthdate si brouillon présent)
    const { error: profileError } = await upsertUser(user.id, profileData);
    
    if (profileError) {
      console.warn('[AuthNavigation] Erreur création profil (non-bloquant):', profileError);
      // Ne pas bloquer si le profil ne peut pas être créé (sera créé plus tard)
    }

    // 4. Initialiser l'étape d'onboarding à 0
    await updateOnboardingStep(0);

    console.log('[AuthNavigation] ✅ Profil initialisé avec onboarding_completed = false');

    // 5. Transférer le reste du brouillon (réponses 7 questions, colonnes onboarding_*) vers user_profiles
    // Sans cet appel, getAuthState() n'est pas exécuté après signup donc le draft n'est jamais transféré
    try {
      await getAuthState();
    } catch (transferErr) {
      console.warn('[AuthNavigation] Transfert brouillon onboarding (non bloquant):', transferErr);
    }

    // 6. Rediriger vers l'onboarding
    await redirectAfterSignup(navigation);

    console.log('[AuthNavigation] ✅ Création de compte et redirection réussies');

    return { success: true, userId: user.id };
  } catch (error) {
    console.error('[AuthNavigation] Erreur lors de la création de compte:', error);
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
    console.log('[AuthNavigation] Complétion de l\'onboarding...');

    // CRITICAL: Récupérer l'utilisateur de plusieurs façons (session peut ne pas être propagée)
    let userId = null;
    
    // Méthode 1: getCurrentUser
    let user = await getCurrentUser();
    if (user?.id) {
      userId = user.id;
    }
    
    // Méthode 2: getSession (fallback si getCurrentUser échoue)
    if (!userId) {
      console.log('[AuthNavigation] getCurrentUser null, essai getSession...');
      const { supabase } = require('./supabase');
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user?.id) {
        userId = sessionData.session.user.id;
        console.log('[AuthNavigation] UserId récupéré via getSession:', userId?.substring(0, 8) + '...');
      }
    }
    
    // CRITICAL: Bloquer toute redirection si userId/session absent
    if (!userId) {
      console.error('[AuthNavigation] ❌ BLOCAGE: Pas de session/userId - impossible de continuer');
      console.error('[AuthNavigation] L\'utilisateur doit se reconnecter pour obtenir une session valide');
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
      console.error('[AuthNavigation] Erreur lors du marquage onboarding:', result.error);
      // Si le marquage échoue, on peut quand même continuer (les données sont déjà en DB)
    } else {
      console.log('[AuthNavigation] ✅ Onboarding marqué comme complété');
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
    console.log('[AuthNavigation] 🔄 Réinitialisation des systèmes pour l\'utilisateur...');
    try {
      await initializeQuests();
      console.log('[AuthNavigation] ✅ Système de quêtes réinitialisé');
    } catch (questError) {
      console.warn('[AuthNavigation] ⚠️ Erreur réinit quêtes (non bloquant):', questError.message);
    }
    
    try {
      await initializeModules();
      console.log('[AuthNavigation] ✅ Système de modules réinitialisé');
    } catch (moduleError) {
      console.warn('[AuthNavigation] ⚠️ Erreur réinit modules (non bloquant):', moduleError.message);
    }

    // 4. Rediriger vers l'application principale (uniquement si userId valide)
    redirectAfterOnboarding(navigation);

    console.log('[AuthNavigation] ✅ Redirection vers l\'application principale');

    return { success: true };
  } catch (error) {
    console.error('[AuthNavigation] Erreur lors de la complétion onboarding:', error);
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
    console.log('[AuthNavigation] Déconnexion...');

    // 1. CRITICAL: Nettoyer TOUTES les données (cache, AsyncStorage, modules) - inclut moduleSystem.deinitialize
    await clearAllUserData();

    // 2. Nettoyer l'état d'authentification
    await clearAuthState();

    // 3. Déconnecter de Supabase
    await authSignOut();

    console.log('[AuthNavigation] ✅ Déconnexion réussie');

    // 4. Rediriger vers l'écran d'authentification
    redirectAfterLogout(navigation);

    return { success: true };
  } catch (error) {
    console.error('[AuthNavigation] Erreur lors de la déconnexion:', error);
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
    console.log('[AuthNavigation] Vérification état initial...');

    const authState = await getAuthState();

    console.log('[AuthNavigation] État initial:', {
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
    console.error('[AuthNavigation] Erreur lors de la vérification état initial:', error);
    return { route: ROUTES.AUTH, params: null };
  }
}

/**
 * Écoute les changements d'état d'authentification Supabase
 * et redirige automatiquement
 */
export function setupAuthStateListener(navigation) {
  console.log('[AuthNavigation] Configuration du listener d\'authentification');

  const { data: authListener } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      console.log('[AuthNavigation] Changement d\'état auth:', event);

      switch (event) {
        case 'INITIAL_SESSION':
          // CRITICAL: App démarre avec session existante → hydrater modules depuis DB
          if (session?.user) {
            const authState = await getAuthState();
            if (authState.hasCompletedOnboarding) {
              console.log('[AuthNavigation] INITIAL_SESSION → hydratation modules/quêtes');
              try {
                await initializeQuests();
                await initializeModules();
                console.log('[AuthNavigation] ✅ Modules/quêtes hydratés depuis DB');
              } catch (e) {
                console.warn('[AuthNavigation] Erreur hydratation (non bloquant):', e?.message);
              }
            }
          }
          break;

        case 'SIGNED_IN':
          console.log('[AuthNavigation] SIGNED_IN détecté');
          await recordLogin();

          const authState = await getAuthState();
          if (authState.hasCompletedOnboarding) {
            // CRITICAL: Hydrater modules avant redirection (persistance bug fix)
            try {
              await initializeQuests();
              await initializeModules();
            } catch (e) {
              console.warn('[AuthNavigation] Erreur init modules (non bloquant):', e?.message);
            }
            await redirectAfterLogin(navigation);
          } else {
            console.log('[AuthNavigation] Onboarding non complété - laisser OnboardingFlow gérer la navigation');
          }
          break;

        case 'SIGNED_OUT':
          console.log('[AuthNavigation] SIGNED_OUT détecté');
          // CRITICAL: Nettoyer données utilisateur (inclut moduleSystem.deinitialize)
          await clearAllUserData();
          await clearAuthState();
          redirectAfterLogout(navigation);
          break;

        case 'USER_UPDATED':
          console.log('[AuthNavigation] USER_UPDATED détecté');
          await getAuthState();
          break;

        case 'PASSWORD_RECOVERY':
          // Utilisateur a cliqué sur le lien "reset password" dans l'email → ouvrir l'écran nouveau mdp
          console.log('[AuthNavigation] PASSWORD_RECOVERY → ResetPassword');
          if (navigation?.navigate) {
            navigation.navigate('ResetPassword');
          }
          break;

        default:
          console.log('[AuthNavigation] Événement auth:', event);
      }
    }
  );

  // Retourner la fonction de nettoyage
  return () => {
    authListener?.subscription?.unsubscribe();
  };
}

/**
 * Vérifie et redirige si nécessaire lors de la navigation
 * Utilisé dans les guards de navigation
 */
export async function guardNavigation(toRoute, navigation) {
  try {
    const { canAccessRoute } = require('./navigationService');
    const { allowed, redirectTo } = await canAccessRoute(toRoute);

    if (!allowed && redirectTo) {
      console.log(`[AuthNavigation] Navigation bloquée: ${toRoute} → ${redirectTo}`);
      
      if (redirectTo === ROUTES.MAIN) {
        navigation.reset({
          index: 0,
          routes: [{ name: ROUTES.MAIN, params: { screen: ROUTES.FEED } }],
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
    console.error('[AuthNavigation] Erreur lors du guard:', error);
    return false;
  }
}
