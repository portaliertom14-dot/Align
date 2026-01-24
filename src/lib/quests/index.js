/**
 * Point d'entrée principal du système de quêtes unifié V3
 */

import { initializeQuests as _initFromIntegration } from './questIntegrationUnified';

/**
 * Initialise le système de quêtes
 */
export async function initializeQuests() {
  console.log('[QUESTS INDEX] initializeQuests called, forwarding to integration');
  return _initFromIntegration();
}

// Réexport des autres fonctions (pour compatibilité)
export {
  onModuleCompleted,
  shouldShowRewardScreen,
  useQuestActivityTracking,
} from './questIntegrationUnified';

export {
  getQuestsByType,
  QUEST_CYCLE_TYPES,
} from './questEngineUnified';

// Réexport des fonctions déjà importées
export {
  initializeQuestSystem,
  getActiveQuests,
  getQuestsByType,
  getCompletedQuestsInSession,
  clearCompletedQuestsInSession,
  forceQuestRenewal,
  QUEST_CYCLE_TYPES,
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
  emitQuestEvent,
  QUEST_EVENT_TYPES,
  QUEST_STATUS,
  QUEST_TYPES,
  getActiveTimeMinutes,
  recordActivity,
  startActivitySession,
  endActivitySession,
  resetActivityTracking,
  getTotalSeriesCompleted,
  getPerfectSeriesCompleted,
  completeSeries,
  recordError,
  startSeries,
};

/**
 * API SIMPLIFIÉE
 */
export const initialize = initializeQuests;
export const moduleCompleted = onModuleCompleted;
export const navigateAfterModule = handleModuleCompletionNavigation;
export const fetchQuests = getQuestsByType;
export const hasCompletedQuests = shouldShowRewardScreen;

/**
 * CONSTANTES
 */
export const QuestTypes = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  PERFORMANCE: 'performance',
};

export const QuestStatus = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
};

/**
 * DOCUMENTATION
 */
export const QUEST_SYSTEM_DOCS = {
  version: '3.0.0',
  features: [
    'Trois types de quêtes (quotidiennes, hebdomadaires, performance)',
    'Adaptation automatique au niveau utilisateur',
    'Tracking temps actif avec pause sur inactivité',
    'Tracking séries normales et parfaites',
    'Renouvellement automatique (quotidien + hebdomadaire)',
    'Persistance Supabase + AsyncStorage',
    'Système d\'événements pour intégration facile',
    'Écran de récompense conditionnel',
  ],
  integration: {
    app: 'Appeler initialize() au démarrage',
    modules: 'Appeler moduleCompleted() après chaque module',
    quests: 'Utiliser fetchQuests() pour afficher les quêtes',
    navigation: 'Utiliser navigateAfterModule() pour la navigation',
  },
};

export default {
  initialize,
  moduleCompleted,
  navigateAfterModule,
  fetchQuests,
  hasCompletedQuests,
  QuestTypes,
  QuestStatus,
};
