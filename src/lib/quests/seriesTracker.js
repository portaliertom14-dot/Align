/**
 * Système de tracking des séries
 * Gère les séries normales et parfaites (sans erreur)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const SERIES_STORAGE_KEY = '@align_series_tracking';

/**
 * Structure de tracking des séries
 */
const DEFAULT_SERIES_TRACKING = {
  totalSeriesCompleted: 0,
  perfectSeriesCompleted: 0,
  currentSeriesErrors: 0,
  currentSeriesStartTime: null,
  lastSeriesCompletionTime: null,
  lastPerfectSeriesTime: null,
  seriesHistory: [], // Historique des séries complétées
};

/**
 * Récupère les données de tracking des séries
 */
export async function getSeriesTracking() {
  try {
    const dataJson = await AsyncStorage.getItem(SERIES_STORAGE_KEY);
    if (dataJson) {
      return JSON.parse(dataJson);
    }
    return { ...DEFAULT_SERIES_TRACKING };
  } catch (error) {
    console.error('[SeriesTracker] Erreur lors de la récupération:', error);
    return { ...DEFAULT_SERIES_TRACKING };
  }
}

/**
 * Sauvegarde les données de tracking
 */
async function saveSeriesTracking(data) {
  try {
    await AsyncStorage.setItem(SERIES_STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('[SeriesTracker] Erreur lors de la sauvegarde:', error);
    return false;
  }
}

/**
 * Démarre une nouvelle série
 */
export async function startSeries() {
  const tracking = await getSeriesTracking();
  
  tracking.currentSeriesErrors = 0;
  tracking.currentSeriesStartTime = Date.now();
  
  await saveSeriesTracking(tracking);
  return tracking;
}

/**
 * Enregistre une erreur dans la série en cours
 */
export async function recordSeriesError() {
  const tracking = await getSeriesTracking();
  
  if (tracking.currentSeriesStartTime) {
    tracking.currentSeriesErrors += 1;
    await saveSeriesTracking(tracking);
  }
  
  return tracking;
}

/**
 * Complète une série (normale ou parfaite selon les erreurs)
 */
export async function completeSeries(seriesId = null) {
  const tracking = await getSeriesTracking();
  
  if (!tracking.currentSeriesStartTime) {
    // Pas de série en cours, démarrer une nouvelle
    await startSeries();
    return tracking;
  }
  
  const isPerfect = tracking.currentSeriesErrors === 0;
  
  tracking.totalSeriesCompleted += 1;
  
  if (isPerfect) {
    tracking.perfectSeriesCompleted += 1;
    tracking.lastPerfectSeriesTime = Date.now();
  }
  
  tracking.lastSeriesCompletionTime = Date.now();
  
  // Ajouter à l'historique
  tracking.seriesHistory.push({
    seriesId: seriesId || `series_${Date.now()}`,
    completedAt: new Date().toISOString(),
    isPerfect,
    errors: tracking.currentSeriesErrors,
    duration: Date.now() - tracking.currentSeriesStartTime,
  });
  
  // Limiter l'historique aux 100 dernières séries
  if (tracking.seriesHistory.length > 100) {
    tracking.seriesHistory = tracking.seriesHistory.slice(-100);
  }
  
  // Réinitialiser pour la prochaine série
  tracking.currentSeriesErrors = 0;
  tracking.currentSeriesStartTime = null;
  
  await saveSeriesTracking(tracking);
  
  return {
    ...tracking,
    lastCompletedWasPerfect: isPerfect,
  };
}

/**
 * Récupère le nombre total de séries complétées
 */
export async function getTotalSeriesCompleted() {
  const tracking = await getSeriesTracking();
  return tracking.totalSeriesCompleted;
}

/**
 * Récupère le nombre de séries parfaites complétées
 */
export async function getPerfectSeriesCompleted() {
  const tracking = await getSeriesTracking();
  return tracking.perfectSeriesCompleted;
}

/**
 * Récupère le nombre de séries normales complétées
 */
export async function getNormalSeriesCompleted() {
  const tracking = await getSeriesTracking();
  return tracking.totalSeriesCompleted - tracking.perfectSeriesCompleted;
}

/**
 * Réinitialise le tracking des séries
 */
export async function resetSeriesTracking() {
  const resetData = { ...DEFAULT_SERIES_TRACKING };
  await saveSeriesTracking(resetData);
  return resetData;
}

/**
 * Vérifie si une série est en cours
 */
export async function isSeriesInProgress() {
  const tracking = await getSeriesTracking();
  return tracking.currentSeriesStartTime !== null;
}
