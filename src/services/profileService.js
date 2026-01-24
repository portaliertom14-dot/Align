import { supabase } from './supabase';
import { supabaseWithRetry } from '../lib/retry';

/**
 * Service de gestion des profils utilisateur
 * Version propre utilisant uniquement Supabase standard
 */

/**
 * Récupère le profil utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<{data: object|null, error: object|null}>}
 */
export async function getUserProfile(userId) {
  try {
    // Valider l'ID utilisateur
    if (!userId || typeof userId !== 'string') {
      return { data: null, error: { message: 'ID utilisateur invalide', code: 'INVALID_USER_ID' } };
    }
    
    const { data, error } = await supabaseWithRetry(
      () => supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single(),
      { maxRetries: 2 }
    );

    // Gérer les erreurs spécifiques
    if (error) {
      // PGRST116 = not found (normal si le profil n'existe pas encore)
      if (error.code === 'PGRST116') {
        return { data: null, error: null };
      }
      
      // 406 = Not Acceptable (peut être un problème de RLS ou de format)
      if (error.code === 'PGRST406' || error.status === 406) {
        console.warn('[profileService] Erreur 406 lors de la récupération du profil, peut-être un problème RLS:', error.message);
        // Retourner null sans erreur pour ne pas bloquer le flux
        return { data: null, error: null };
      }
      
      // Autres erreurs
      console.error('[profileService] Erreur lors de la récupération du profil:', error);
      return { data: null, error };
    }
    
    return { data: data || null, error: null };
  } catch (error) {
    console.error('[profileService] Exception lors de la récupération du profil:', error);
    return { data: null, error };
  }
}

/**
 * Crée le profil utilisateur s'il n'existe pas déjà
 * Utilise UPSERT pour éviter les erreurs RLS et gérer création/mise à jour
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<{data: object|null, error: object|null}>}
 */
export async function createUserProfile(userId) {
  try {
    // Utiliser UPSERT pour créer ou ignorer si existe déjà
    // Cela évite les problèmes RLS et gère automatiquement les deux cas
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
      }, {
        onConflict: 'id',
        ignoreDuplicates: false, // Mettre à jour si existe déjà
      })
      .select()
      .single();

    if (error) {
      // PGRST116 = not found (peut arriver si le profil n'existe pas et l'upsert échoue)
      if (error.code === 'PGRST116') {
        // Essayer une insertion directe
        const { data: insertData, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
          })
          .select()
          .single();
        
        if (insertError) {
          throw insertError;
        }
        return { data: insertData, error: null };
      }
      throw error;
    }
    
    return { data: data || null, error: null };
  } catch (error) {
    console.error('Erreur lors de la création du profil:', error);
    return { data: null, error };
  }
}

/**
 * Met à jour le profil utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @param {Object} profileData - Données du profil à mettre à jour
 * @returns {Promise<{data: object|null, error: object|null}>}
 */
export async function updateUserProfile(userId, profileData) {
  try {
    const upsertPayload = {
      id: userId,
      ...profileData,
      updated_at: new Date().toISOString(),
    };
    
    // Utiliser UPSERT au lieu de UPDATE pour gérer création et mise à jour
    // Cela évite les erreurs si le profil n'existe pas encore
    const { data, error } = await supabase
      .from('profiles')
      .upsert(upsertPayload, {
        onConflict: 'id',
      })
      .select()
      .single();


    if (error) {
      // Si UPSERT échoue, essayer UPDATE (le profil existe peut-être déjà)
      if (error.code === '42501' || error.code === 'PGRST116') {
        const { data: updateData, error: updateError } = await supabase
          .from('profiles')
          .update({
            ...profileData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)
          .select()
          .single();
        
        if (updateError) throw updateError;
        return { data: updateData, error: null };
      }
      throw error;
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('Erreur lors de la mise à jour du profil:', error);
    return { data: null, error };
  }
}

