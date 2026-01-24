/**
 * Service de gestion des états utilisateur
 * Gère l'authentification et l'état d'onboarding
 */

import { getCurrentUser } from './auth';
import { getUser, markOnboardingCompleted as markOnboardingCompletedDB } from './userService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_STATE_STORAGE_KEY = '@align_auth_state';

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
 * Récupère l'état d'authentification actuel
 * @param {boolean} forceRefresh - Forcer le rechargement depuis la DB (ignorer cache)
 */
export async function getAuthState(forceRefresh = false) {
  try {
    // 1. Vérifier l'utilisateur authentifié
    const user = await getCurrentUser();
    
    if (!user || !user.id) {
      // Pas d'utilisateur connecté
      console.log('[AuthState] Aucun utilisateur authentifié');
      return {
        ...DEFAULT_AUTH_STATE,
        isAuthenticated: false,
      };
    }

    // 🆕 Si forceRefresh, vider le cache avant de charger
    if (forceRefresh) {
      console.log('[AuthState] 🔄 ForceRefresh activé - Suppression du cache');
      try {
        const storageKey = `${AUTH_STATE_STORAGE_KEY}_${user.id}`;
        await AsyncStorage.removeItem(storageKey);
      } catch (cacheError) {
        console.warn('[AuthState] Erreur suppression cache:', cacheError);
      }
    }

    // 2. Récupérer le profil utilisateur depuis la DB
    const { data: profile, error } = await getUser(user.id);
    
    if (error) {
      console.error('[AuthState] Erreur lors de la récupération du profil:', error);
      // Fallback: utiliser AsyncStorage
      return await getAuthStateFromStorage(user.id);
    }

    // 3. Construire l'état d'authentification
    // 🆕 WORKAROUND : Si l'utilisateur a first_name ET last_name, forcer onboarding completed
    // Ceci contourne le bug de cache Supabase Postgrest qui retourne parfois false
    // alors que la vraie valeur en DB est true
    const hasBasicInfo = profile?.first_name && profile?.last_name;
    const shouldForceCompleted = hasBasicInfo && !profile?.onboarding_completed;
    
    const authState = {
      isAuthenticated: true,
      hasCompletedOnboarding: shouldForceCompleted ? true : (profile?.onboarding_completed || false),
      accountCreatedAt: profile?.created_at || user.created_at,
      lastLoginAt: new Date().toISOString(),
      userId: user.id,
      email: user.email,
      onboardingStep: profile?.onboarding_step || 0,
    };

    // 4. Sauvegarder dans le cache local
    await saveAuthStateToStorage(authState);

    console.log('[AuthState] État récupéré:', {
      isAuthenticated: authState.isAuthenticated,
      hasCompletedOnboarding: authState.hasCompletedOnboarding,
      onboardingStep: authState.onboardingStep,
    });

    return authState;
  } catch (error) {
    console.error('[AuthState] Erreur lors de la récupération de l\'état:', error);
    return DEFAULT_AUTH_STATE;
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
 */
export async function markOnboardingCompleted() {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      console.error('[AuthState] Aucun utilisateur authentifié');
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
    const authState = await getAuthState();
    authState.hasCompletedOnboarding = true;
    await saveAuthStateToStorage(authState);

    console.log('[AuthState] ✅ Onboarding marqué comme complété');

    return { success: true, data };
  } catch (error) {
    console.error('[AuthState] Erreur lors du marquage onboarding:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Met à jour l'étape d'onboarding actuelle
 */
export async function updateOnboardingStep(step) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      console.error('[AuthState] Aucun utilisateur authentifié');
      return { success: false };
    }

    // Mettre à jour dans AsyncStorage
    const authState = await getAuthState();
    authState.onboardingStep = step;
    await saveAuthStateToStorage(authState);

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
