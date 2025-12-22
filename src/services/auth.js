import { supabase } from './supabase';

/**
 * Service d'authentification Supabase
 * Gère la création de compte et la connexion
 */

/**
 * Crée un nouveau compte utilisateur
 * @param {string} email - Email de l'utilisateur
 * @param {string} password - Mot de passe
 * @returns {Promise<{user: object, error: object}>}
 */
export async function signUp(email, password) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    return { user: data.user, error: null };
  } catch (error) {
    console.error('Erreur lors de la création du compte:', error);
    return { user: null, error };
  }
}

/**
 * Connecte un utilisateur existant
 * @param {string} email - Email de l'utilisateur
 * @param {string} password - Mot de passe
 * @returns {Promise<{user: object, error: object}>}
 */
export async function signIn(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    return { user: data.user, error: null };
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    return { user: null, error };
  }
}

/**
 * Récupère l'utilisateur actuellement connecté
 * Essai multiple : getUser() puis getSession() si getUser() échoue
 * @returns {Promise<object|null>}
 */
export async function getCurrentUser() {
  try {
    // Essayer getUser() d'abord (requête au serveur)
    const { data: { user }, error } = await supabase.auth.getUser();
    if (user && !error) {
      return user;
    }
    
    // Si getUser() ne fonctionne pas, essayer getSession() (session locale)
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      return session.user;
    }
    
    return null;
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'utilisateur:', error);
    // En cas d'erreur, essayer getSession() comme fallback
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.user || null;
    } catch (sessionError) {
      console.error('Erreur lors de la récupération de la session:', sessionError);
      return null;
    }
  }
}

/**
 * Déconnecte l'utilisateur actuel
 * @returns {Promise<{error: object}>}
 */
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    return { error };
  } catch (error) {
    console.error('Erreur lors de la déconnexion:', error);
    return { error };
  }
}

