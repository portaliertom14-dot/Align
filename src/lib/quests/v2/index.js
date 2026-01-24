/**
 * API publique du système de quêtes V2
 * Point d'entrée unique pour l'utilisation du système de quêtes
 */

import { questEngine } from './questEngine';
import { emitQuestEvent } from './events';
import { QuestSection } from './questModel';

/**
 * Initialise le système de quêtes
 * Doit être appelé au démarrage de l'application
 * CRITICAL: Ne s'initialise que si un utilisateur est connecté
 */
export async function initializeQuestSystem() {
  try {
    await questEngine.initialize();
  } catch (error) {
    // Ne pas bloquer l'application si l'initialisation échoue
    console.error('[QuestSystem] Erreur lors de l\'initialisation (non-bloquant):', error);
  }
  // Note: La navigation vers l'écran de félicitations est gérée par ModuleCompletion
  // pour éviter les dépendances circulaires et garder une séparation claire des responsabilités
}

/**
 * Retourne toutes les sections de quêtes
 * CRITICAL: Force la réinitialisation si l'utilisateur a changé
 * CRITICAL: Vérifie et met à jour les quêtes de niveau avant de retourner les sections
 */
export async function getQuestSections() {
  await questEngine.initialize();
  // getSections() appelle maintenant checkAndUpdateLevelQuests() automatiquement
  return await questEngine.getSections();
}

/**
 * Réinitialise le système de quêtes (pour changement d'utilisateur)
 */
export async function resetQuestSystem() {
  await questEngine.deinitialize();
  await questEngine.initialize();
}

/**
 * Retourne les quêtes complétées dans cette session
 * (pour l'écran de félicitations)
 */
export function getCompletedQuestsInSession() {
  return questEngine.getCompletedQuestsInSession();
}

/**
 * Réinitialise la liste des quêtes complétées dans cette session
 * (à appeler après l'affichage de l'écran de félicitations)
 */
export function clearCompletedQuestsInSession() {
  questEngine.clearCompletedQuestsInSession();
}

/**
 * API pour émettre des événements (à utiliser dans les écrans)
 */
export const QuestEvents = {
  starEarned: emitQuestEvent.starEarned,
  lessonCompleted: emitQuestEvent.lessonCompleted,
  moduleCompleted: emitQuestEvent.moduleCompleted,
  levelReached: emitQuestEvent.levelReached,
  timeSpent: emitQuestEvent.timeSpent,
  perfectSeries: emitQuestEvent.perfectSeries,
};

/**
 * Export des types pour TypeScript/IDE
 */
export { QUEST_STATUS, QUEST_TYPES } from './questModel';
export { QUEST_EVENT_TYPES } from './events';
