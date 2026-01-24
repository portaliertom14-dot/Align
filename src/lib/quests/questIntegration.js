/**
 * Intégration du système de quêtes
 * Met à jour automatiquement les quêtes selon les actions utilisateur
 */

import { updateQuestProgress, QUEST_CATEGORIES } from './questSystem';
import { recordActivity, getActiveTimeMinutes } from './activityTracker';
import { completeSeries, recordSeriesError } from './seriesTracker';
import { questEventEmitter, QUEST_EVENT_TYPES } from './v2/events';

/**
 * Initialise l'intégration des quêtes
 */
export function initializeQuestIntegration() {
  // Écouter les événements du système existant
  questEventEmitter.on(QUEST_EVENT_TYPES.MODULE_COMPLETED, async (event) => {
    await handleModuleCompleted(event.payload.moduleId, event.payload.score);
  });
  
  questEventEmitter.on(QUEST_EVENT_TYPES.TIME_SPENT, async (event) => {
    await handleTimeSpent(event.payload.minutes);
  });
  
  questEventEmitter.on(QUEST_EVENT_TYPES.PERFECT_SERIES, async (event) => {
    await handlePerfectSeries(event.payload.moduleId);
  });
  
  questEventEmitter.on(QUEST_EVENT_TYPES.LEVEL_REACHED, async (event) => {
    await handleLevelReached(event.payload.level);
  });
}

/**
 * Gère la complétion d'un module
 */
async function handleModuleCompleted(moduleId, score) {
  // Enregistrer l'activité
  await recordActivity();
  
  // Mettre à jour les quêtes de modules complétés
  await updateQuestProgress(QUEST_CATEGORIES.MODULES_COMPLETED, 1, { moduleId, score });
}

/**
 * Gère le temps passé
 */
async function handleTimeSpent(minutes) {
  // Mettre à jour les quêtes de temps
  await updateQuestProgress(QUEST_CATEGORIES.TIME_SPENT, minutes);
}

/**
 * Gère une série parfaite
 */
async function handlePerfectSeries(moduleId) {
  // Enregistrer l'activité
  await recordActivity();
  
  // Mettre à jour les quêtes de séries parfaites
  await updateQuestProgress(QUEST_CATEGORIES.PERFECT_SERIES, 1, { moduleId });
}

/**
 * Gère l'atteinte d'un niveau
 */
async function handleLevelReached(level) {
  // Enregistrer l'activité
  await recordActivity();
  
  // Mettre à jour les quêtes de niveau
  await updateQuestProgress(QUEST_CATEGORIES.LEVEL_REACHED, level);
}

/**
 * Met à jour le tracking du temps actif périodiquement
 */
export async function updateActiveTimeTracking() {
  const activeMinutes = await getActiveTimeMinutes();
  
  if (activeMinutes > 0) {
    await updateQuestProgress(QUEST_CATEGORIES.TIME_SPENT, activeMinutes);
  }
}

/**
 * Marque le début d'une session active
 */
export async function startUserSession() {
  const { startActivitySession } = require('./activityTracker');
  await startActivitySession();
}

/**
 * Marque la fin d'une session active
 */
export async function endUserSession() {
  const { endActivitySession } = require('./activityTracker');
  await endActivitySession();
  
  // Mettre à jour les quêtes de temps avant de terminer
  await updateActiveTimeTracking();
}

/**
 * Enregistre une interaction utilisateur
 */
export async function recordUserInteraction() {
  await recordActivity();
}

/**
 * Marque le début d'une série
 */
export async function startSeriesTracking() {
  await recordSeriesError(); // Réinitialise les erreurs
  const { startSeries } = require('./seriesTracker');
  await startSeries();
}

/**
 * Marque une erreur dans une série
 */
export async function recordSeriesErrorTracking() {
  await recordSeriesError();
}

/**
 * Marque la complétion d'une série
 */
export async function completeSeriesTracking(seriesId = null, wasPerfect = false) {
  if (wasPerfect) {
    await handlePerfectSeries(seriesId);
  }
  
  const { completeSeries } = require('./seriesTracker');
  await completeSeries(seriesId);
  
  // Mettre à jour les quêtes de séries complétées
  await updateQuestProgress(QUEST_CATEGORIES.MODULES_COMPLETED, 1, { seriesId, wasPerfect });
}
