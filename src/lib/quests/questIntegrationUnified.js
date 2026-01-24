/**
 * Système d'intégration des quêtes unifié
 * Déclenche automatiquement les événements de quêtes lors des actions utilisateur
 * 
 * USAGE:
 * - Importer les fonctions dans les écrans concernés
 * - Appeler les fonctions aux moments appropriés
 * - Le système gère automatiquement la mise à jour des quêtes
 */

import { emitQuestEvent } from './v2/events';
import { 
  getActiveTimeMinutes, 
  recordActivity, 
  startActivitySession 
} from './activityTracker';
import { 
  completeSeries as completeSeriesTracking, 
  recordSeriesError, 
  startSeries,
  getPerfectSeriesCompleted 
} from './seriesTracker';
import { initializeQuestSystem, getCompletedQuestsInSession } from './questEngineUnified';
import { calculateLevel } from '../progression';
import { getUserProgress } from '../userProgressSupabase';

/**
 * Initialise le système de quêtes (à appeler au démarrage de l'app)
 */
export async function initializeQuests() {
  try {
    await initializeQuestSystem();
    await startActivitySession();
    console.log('[QuestIntegration] ✅ Système de quêtes initialisé');
  } catch (error) {
    console.error('[QuestIntegration] Erreur lors de l\'initialisation:', error);
  }
}

/**
 * INTÉGRATION: Module complété
 * À appeler quand un module est terminé
 * 
 * @param {string} moduleId - ID du module
 * @param {number} score - Score obtenu (0-100)
 * @param {number} starsEarned - Étoiles gagnées
 */
export async function onModuleCompleted(moduleId, score = 100, starsEarned = 0) {
  try {
    console.log('[QuestIntegration] Module complété:', { moduleId, score, starsEarned });

    // 1. Émettre l'événement module complété
    await emitQuestEvent.moduleCompleted(moduleId, score);

    // 2. Émettre l'événement étoiles gagnées (si applicable)
    if (starsEarned > 0) {
      await emitQuestEvent.starEarned(starsEarned);
    }

    // 3. Mettre à jour le temps actif
    await updateTimeSpent();

    // 4. Vérifier le niveau atteint
    await checkLevelReached();

    console.log('[QuestIntegration] ✅ Événements module déclenchés');
  } catch (error) {
    console.error('[QuestIntegration] Erreur lors du traitement module complété:', error);
  }
}

/**
 * INTÉGRATION: Série complétée
 * À appeler quand une série de modules est terminée
 * 
 * @param {string} seriesId - ID de la série
 * @param {boolean} isPerfect - Si la série est parfaite (sans erreur)
 */
export async function onSeriesCompleted(seriesId, isPerfect = false) {
  try {
    console.log('[QuestIntegration] Série complétée:', { seriesId, isPerfect });

    // 1. Enregistrer dans le tracker de séries
    const result = await completeSeriesTracking(seriesId);

    // 2. Si série parfaite, émettre l'événement
    if (result.lastCompletedWasPerfect || isPerfect) {
      await emitQuestEvent.perfectSeries(seriesId);
      console.log('[QuestIntegration] ✅ Série parfaite enregistrée');
    }

    // 3. Mettre à jour le temps actif
    await updateTimeSpent();

    console.log('[QuestIntegration] ✅ Événements série déclenchés');
  } catch (error) {
    console.error('[QuestIntegration] Erreur lors du traitement série complétée:', error);
  }
}

/**
 * INTÉGRATION: Erreur dans une série
 * À appeler quand l'utilisateur fait une erreur dans une série
 */
export async function onSeriesError() {
  try {
    await recordSeriesError();
    console.log('[QuestIntegration] Erreur enregistrée dans la série en cours');
  } catch (error) {
    console.error('[QuestIntegration] Erreur lors de l\'enregistrement erreur série:', error);
  }
}

/**
 * INTÉGRATION: Début d'une série
 * À appeler au début d'une nouvelle série de modules
 */
export async function onSeriesStart() {
  try {
    await startSeries();
    console.log('[QuestIntegration] Nouvelle série démarrée');
  } catch (error) {
    console.error('[QuestIntegration] Erreur lors du démarrage série:', error);
  }
}

/**
 * INTÉGRATION: Étoiles gagnées
 * À appeler quand des étoiles sont gagnées
 * 
 * @param {number} amount - Nombre d'étoiles gagnées
 */
export async function onStarsEarned(amount) {
  try {
    if (amount > 0) {
      await emitQuestEvent.starEarned(amount);
      console.log('[QuestIntegration] ✅ Étoiles gagnées:', amount);
    }
  } catch (error) {
    console.error('[QuestIntegration] Erreur lors du traitement étoiles gagnées:', error);
  }
}

/**
 * INTÉGRATION: XP gagné (vérification niveau)
 * À appeler quand de l'XP est gagné
 * 
 * @param {number} xpAmount - Montant d'XP gagné
 */
export async function onXPGained(xpAmount) {
  try {
    if (xpAmount > 0) {
      // Vérifier si le niveau a changé
      await checkLevelReached();
      console.log('[QuestIntegration] ✅ XP gagné, niveau vérifié');
    }
  } catch (error) {
    console.error('[QuestIntegration] Erreur lors du traitement XP gagné:', error);
  }
}

/**
 * INTÉGRATION: Activité utilisateur
 * À appeler lors d'interactions utilisateur pour tracker le temps actif
 */
export async function onUserActivity() {
  try {
    await recordActivity();
  } catch (error) {
    // Erreur silencieuse pour ne pas perturber l'UX
    console.error('[QuestIntegration] Erreur lors de l\'enregistrement activité:', error);
  }
}

/**
 * Met à jour le temps actif et émet l'événement si nécessaire
 */
async function updateTimeSpent() {
  try {
    const minutes = await getActiveTimeMinutes();
    if (minutes > 0) {
      // Émettre l'événement avec les minutes totales
      // Le moteur de quêtes gère la mise à jour incrémentale
      await emitQuestEvent.timeSpent(minutes);
    }
  } catch (error) {
    console.error('[QuestIntegration] Erreur lors de la mise à jour temps actif:', error);
  }
}

/**
 * Vérifie si un nouveau niveau a été atteint et émet l'événement
 */
async function checkLevelReached() {
  try {
    const userProgress = await getUserProgress();
    const currentLevel = calculateLevel(userProgress?.currentXP || 0);
    
    if (currentLevel > 0) {
      await emitQuestEvent.levelReached(currentLevel);
    }
  } catch (error) {
    console.error('[QuestIntegration] Erreur lors de la vérification niveau:', error);
  }
}

/**
 * Vérifie s'il y a des quêtes complétées dans la session
 * Retourne true si l'écran de récompense doit être affiché
 * 
 * @returns {Promise<boolean>}
 */
export async function shouldShowRewardScreen() {
  try {
    const completedQuests = getCompletedQuestsInSession();
    return completedQuests && completedQuests.length > 0;
  } catch (error) {
    console.error('[QuestIntegration] Erreur lors de la vérification récompenses:', error);
    return false;
  }
}

/**
 * Helpers pour l'écran de complétion de module
 * Gère l'affichage conditionnel de l'écran de récompense quêtes
 */
export async function handleModuleCompletionNavigation(navigation, moduleData) {
  try {
    // Enregistrer la complétion du module
    await onModuleCompleted(
      moduleData.moduleId,
      moduleData.score || 100,
      moduleData.starsEarned || 0
    );

    // Vérifier s'il faut afficher l'écran de récompense quêtes
    const hasCompletedQuests = await shouldShowRewardScreen();

    if (hasCompletedQuests) {
      // Naviguer vers l'écran de récompense quêtes
      navigation.navigate('QuestCompletion');
    } else {
      // Naviguer normalement (écran de complétion standard ou feed)
      navigation.navigate('Main', { screen: 'Feed' });
    }
  } catch (error) {
    console.error('[QuestIntegration] Erreur lors de la navigation post-module:', error);
    // En cas d'erreur, naviguer normalement
    navigation.navigate('Main', { screen: 'Feed' });
  }
}

/**
 * Hook de tracking d'activité pour les écrans
 * À utiliser dans useEffect des écrans principaux
 */
export function useQuestActivityTracking() {
  // Enregistrer une activité toutes les 30 secondes
  const intervalRef = { current: null };

  const startTracking = () => {
    onUserActivity(); // Enregistrer immédiatement
    intervalRef.current = setInterval(() => {
      onUserActivity();
    }, 30000); // 30 secondes
  };

  const stopTracking = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  return { startTracking, stopTracking };
}

/**
 * Export des fonctions principales
 */
export default {
  initializeQuests,
  onModuleCompleted,
  onSeriesCompleted,
  onSeriesError,
  onSeriesStart,
  onStarsEarned,
  onXPGained,
  onUserActivity,
  shouldShowRewardScreen,
  handleModuleCompletionNavigation,
  useQuestActivityTracking,
};
