/**
 * Script de réinitialisation des comptes niveau 100+
 * À exécuter une seule fois pour réinitialiser tous les comptes avec niveau >= 100 ou XP >= 10000
 */

import { supabase } from '../services/supabase';

/**
 * Réinitialise tous les comptes avec niveau >= 100 ou XP >= 10000
 * @returns {Promise<{success: boolean, count: number, error?: string}>}
 */
export async function resetAllHighLevelUsers() {
  try {
    console.log('[resetHighLevelUsers] Début de la réinitialisation...');
    
    // Récupérer tous les utilisateurs avec niveau >= 100 ou XP >= 10000
    const { data: highLevelUsers, error: fetchError } = await supabase
      .from('user_progress')
      .select('user_id, niveau, xp')
      .or('niveau.gte.100,xp.gte.10000');
    
    if (fetchError) {
      console.error('[resetHighLevelUsers] Erreur lors de la récupération:', fetchError);
      return { success: false, count: 0, error: fetchError.message };
    }
    
    if (!highLevelUsers || highLevelUsers.length === 0) {
      console.log('[resetHighLevelUsers] Aucun compte à réinitialiser');
      return { success: true, count: 0 };
    }
    
    console.log(`[resetHighLevelUsers] ${highLevelUsers.length} comptes à réinitialiser`);
    
    // Réinitialiser tous ces comptes
    const { data: updatedData, error: updateError } = await supabase
      .from('user_progress')
      .update({
        niveau: 0,
        xp: 0,
        updated_at: new Date().toISOString(),
      })
      .or('niveau.gte.100,xp.gte.10000')
      .select();
    
    if (updateError) {
      console.error('[resetHighLevelUsers] Erreur lors de la mise à jour:', updateError);
      return { success: false, count: 0, error: updateError.message };
    }
    
    console.log(`[resetHighLevelUsers] ✅ ${updatedData?.length || 0} comptes réinitialisés avec succès`);
    return { success: true, count: updatedData?.length || 0 };
  } catch (error) {
    console.error('[resetHighLevelUsers] Erreur:', error);
    return { success: false, count: 0, error: error.message };
  }
}

/**
 * Réinitialise un compte spécifique par user_id
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function resetUserById(userId) {
  try {
    console.log(`[resetUserById] Réinitialisation du compte: ${userId}`);
    
    // Réinitialiser la progression
    const { error: updateError } = await supabase
      .from('user_progress')
      .update({
        niveau: 0,
        xp: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);
    
    if (updateError) {
      console.error('[resetUserById] Erreur lors de la mise à jour:', updateError);
      return { success: false, error: updateError.message };
    }
    
    console.log(`[resetUserById] ✅ Compte ${userId} réinitialisé avec succès`);
    return { success: true };
  } catch (error) {
    console.error('[resetUserById] Erreur:', error);
    return { success: false, error: error.message };
  }
}
