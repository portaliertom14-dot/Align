import { supabase } from './supabase';

/**
 * Service de gestion des utilisateurs
 * Gère l'écriture et la lecture des données utilisateur dans Supabase
 */

/**
 * Crée ou met à jour un profil utilisateur
 * @param {string} userId - ID de l'utilisateur (UUID)
 * @param {object} userData - Données utilisateur { email, birthdate, school_level, onboarding_completed }
 * @returns {Promise<{data: object, error: object}>}
 */
export async function upsertUser(userId, userData) {
  try {
    const { data, error } = await supabase
      .from('users')
      .upsert({
        id: userId,
        email: userData.email,
        birthdate: userData.birthdate,
        school_level: userData.school_level,
        onboarding_completed: userData.onboarding_completed !== undefined ? userData.onboarding_completed : false,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id',
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de l\'utilisateur:', error);
    return { data: null, error };
  }
}

/**
 * Marque l'onboarding comme complété
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<{data: object, error: object}>}
 */
export async function markOnboardingCompleted(userId) {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'onboarding:', error);
    return { data: null, error };
  }
}

/**
 * Vérifie si l'onboarding est complété
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<boolean>}
 */
export async function isOnboardingCompleted(userId) {
  try {
    const { data, error } = await getUser(userId);
    if (error || !data) {
      return false;
    }
    return data.onboarding_completed === true;
  } catch (error) {
    console.error('Erreur lors de la vérification de l\'onboarding:', error);
    return false;
  }
}

/**
 * Récupère un utilisateur par son ID
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<{data: object, error: object}>}
 */
export async function getUser(userId) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'utilisateur:', error);
    return { data: null, error };
  }
}

