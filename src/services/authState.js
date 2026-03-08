/**
 * Service de gestion des états utilisateur
 * Gère l'authentification et l'état d'onboarding
 */

import { getCurrentUser } from './auth';
import { getUser, markOnboardingCompleted as markOnboardingCompletedDB, upsertUser } from './userService';
import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { transferOnboardingDraftToProfile } from '../lib/transferOnboardingDraft';
import { getUserProgress } from '../lib/userProgressSupabase';
import { seedAllModulesIfNeeded } from './aiModuleService';
import { ONBOARDING_MAX_STEP } from '../lib/onboardingSteps';

const GET_AUTH_STATE_TIMEOUT_MS = 10000;

const AUTH_STATE_STORAGE_KEY = '@align_auth_state';

/** Guard: ForceRefresh ne s'exécute qu'1 fois par session (évite boucle) */
let forceRefreshDoneThisSession = false;

/**
 * Structure de l'état utilisateur
 */
const DEFAULT_AUTH_STATE = {
  isAuthenticated: false,
  hasCompletedOnboarding: false,
  accountCreatedAt: null,
  lastLoginAt: null,
  userId: null,
  email: null,
  onboardingStep: 0, // Pour reprendre l'onboarding là où on s'est arrêté
};

/**
 * Récupère l'état d'authentification actuel (avec timeout pour ne jamais bloquer la navigation).
 * @param {boolean} forceRefresh - Forcer le rechargement depuis la DB (ignorer cache)
 */
export async function getAuthState(forceRefresh = false) {
  const startMs = Date.now();
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('GET_AUTH_STATE_TIMEOUT')), GET_AUTH_STATE_TIMEOUT_MS));

  try {
    const state = await Promise.race([getAuthStateInner(forceRefresh), timeoutPromise]);
    const durationMs = Date.now() - startMs;
    if (__DEV__) {
      console.log(JSON.stringify({ phase: 'FETCH_ONBOARDING', authStatus: state.isAuthenticated ? 'signedIn' : 'signedOut', onboardingStatus: state.hasCompletedOnboarding ? 'complete' : 'incomplete', durationMs }));
    }
    return state;
  } catch (err) {
    const durationMs = Date.now() - startMs;
    if (err?.message === 'GET_AUTH_STATE_TIMEOUT') {
      console.warn(JSON.stringify({ phase: 'FETCH_ONBOARDING', errorCode: 'GET_AUTH_STATE_TIMEOUT', durationMs: GET_AUTH_STATE_TIMEOUT_MS }));
      try {
        const { data } = await supabase.auth.getSession();
        const session = data?.session;
        if (session?.user) {
          const fallback = {
            isAuthenticated: true,
            hasCompletedOnboarding: false,
            accountCreatedAt: null,
            lastLoginAt: new Date().toISOString(),
            userId: session.user.id,
            email: session.user.email || null,
            onboardingStep: 0,
          };
          const stored = await getAuthStateFromStorage(session.user.id);
          if (stored?.onboardingStep > 0) {
            fallback.onboardingStep = stored.onboardingStep;
            console.log(JSON.stringify({ phase: 'FETCH_ONBOARDING_RESULT', dbStep: 0, localStep: stored.onboardingStep, chosenStep: fallback.onboardingStep }));
          }
          return fallback;
        }
      } catch (_) {}
    } else {
      console.error('[AuthState] Erreur lors de la récupération de l\'état:', err);
    }
    return { ...DEFAULT_AUTH_STATE };
  }
}

/**
 * Logique interne getAuthState (sans timeout) pour être utilisée dans Promise.race.
 */
async function getAuthStateInner(forceRefresh = false) {
  try {
    let user = await getCurrentUser();
    if (!user || !user.id) {
      // Fallback post-onboarding : si la session Supabase est absente mais que
      // l'utilisateur vient de finir l'onboarding, utiliser le userId en sessionStorage.
      let fallbackUserId = null;
      if (typeof window !== 'undefined' && window.sessionStorage) {
        try { fallbackUserId = window.sessionStorage.getItem('align_onboarding_user_id'); } catch (_) {}
      }
      if (fallbackUserId) {
        console.log('[AuthState] Fallback post-onboarding userId depuis sessionStorage');
        return {
          isAuthenticated: true,
          hasCompletedOnboarding: true,
          accountCreatedAt: null,
          lastLoginAt: new Date().toISOString(),
          userId: fallbackUserId,
          email: null,
          onboardingStep: ONBOARDING_MAX_STEP,
        };
      }
      console.log('[AuthState] Aucun utilisateur authentifié');
      return { ...DEFAULT_AUTH_STATE, isAuthenticated: false };
    }

    try {
      await transferOnboardingDraftToProfile(user.id);
    } catch (transferErr) {
      console.warn('[AuthState] Transfert brouillon onboarding (non bloquant):', transferErr);
    }

    if (forceRefresh && !forceRefreshDoneThisSession) {
      forceRefreshDoneThisSession = true;
      console.log('[AuthState] 🔄 ForceRefresh (1x session)');
      try {
        const storageKey = `${AUTH_STATE_STORAGE_KEY}_${user.id}`;
        await AsyncStorage.removeItem(storageKey);
      } catch (cacheError) {
        console.warn('[AuthState] Erreur suppression cache:', cacheError);
      }
    }

    const { data: profile, error } = await getUser(user.id);
    if (error) {
      console.error('[AuthState] Erreur lors de la récupération du profil:', error);
      const stored = await getAuthStateFromStorage(user.id);
      if (stored && typeof stored.isAuthenticated === 'boolean' && stored.hasCompletedOnboarding === true) return stored;
      // Session valide mais profil inaccessible (RLS, 406, etc.) : autoriser l'accès au Main pour éviter blocage après ChargementRoutine
      return {
        isAuthenticated: true,
        hasCompletedOnboarding: true,
        accountCreatedAt: null,
        lastLoginAt: new Date().toISOString(),
        userId: user.id,
        email: user.email ?? null,
        onboardingStep: ONBOARDING_MAX_STEP,
      };
    }

    const hasBasicInfo = profile?.first_name && profile?.last_name;
    const shouldForceCompleted = hasBasicInfo && !profile?.onboarding_completed;
    const hasProfileRow = profile != null;
    // Vérifier aussi l'AsyncStorage : si la session vient de finir
    // l'onboarding, le storage a hasCompletedOnboarding:true même si
    // la DB n'a pas encore propagé l'écriture.
    const stored2 = await getAuthStateFromStorage(user.id);
    const storageCompletedOnboarding = stored2?.hasCompletedOnboarding === true;

    const hasCompletedOnboardingValue =
      storageCompletedOnboarding ||
      shouldForceCompleted ||
      profile?.onboarding_completed === true ||
      hasProfileRow;

    const dbStep = profile?.onboarding_step || 0;
    const localStep = stored2?.onboardingStep || 0;
    const chosenStep = Math.max(dbStep, localStep);
    const authState = {
      isAuthenticated: true,
      hasCompletedOnboarding: hasCompletedOnboardingValue,
      accountCreatedAt: profile?.created_at || user.created_at,
      lastLoginAt: new Date().toISOString(),
      userId: user.id,
      email: user.email,
      onboardingStep: chosenStep,
    };
    await saveAuthStateToStorage(authState);
    console.log(JSON.stringify({ phase: 'FETCH_ONBOARDING_RESULT', dbStep, localStep, chosenStep }));
    console.log('[AuthState] État récupéré:', { isAuthenticated: authState.isAuthenticated, hasCompletedOnboarding: authState.hasCompletedOnboarding, onboardingStep: authState.onboardingStep });
    return authState;
  } catch (error) {
    console.error('[AuthState] Erreur getAuthStateInner:', error);
    return { ...DEFAULT_AUTH_STATE };
  }
}

/**
 * Récupère l'état depuis AsyncStorage (fallback)
 */
async function getAuthStateFromStorage(userId) {
  try {
    const storageKey = `${AUTH_STATE_STORAGE_KEY}_${userId}`;
    const dataJson = await AsyncStorage.getItem(storageKey);
    
    if (dataJson) {
      const data = JSON.parse(dataJson);
      console.log('[AuthState] État récupéré depuis AsyncStorage');
      return data;
    }
  } catch (error) {
    console.error('[AuthState] Erreur AsyncStorage:', error);
  }
  
  return DEFAULT_AUTH_STATE;
}

/**
 * Sauvegarde l'état dans AsyncStorage
 */
async function saveAuthStateToStorage(authState) {
  try {
    if (!authState.userId) return;
    
    const storageKey = `${AUTH_STATE_STORAGE_KEY}_${authState.userId}`;
    await AsyncStorage.setItem(storageKey, JSON.stringify(authState));
  } catch (error) {
    console.error('[AuthState] Erreur lors de la sauvegarde AsyncStorage:', error);
  }
}

/**
 * Vérifie si l'utilisateur est authentifié
 */
export async function isAuthenticated() {
  const user = await getCurrentUser();
  return user !== null;
}

/**
 * Vérifie si l'utilisateur a complété l'onboarding
 */
export async function hasCompletedOnboarding() {
  try {
    const authState = await getAuthState();
    return authState.hasCompletedOnboarding;
  } catch (error) {
    console.error('[AuthState] Erreur lors de la vérification onboarding:', error);
    return false;
  }
}

/**
 * Vérifie si c'est la première connexion de l'utilisateur
 */
export async function isFirstLogin() {
  try {
    const authState = await getAuthState();
    
    if (!authState.isAuthenticated) {
      return false;
    }

    // Vérifier si l'onboarding n'est pas complété
    return !authState.hasCompletedOnboarding;
  } catch (error) {
    console.error('[AuthState] Erreur lors de la vérification première connexion:', error);
    return false;
  }
}

/**
 * Marque l'onboarding comme complété
 * @param {string} userId - Optionnel: ID utilisateur (utile si session pas encore propagée)
 */
export async function markOnboardingCompleted(userId = null) {
  try {
    // Essayer de récupérer l'utilisateur, ou utiliser l'ID passé en paramètre
    let user = await getCurrentUser();
    
    // CRITICAL: Si pas d'utilisateur mais userId fourni, utiliser celui-ci
    // Cela gère le cas où la session n'est pas encore propagée après signup
    if ((!user || !user.id) && userId) {
      console.log('[AuthState] Pas de session, utilisation de l\'userId fourni:', userId?.substring(0, 8) + '...');
      user = { id: userId };
    }
    
    if (!user || !user.id) {
      console.error('[AuthState] Aucun utilisateur authentifié et pas d\'userId fourni');
      return { success: false, error: 'No user authenticated' };
    }

    console.log('[AuthState] Marquage onboarding comme complété pour:', user.id);

    // 1. Mettre à jour dans la base de données
    const { data, error } = await markOnboardingCompletedDB(user.id);
    
    if (error) {
      console.error('[AuthState] Erreur lors de la mise à jour DB:', error);
      // Continuer quand même avec AsyncStorage
    }

    // 2. Mettre à jour dans AsyncStorage
    const storageKey = `${AUTH_STATE_STORAGE_KEY}_${user.id}`;
    const authState = {
      isAuthenticated: true,
      hasCompletedOnboarding: true,
      userId: user.id,
      onboardingStep: 6,
      lastLoginAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(storageKey, JSON.stringify(authState));

    console.log('[AuthState] ✅ Onboarding marqué comme complété');

    // Seed modules IA (one-shot) en arrière-plan
    (async () => {
      try {
        const progress = await getUserProgress(true);
        await seedAllModulesIfNeeded(
          progress?.activeDirection || 'ingenierie_tech',
          progress?.activeMetier || null,
          progress?.currentLevel || 1,
          'markOnboardingCompleted'
        );
      } catch (e) {
        console.warn('[AuthState] seedAllModulesIfNeeded (non bloquant):', e?.message);
      }
    })();

    return { success: true, data };
  } catch (error) {
    console.error('[AuthState] Erreur lors du marquage onboarding:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Met à jour l'étape d'onboarding (DB + AsyncStorage). Last write wins côté client.
 */
export async function updateOnboardingStep(step) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      console.error('[AuthState] Aucun utilisateur authentifié');
      return { success: false };
    }

    console.log(JSON.stringify({ phase: 'ONBOARDING_STEP_SET_LOCAL', step }));

    const authState = await getAuthState().catch(() => ({ ...DEFAULT_AUTH_STATE, userId: user.id }));
    authState.onboardingStep = step;
    authState.userId = user.id;
    await saveAuthStateToStorage(authState);

    const { error } = await upsertUser(user.id, {
      onboarding_step: step,
      onboarding_completed: false,
    });
    const ok = !error;
    console.log(JSON.stringify({ phase: 'ONBOARDING_STEP_DB_WRITE', step, ok }));
    if (error) console.warn('[AuthState] updateOnboardingStep DB:', error?.message);

    console.log('[AuthState] Étape onboarding mise à jour:', step);
    return { success: true };
  } catch (error) {
    console.error('[AuthState] Erreur lors de la mise à jour étape:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Récupère l'étape d'onboarding actuelle
 */
export async function getOnboardingStep() {
  try {
    const authState = await getAuthState();
    return authState.onboardingStep || 0;
  } catch (error) {
    console.error('[AuthState] Erreur lors de la récupération étape:', error);
    return 0;
  }
}

/**
 * Nettoie l'état d'authentification (déconnexion)
 */
export async function clearAuthState() {
  try {
    forceRefreshDoneThisSession = false;
    const user = await getCurrentUser();
    if (user && user.id) {
      const storageKey = `${AUTH_STATE_STORAGE_KEY}_${user.id}`;
      await AsyncStorage.removeItem(storageKey);
    }
    
    console.log('[AuthState] État nettoyé');
  } catch (error) {
    console.error('[AuthState] Erreur lors du nettoyage:', error);
  }
}

/**
 * Rafraîchit l'état d'authentification
 * Utile après une modification de profil
 */
export async function refreshAuthState() {
  try {
    const authState = await getAuthState();
    console.log('[AuthState] État rafraîchi');
    return authState;
  } catch (error) {
    console.error('[AuthState] Erreur lors du rafraîchissement:', error);
    return DEFAULT_AUTH_STATE;
  }
}

/**
 * Enregistre une nouvelle connexion
 */
export async function recordLogin() {
  try {
    const authState = await getAuthState();
    authState.lastLoginAt = new Date().toISOString();
    await saveAuthStateToStorage(authState);
    
    console.log('[AuthState] Connexion enregistrée');
  } catch (error) {
    console.error('[AuthState] Erreur lors de l\'enregistrement connexion:', error);
  }
}

/**
 * Détecte si c'est un nouveau compte
 * (créé il y a moins de 5 minutes)
 */
export async function isNewAccount() {
  try {
    const authState = await getAuthState();
    
    if (!authState.accountCreatedAt) {
      return false;
    }

    const createdAt = new Date(authState.accountCreatedAt);
    const now = new Date();
    const diffMinutes = (now - createdAt) / (1000 * 60);

    // Nouveau compte si créé il y a moins de 5 minutes
    return diffMinutes < 5;
  } catch (error) {
    console.error('[AuthState] Erreur lors de la détection nouveau compte:', error);
    return false;
  }
}
