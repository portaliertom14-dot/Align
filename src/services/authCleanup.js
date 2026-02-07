import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUser } from './auth';

/**
 * Invalide le cache de progression en mémoire
 * Doit être appelé lors de la déconnexion pour éviter les fuites de données
 */
export function invalidateProgressCache() {
  try {
    // Importer dynamiquement pour éviter les dépendances circulaires
    const { invalidateProgressCache: invalidateCache } = require('../lib/userProgressSupabase');
    invalidateCache();
    console.log('[AUTH_CLEANUP] Cache de progression invalidé');
  } catch (error) {
    console.error('[AUTH_CLEANUP] Erreur lors de l\'invalidation du cache de progression:', error);
  }
}

/**
 * Service de nettoyage complet lors de la déconnexion
 * Supprime TOUTES les données utilisateur stockées localement
 * CRITIQUE : Assure l'isolation complète entre les sessions utilisateur
 * 
 * PROBLÈME RÉSOLU :
 * Avant cette correction, les données utilisateur (profil, progression, XP, etc.)
 * étaient stockées dans AsyncStorage sans vérification de l'ID utilisateur.
 * Cela permettait à un utilisateur de voir les données d'un autre utilisateur
 * après déconnexion/connexion si les données AsyncStorage n'étaient pas nettoyées.
 * 
 * SOLUTION :
 * 1. Toutes les données AsyncStorage sont maintenant associées à un userId
 * 2. Lors de la récupération, on vérifie que l'ID stocké correspond à l'utilisateur actuel
 * 3. Si l'ID ne correspond pas, les données sont nettoyées et récupérées depuis la DB
 * 4. Lors du logout, TOUTES les données AsyncStorage sont supprimées
 * 5. Lors du login, les données AsyncStorage sont nettoyées pour forcer le refetch depuis la DB
 */

// Liste de toutes les clés AsyncStorage utilisées par l'application
// IMPORTANT : Ne PAS inclure les clés Supabase (commençant par 'sb-') car elles contiennent la session
// Les clés Supabase sont gérées automatiquement par Supabase et ne doivent PAS être supprimées
const ALL_STORAGE_KEYS = [
  '@align_user_profile',
  '@align_user_id', // ID utilisateur associé au profil
  '@align_user_progress',
  '@align_user_progress_fallback',
  '@align_user_progress_fallback_user_id', // ID utilisateur associé au fallback
  '@align_modules',
  '@align_completed_modules',
  '@align_quests',
  '@align_series_progress',
  '@align_metrics',
  '@align_user_profile_temp', // Clé temporaire pour l'onboarding
  // NOTE : Les clés Supabase (sb-*) sont gérées par Supabase et ne doivent PAS être supprimées
  // car elles contiennent la session utilisateur. Leur suppression causerait une déconnexion.
];

/**
 * Nettoie toutes les clés AsyncStorage qui commencent par un préfixe donné
 * Utilisé pour nettoyer les quêtes qui sont maintenant liées à un user_id
 */
async function clearKeysByPrefix(prefix) {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const keysToRemove = allKeys.filter(key => key.startsWith(prefix));
    if (keysToRemove.length > 0) {
      await AsyncStorage.multiRemove(keysToRemove);
      console.log(`[AUTH_CLEANUP] ✅ ${keysToRemove.length} clé(s) supprimée(s) avec le préfixe ${prefix}`);
    }
  } catch (error) {
    console.error(`[AUTH_CLEANUP] ❌ Erreur lors de la suppression des clés avec préfixe ${prefix}:`, error);
  }
}

/**
 * Nettoie TOUTES les données utilisateur stockées localement
 * À appeler lors de la déconnexion pour garantir l'isolation entre sessions
 * @returns {Promise<boolean>} True si le nettoyage a réussi
 */
export async function clearAllUserData() {
  try {
    console.log('[AUTH_CLEANUP] Début du nettoyage complet des données utilisateur...');

    // Supprimer toutes les clés AsyncStorage
    const removePromises = ALL_STORAGE_KEYS.map(async (key) => {
      try {
        await AsyncStorage.removeItem(key);
        console.log(`[AUTH_CLEANUP] ✅ Clé supprimée: ${key}`);
      } catch (error) {
        console.error(`[AUTH_CLEANUP] ❌ Erreur lors de la suppression de ${key}:`, error);
      }
    });
    
    await Promise.all(removePromises);
    
    // CRITICAL: Nettoyer aussi les quêtes qui sont maintenant liées à un user_id
    // Les quêtes sont stockées avec le préfixe '@align_quests_v2_' suivi de l'ID utilisateur
    await clearKeysByPrefix('@align_quests_v2_');
    
    // Nettoyer aussi les caches de progression qui sont liés à un user_id
    await clearKeysByPrefix('user_progress_');

    // CRITICAL: Nettoyer l'état des modules (persistance → évite fuite entre sessions)
    await clearKeysByPrefix('@align_modules_state_');
    
    // Invalider le cache de progression en mémoire
    invalidateProgressCache();

    // CRITICAL: Désinitialiser le système de modules (évite fuite progression entre sessions)
    try {
      const { moduleSystem } = require('../lib/modules');
      await moduleSystem.deinitialize();
      console.log('[AUTH_CLEANUP] ✅ Module system désinitialisé');
    } catch (e) {
      console.warn('[AUTH_CLEANUP] Erreur deinit modules (non bloquant):', e?.message);
    }
    
    // CRITICAL: Réinitialiser le système de quêtes pour le nouvel utilisateur
    try {
      const { resetQuestSystem } = require('../lib/quests/v2');
      await resetQuestSystem();
      console.log('[AUTH_CLEANUP] ✅ Système de quêtes réinitialisé');
    } catch (error) {
      console.error('[AUTH_CLEANUP] Erreur lors de la réinitialisation du système de quêtes:', error);
    }
    
    console.log('[AUTH_CLEANUP] ✅ Nettoyage complet terminé');
    return true;
  } catch (error) {
    console.error('[AUTH_CLEANUP] ❌ Erreur lors du nettoyage complet:', error);
    return false;
  }
}

/**
 * Vérifie que l'utilisateur actuellement authentifié correspond à l'ID stocké
 * Utilisé pour détecter les fuites de données entre sessions
 * @param {string} storedUserId - ID utilisateur stocké dans AsyncStorage
 * @returns {Promise<boolean>} True si l'ID correspond, False sinon
 */
export async function validateStoredUserId(storedUserId) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      // Pas d'utilisateur connecté → les données stockées ne doivent pas être utilisées
      console.warn('[AUTH_CLEANUP] ⚠️ Pas d\'utilisateur connecté, données stockées invalides');
      return false;
    }
    
    if (storedUserId !== currentUser.id) {
      // L'ID stocké ne correspond pas à l'utilisateur actuel → fuite de données détectée
      console.error('[AUTH_CLEANUP] ❌ FUITE DE DONNÉES DÉTECTÉE: storedUserId !== currentUser.id');
      console.error(`  - storedUserId: ${storedUserId?.substring(0, 8)}...`);
      console.error(`  - currentUser.id: ${currentUser.id?.substring(0, 8)}...`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('[AUTH_CLEANUP] Erreur lors de la validation de l\'ID utilisateur:', error);
    return false;
  }
}

