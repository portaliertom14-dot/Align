/**
 * Stockage des quêtes V2
 * Gère la persistance dans AsyncStorage et Supabase
 * CRITICAL: Les quêtes sont maintenant liées à un utilisateur spécifique
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserProgress, updateUserProgress } from '../../userProgressSupabase';
import { getCurrentUser } from '../../../services/auth';

const QUESTS_V2_STORAGE_KEY_PREFIX = '@align_quests_v2';

/**
 * Génère la clé de stockage pour un utilisateur spécifique
 * @param {string} userId - ID de l'utilisateur
 * @returns {string} Clé de stockage
 */
function getStorageKey(userId) {
  if (!userId) {
    throw new Error('User ID is required for quest storage');
  }
  return `${QUESTS_V2_STORAGE_KEY_PREFIX}_${userId}`;
}

/**
 * Sauvegarde les quêtes dans AsyncStorage et Supabase
 * CRITICAL: Les quêtes sont maintenant liées à un utilisateur spécifique
 */
export async function saveQuests(data) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      console.error('[QuestStorage] Impossible de sauvegarder: utilisateur non connecté');
      throw new Error('User must be logged in to save quests');
    }

    const storageKey = getStorageKey(user.id);
    
    // Ajouter l'ID utilisateur aux données pour vérification ultérieure
    const dataWithUserId = {
      ...data,
      userId: user.id,
      lastUpdated: new Date().toISOString(),
    };

    // Sauvegarder dans AsyncStorage avec la clé spécifique à l'utilisateur
    await AsyncStorage.setItem(storageKey, JSON.stringify(dataWithUserId));

    // NOTE: Ne pas sauvegarder questsV2 dans Supabase car le champ n'existe pas encore dans la table
    // Utiliser uniquement AsyncStorage pour le moment
    // TODO: Ajouter le champ quests_v2 dans la table user_progress si nécessaire
  } catch (error) {
    console.error('[QuestStorage] Erreur lors de la sauvegarde:', error);
    throw error;
  }
}

/**
 * Charge les quêtes depuis AsyncStorage ou Supabase
 * CRITICAL: Vérifie que les quêtes chargées correspondent à l'utilisateur actuel
 * MIGRATION: Supprime les anciennes quêtes sans user_id
 */
export async function loadQuests() {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return null;
    }

    const storageKey = getStorageKey(user.id);

    // MIGRATION: Supprimer l'ancienne clé sans user_id si elle existe
    const oldStorageKey = '@align_quests_v2';
    const oldData = await AsyncStorage.getItem(oldStorageKey);
    if (oldData) {
      console.log('[QuestStorage] 🔄 Migration: Suppression des anciennes quêtes sans user_id');
      await AsyncStorage.removeItem(oldStorageKey);
    }

    // Charger depuis AsyncStorage avec la clé spécifique à l'utilisateur
    const dataJson = await AsyncStorage.getItem(storageKey);
    if (dataJson) {
      const data = JSON.parse(dataJson);
      
      // Vérifier que les quêtes correspondent à l'utilisateur actuel
      if (data.userId && data.userId !== user.id) {
        console.warn('[QuestStorage] ⚠️ Quêtes d\'un autre utilisateur détectées, suppression...');
        // Supprimer les quêtes de l'ancien utilisateur
        await AsyncStorage.removeItem(storageKey);
        return null;
      }

      // Retourner les données avec l'userId pour vérification dans questEngine
      return data;
    }

    return null;
  } catch (error) {
    console.error('[QuestStorage] Erreur lors du chargement:', error);
    return null;
  }
}

/**
 * Supprime toutes les quêtes (pour les tests ou reset)
 * CRITICAL: Supprime uniquement les quêtes de l'utilisateur actuel
 */
export async function clearQuests() {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      console.warn('[QuestStorage] Impossible de supprimer: utilisateur non connecté');
      return;
    }

    const storageKey = getStorageKey(user.id);
    await AsyncStorage.removeItem(storageKey);
    
    // NOTE: Ne pas supprimer depuis Supabase car le champ n'existe pas encore
  } catch (error) {
    console.error('[QuestStorage] Erreur lors de la suppression:', error);
    throw error;
  }
}
