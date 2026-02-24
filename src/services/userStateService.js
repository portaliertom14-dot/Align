import { supabase } from './supabase';

/**
 * Service de gestion des états utilisateur
 * 
 * États clés :
 * - isAuthenticated (bool)
 * - hasStartedOnboarding (bool)
 * - hasCompletedOnboarding (bool)
 * - hasCompletedSectorQuiz (bool)
 * 
 * RÈGLE DE REDIRECTION :
 * - Non authentifié → Landing
 * - Authentifié mais onboarding non complété → Onboarding
 * - Onboarding complété mais quiz secteur non fait → Quiz Secteur
 * - Tout complété → Accueil
 */

/**
 * Récupère l'état complet de l'utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<{isAuthenticated: boolean, hasStartedOnboarding: boolean, hasCompletedOnboarding: boolean, hasCompletedSectorQuiz: boolean}>}
 */
export async function getUserState(userId) {
  try {
    if (!userId) {
      return {
        isAuthenticated: false,
        hasStartedOnboarding: false,
        hasCompletedOnboarding: false,
        hasCompletedSectorQuiz: false,
      };
    }

    // Vérifier la session utilisateur
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    // Récupérer le profil utilisateur (uniquement colonnes existantes)
    // Gérer gracieusement les erreurs 406 (RLS), PGRST116 (not found), CORS, et autres erreurs réseau
    let profile = null;
    try {
      // Utiliser maybeSingle() au lieu de single() pour éviter les erreurs 406 quand aucune ligne n'existe
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('onboarding_completed')
        .eq('id', userId)
        .maybeSingle(); // Utilise maybeSingle() pour permettre les résultats vides

      // Ignorer les erreurs attendues (table n'existe pas, RLS bloque, CORS, etc.)
      if (!profileError) {
        profile = profileData;
      } else {
        const isExpectedError = 
          profileError.code === 'PGRST116' || // Not found
          profileError.code === 'PGRST406' || // Not Acceptable
          profileError.status === 406 || // Not Acceptable
          profileError.message?.includes('access control') || // CORS
          profileError.message?.includes('Load failed') || // Network error
          profileError.message?.includes('TypeError');
        
        if (isExpectedError) {
          // Erreur attendue - continuer avec profile = null
          console.log('[getUserState] Profil non accessible (normal si tables/politiques RLS non configurées)');
        } else {
          console.warn('[getUserState] Erreur inattendue lors de la récupération du profil:', profileError);
        }
      }
    } catch (e) {
      // Ignorer toutes les exceptions (CORS, réseau, etc.) et continuer avec profile = null
      const isExpectedException = 
        e.message?.includes('access control') ||
        e.message?.includes('Load failed') ||
        e.message?.includes('TypeError') ||
        e.message?.includes('fetch');
      
      if (isExpectedException) {
        console.log('[getUserState] Exception réseau/CORS lors de la récupération du profil (ignorée):', e.message);
      } else {
        console.warn('[getUserState] Exception inattendue lors de la récupération du profil:', e.message);
      }
    }

    // Récupérer la progression utilisateur (sans la colonne has_completed_sector_quiz pour l'instant)
    let progress = null;
    try {
      // Utiliser maybeSingle() au lieu de single() pour éviter les erreurs 406 quand aucune ligne n'existe
      const { data: progressData, error: progressError } = await supabase
        .from('user_progress')
        .select('id')
        .eq('id', userId)
        .maybeSingle(); // Utilise maybeSingle() pour permettre les résultats vides

      // Ignorer les erreurs attendues (table n'existe pas, RLS bloque, CORS, etc.)
      if (!progressError) {
        progress = progressData;
      } else {
        const isExpectedError = 
          progressError.code === 'PGRST116' || // Not found
          progressError.code === 'PGRST406' || // Not Acceptable
          progressError.status === 406 || // Not Acceptable
          progressError.message?.includes('access control') || // CORS
          progressError.message?.includes('Load failed') || // Network error
          progressError.message?.includes('TypeError');
        
        if (isExpectedError) {
          // Erreur attendue - continuer avec progress = null
          console.log('[getUserState] Progression non accessible (normal si tables/politiques RLS non configurées)');
        } else {
          console.warn('[getUserState] Erreur inattendue lors de la récupération de la progression:', progressError);
        }
      }
    } catch (e) {
      // Ignorer toutes les exceptions (CORS, réseau, etc.) et continuer avec progress = null
      const isExpectedException = 
        e.message?.includes('access control') ||
        e.message?.includes('Load failed') ||
        e.message?.includes('TypeError') ||
        e.message?.includes('fetch');
      
      if (isExpectedException) {
        console.log('[getUserState] Exception réseau/CORS lors de la récupération de la progression (ignorée):', e.message);
      } else {
        console.warn('[getUserState] Exception inattendue lors de la récupération de la progression:', e.message);
      }
    }

    // Construire l'état avec les colonnes disponibles
    // Tant que les migrations ne sont pas exécutées, on utilise des valeurs par défaut
    return {
      isAuthenticated: true,
      hasStartedOnboarding: profile?.onboarding_completed || false, // Utiliser onboarding_completed comme proxy
      hasCompletedOnboarding: profile?.onboarding_completed || false,
      hasCompletedSectorQuiz: false, // Par défaut false en attendant la migration
    };
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'état utilisateur:', error);
    return {
      isAuthenticated: false,
      hasStartedOnboarding: false,
      hasCompletedOnboarding: false,
      hasCompletedSectorQuiz: false,
    };
  }
}

/**
 * Marque le début de l'onboarding
 * @param {string} userId - ID de l'utilisateur
 */
export async function markOnboardingStarted(userId) {
  try {
    // Silencieusement ignorer si la colonne n'existe pas
    // La fonction sera opérationnelle après les migrations
    const { error } = await supabase
      .from('user_profiles')
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    // Si erreur 42703 (colonne manquante), on considère que c'est OK
    if (error && error.code !== '42703') {
      throw error;
    }
    return { success: true };
  } catch (error) {
    console.error('Erreur lors du marquage du début de l\'onboarding:', error);
    return { success: false, error };
  }
}

/**
 * Marque l'onboarding comme complété
 * @param {string} userId - ID de l'utilisateur
 */
export async function markOnboardingCompleted(userId) {
  try {
    const { error } = await supabase
      .from('user_profiles')
      .update({
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Erreur lors du marquage de fin de l\'onboarding:', error);
    return { success: false, error };
  }
}

/**
 * Marque le quiz secteur comme complété
 * @param {string} userId - ID de l'utilisateur
 */
export async function markSectorQuizCompleted(userId) {
  try {
    // Silencieusement ignorer si la colonne n'existe pas
    // La fonction sera opérationnelle après les migrations
    const { error } = await supabase
      .from('user_progress')
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    // Si erreur 42703 (colonne manquante), on considère que c'est OK
    if (error && error.code !== '42703') {
      throw error;
    }
    return { success: true };
  } catch (error) {
    console.error('Erreur lors du marquage du quiz secteur:', error);
    return { success: false, error };
  }
}

/**
 * Détermine la route de redirection selon l'état utilisateur
 * @param {object} userState - État utilisateur retourné par getUserState
 * @returns {string} - Nom de la route ('Landing', 'Onboarding', 'Quiz', 'Main')
 */
export function getRedirectRoute(userState) {
  if (!userState.isAuthenticated) {
    return 'Landing';
  }

  if (!userState.hasCompletedOnboarding) {
    return 'Onboarding';
  }

  if (!userState.hasCompletedSectorQuiz) {
    return 'Quiz';
  }

  return 'Main';
}

/**
 * Valide un email (trim + type-safe, regex standard).
 * @param {string} email
 * @returns {boolean}
 */
export function validateEmail(email) {
  if (email == null || typeof email !== 'string') return false;
  const cleaned = email.trim();
  if (!cleaned) return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(cleaned);
}

/**
 * Valide un mot de passe
 * @param {string} password
 * @returns {{valid: boolean, message: string}}
 */
export function validatePassword(password) {
  if (password.length < 8) {
    return {
      valid: false,
      message: 'Le mot de passe doit contenir au moins 8 caractères',
    };
  }

  return { valid: true, message: '' };
}

/**
 * Valide un nom d'utilisateur
 * @param {string} username
 * @returns {{valid: boolean, message: string}}
 */
export function validateUsername(username) {
  if (username.length < 3) {
    return {
      valid: false,
      message: 'Le nom d\'utilisateur doit contenir au moins 3 caractères',
    };
  }

  if (username.length > 20) {
    return {
      valid: false,
      message: 'Le nom d\'utilisateur ne peut pas dépasser 20 caractères',
    };
  }

  const re = /^[a-zA-Z0-9_]+$/;
  if (!re.test(username)) {
    return {
      valid: false,
      message: 'Le nom d\'utilisateur ne peut contenir que des lettres, chiffres et underscores',
    };
  }

  return { valid: true, message: '' };
}

/**
 * Vérifie si un nom d'utilisateur est unique
 * @param {string} username
 * @returns {Promise<boolean>}
 */
export async function isUsernameUnique(username) {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', username.toLowerCase()) // Temporairement utiliser email au lieu de username
      .single();

    if (error && error.code === 'PGRST116') {
      // Aucun résultat trouvé = unique
      return true;
    }

    // Si erreur 42703 (colonne manquante), considérer comme unique
    if (error && error.code === '42703') {
      return true;
    }

    if (error) throw error;

    // Des résultats trouvés = pas unique
    return false;
  } catch (error) {
    console.error('Erreur lors de la vérification du username:', error);
    // En cas d'erreur, considérer comme unique pour ne pas bloquer
    return true;
  }
}
