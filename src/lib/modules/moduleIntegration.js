/**
 * Intégration du système de modules avec les quêtes et l'XP
 * Gère les événements et les récompenses lors de la complétion de modules
 */

import { completeCurrentModule, initializeModuleSystem, getCurrentModule, isModuleSystemReady } from './moduleSystem';
import { onModuleCompleted, shouldShowRewardScreen } from '../quests/questIntegrationUnified';
import { getUserProgress, addXP, addStars, updateUserProgress } from '../userProgressSupabase';
import { calculateLevel, getTotalXPForLevel } from '../progression';
import { triggerProgressionAnimation } from '../progressionAnimation';
import { utcDayString, computeStreak } from '../../utils/flame';

// MODULE_REWARDS et CYCLE_COMPLETION_BONUS supprimés
// Les récompenses sont maintenant gérées par progressionSystem.js (MODULE_REWARDS)

/**
 * Initialise le système de modules
 * À appeler au démarrage de l'app
 */
export async function initializeModules() {
  try {
    await initializeModuleSystem();
    console.log('[ModuleIntegration] ✅ Système de modules initialisé');
  } catch (error) {
    console.error('[ModuleIntegration] Erreur lors de l\'initialisation:', error);
  }
}

/**
 * Gère la complétion d'un module avec toutes les intégrations
 * 
 * @param {Object} moduleData - Données du module complété
 * @param {string} moduleData.moduleId - ID unique du module (ex: "module_1_serie_2")
 * @param {number} moduleData.score - Score obtenu (0-100)
 * @param {number} moduleData.correctAnswers - Nombre de bonnes réponses
 * @param {number} moduleData.totalQuestions - Nombre total de questions
 * @returns {Promise<Object>} Résultat de la complétion
 */
export async function handleModuleCompletion(moduleData) {
  try {
    console.log('[ModuleIntegration] 📝 Traitement complétion module:', moduleData);

    // 1. Récupérer le module actuel avant complétion
    const currentModule = getCurrentModule();
    if (!currentModule) {
      console.warn('[ModuleIntegration] Module system non initialisé, impossible de traiter la complétion');
      return { success: false, completedModuleIndex: 0, cycleCompleted: false, nextModuleIndex: 1 };
    }
    const currentIndex = currentModule.index;
    
    // 2. Calculer les valeurs AVANT l'application des récompenses
    const currentProgression = await getUserProgress(true);
    
    const xpBeforeModule = currentProgression.currentXP || 0;
    const starsBefore = currentProgression.totalStars || 0;
    const levelBefore = calculateLevel(xpBeforeModule);
    
    // 3. Appliquer les récompenses depuis moduleData (valeurs réelles du module)
    // Si moduleData contient les récompenses, les utiliser, sinon utiliser les valeurs par défaut
    const XP_REWARD = moduleData.xpReward || 25;
    const STARS_REWARD = moduleData.starsReward || 5;
    
    await addXP(XP_REWARD);
    await addStars(STARS_REWARD);
    
    // 4. Récupérer les valeurs APRÈS l'application
    const newProgression = await getUserProgress(true);
    
    const xpAfterModule = newProgression.currentXP || 0;
    const starsAfter = newProgression.totalStars || 0;
    const levelAfter = calculateLevel(xpAfterModule);
    
    console.log('[ModuleIntegration] 🎁 Récompenses calculées:', {
      xpBefore: xpBeforeModule,
      xpAfter: xpAfterModule,
      xpGained: XP_REWARD,
      starsBefore,
      starsAfter,
      starsGained: STARS_REWARD,
      levelBefore,
      levelAfter,
    });
    
    // 5. Déclencher l'animation sur la barre XP
    // NOTE: L'animation est déjà déclenchée dans ModuleCompletion pour s'afficher sur l'écran de félicitation
    // NE PAS déclencher l'animation via événements si l'animation via props a déjà été déclenchée
    // L'animation via props a la priorité et se termine avant la navigation
    // Si l'utilisateur navigue avant la fin de l'animation, l'animation via props continue sur le Feed
    // Donc on ne déclenche PAS l'animation via événements ici pour éviter les doublons

    // 6. Compléter le module dans le système (peut échouer si parcours chapitres / state désynchronisé)
    const completionResult = await completeCurrentModule();

    if (!completionResult.success) {
      console.warn('[ModuleIntegration] ⚠️ completeCurrentModule a échoué (streak et navigation seront tout de même traités)');
    }

    // 7. Si cycle complété, ajouter bonus (optionnel)
    if (completionResult.success && completionResult.cycleCompleted) {
      console.log('[ModuleIntegration] 🎉 Cycle complété !');
    }

    // 8. Déclencher les événements pour les quêtes
    await triggerQuestEvents(moduleData, STARS_REWARD);

    // 9. Vérifier s'il faut afficher l'écran de récompense quêtes
    const hasQuestRewards = await shouldShowRewardScreen();

    // 10. Flammes (streak) — mis à jour UNIQUEMENT à la fin d'un module (toujours exécuté même si completeCurrentModule a échoué)
    const now = new Date();
    await updateUserProgress({ lastActivityAt: now.toISOString() });
    const progressForStreak = await getUserProgress(true);
    const prev = {
      streak_count: progressForStreak.streakCount ?? 0,
      last_flame_day: progressForStreak.lastFlameDay ?? null,
    };
    const { nextStreakCount, nextLastFlameDay, isIgnition } = computeStreak(prev, now);
    await updateUserProgress({
      streakCount: nextStreakCount,
      lastFlameDay: nextLastFlameDay,
    });
    const today = utcDayString(now);
    const flameScreenSeenForDay = progressForStreak.flameScreenSeenForDay ?? null;
    const showFlameScreen = isIgnition && flameScreenSeenForDay !== today;
    if (showFlameScreen) {
      await updateUserProgress({ flameScreenSeenForDay: today });
    }

    // 11. Préparer le résultat (success: true pour que la navigation vers FlameScreen/QuestCompletion/Feed s'effectue)
    const result = {
      success: true,
      completedModuleIndex: completionResult.completedModuleIndex,
      nextModuleIndex: completionResult.nextModuleIndex,
      cycleCompleted: completionResult.cycleCompleted || false,
      totalCyclesCompleted: completionResult.totalCyclesCompleted || 0,
      hasQuestRewards,
      showFlameScreen: !!showFlameScreen,
    };

    console.log('[ModuleIntegration] ✅ Complétion traitée:', result);
    return result;
  } catch (error) {
    console.error('[ModuleIntegration] ❌ Erreur lors de la complétion:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Fonctions calculateModuleRewards et distributeRewards supprimées
// Le nouveau système calcule les valeurs avant/après et déclenche l'animation via progressionAnimation

/**
 * Déclenche les événements pour les quêtes
 */
async function triggerQuestEvents(moduleData, starsEarned) {
  try {
    // Déclencher l'événement de module complété pour les quêtes
    await onModuleCompleted(
      moduleData.moduleId,
      moduleData.score || 100,
      starsEarned
    );
    console.log('[ModuleIntegration] ✅ Événements quêtes déclenchés');
  } catch (error) {
    console.error('[ModuleIntegration] Erreur lors du déclenchement des événements quêtes:', error);
  }
}

/**
 * Gère la navigation après complétion de module
 * 
 * @param {Object} navigation - Objet navigation React Navigation
 * @param {Object} completionResult - Résultat de handleModuleCompletion
 */
export function navigateAfterModuleCompletion(navigation, completionResult) {
  try {
    if (!completionResult.success) {
      console.error('[ModuleIntegration] Complétion échouée, navigation par défaut');
      navigation.navigate('Main', { screen: 'Feed' });
      return;
    }

    // Si des quêtes sont complétées, afficher l'écran de récompense quêtes (FlameScreen après si showFlameScreen)
    if (completionResult.hasQuestRewards) {
      console.log('[ModuleIntegration] ➡️ Navigation vers QuestCompletion');
      navigation.navigate('QuestCompletion', { showFlameScreen: completionResult.showFlameScreen });
      return;
    }

    // Si flamme vient de s'allumer, afficher FlameScreen une seule fois par jour
    if (completionResult.showFlameScreen) {
      console.log('[ModuleIntegration] ➡️ Navigation vers FlameScreen');
      navigation.navigate('FlameScreen');
      return;
    }

    // Navigation par défaut vers le Feed (l'animation XP se déclenchera automatiquement)
    console.log('[ModuleIntegration] ➡️ Navigation vers Feed (animation XP déclenchée)');
    navigation.navigate('Main', { screen: 'Feed' });
  } catch (error) {
    console.error('[ModuleIntegration] Erreur lors de la navigation:', error);
    navigation.navigate('Main', { screen: 'Feed' });
  }
}

/**
 * Récupère les informations d'affichage pour un module
 * Utile pour l'UI
 */
export function getModuleDisplayInfo(moduleIndex) {
  if (!isModuleSystemReady()) {
    return {
      index: moduleIndex,
      isCurrent: moduleIndex === 1,
      isClickable: false,
      state: 'locked',
      rewards: MODULE_REWARDS[moduleIndex] || MODULE_REWARDS[1],
    };
  }
  const module = getCurrentModule();
  if (!module) {
    return {
      index: moduleIndex,
      isCurrent: false,
      isClickable: false,
      state: 'locked',
      rewards: MODULE_REWARDS[moduleIndex] || MODULE_REWARDS[1],
    };
  }
  const isCurrentModule = module.index === moduleIndex;
  return {
    index: moduleIndex,
    isCurrent: isCurrentModule,
    isClickable: isCurrentModule && module.isClickable(),
    state: module.state,
    rewards: MODULE_REWARDS[moduleIndex] || MODULE_REWARDS[1],
  };
}

/**
 * Récupère les informations sur le cycle actuel
 */
export function getCycleInfo() {
  const state = require('./moduleSystem').getModulesState();
  
  return {
    currentCycle: state.totalCyclesCompleted + 1,
    totalCyclesCompleted: state.totalCyclesCompleted,
    currentModuleIndex: state.currentModuleIndex,
    progressInCycle: `${state.currentModuleIndex}/${MODULE_CONFIG.TOTAL_MODULES}`,
  };
}

/**
 * Vérifie si le système est prêt à jouer un module
 * Retourne false si le système n'est pas initialisé (évite les erreurs)
 */
export function canStartModule(moduleIndex) {
  if (!isModuleSystemReady()) return false;
  try {
    const { canPlayModule } = require('./moduleSystem');
    return canPlayModule(moduleIndex);
  } catch {
    return false;
  }
}

// MODULE_REWARDS et CYCLE_COMPLETION_BONUS supprimés - utiliser progressionSystem.js
