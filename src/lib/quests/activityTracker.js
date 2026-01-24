/**
 * Système de tracking de l'activité utilisateur
 * Gère le temps actif avec pause automatique sur inactivité
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const ACTIVITY_STORAGE_KEY = '@align_activity_tracking';
const INACTIVITY_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes d'inactivité

/**
 * Structure de tracking d'activité
 */
const DEFAULT_ACTIVITY = {
  sessionStartTime: null,
  lastActivityTime: null,
  totalActiveTimeMs: 0, // Temps actif cumulé en millisecondes
  currentSessionStartTime: null,
  isActive: false,
};

/**
 * Récupère les données d'activité
 */
export async function getActivityData() {
  try {
    const dataJson = await AsyncStorage.getItem(ACTIVITY_STORAGE_KEY);
    if (dataJson) {
      return JSON.parse(dataJson);
    }
    return { ...DEFAULT_ACTIVITY };
  } catch (error) {
    console.error('[ActivityTracker] Erreur lors de la récupération:', error);
    return { ...DEFAULT_ACTIVITY };
  }
}

/**
 * Sauvegarde les données d'activité
 */
async function saveActivityData(data) {
  try {
    await AsyncStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('[ActivityTracker] Erreur lors de la sauvegarde:', error);
    return false;
  }
}

/**
 * Marque le début d'une session active
 */
export async function startActivitySession() {
  const now = Date.now();
  const activity = await getActivityData();
  
  // Si une session était déjà active, calculer le temps écoulé
  if (activity.isActive && activity.currentSessionStartTime) {
    const sessionDuration = now - activity.currentSessionStartTime;
    activity.totalActiveTimeMs += sessionDuration;
  }
  
  activity.isActive = true;
  activity.currentSessionStartTime = now;
  activity.lastActivityTime = now;
  
  if (!activity.sessionStartTime) {
    activity.sessionStartTime = now;
  }
  
  await saveActivityData(activity);
  return activity;
}

/**
 * Marque la fin d'une session active
 */
export async function endActivitySession() {
  const now = Date.now();
  const activity = await getActivityData();
  
  if (activity.isActive && activity.currentSessionStartTime) {
    const sessionDuration = now - activity.currentSessionStartTime;
    activity.totalActiveTimeMs += sessionDuration;
  }
  
  activity.isActive = false;
  activity.currentSessionStartTime = null;
  activity.lastActivityTime = now;
  
  await saveActivityData(activity);
  return activity;
}

/**
 * Enregistre une activité utilisateur (interaction)
 */
export async function recordActivity() {
  const now = Date.now();
  const activity = await getActivityData();
  
  // Si inactif depuis trop longtemps, considérer comme nouvelle session
  if (activity.lastActivityTime) {
    const timeSinceLastActivity = now - activity.lastActivityTime;
    
    if (timeSinceLastActivity > INACTIVITY_THRESHOLD_MS) {
      // Pause détectée : sauvegarder le temps de la session précédente
      if (activity.isActive && activity.currentSessionStartTime) {
        const sessionDuration = activity.lastActivityTime - activity.currentSessionStartTime;
        activity.totalActiveTimeMs += sessionDuration;
        activity.currentSessionStartTime = null;
      }
      activity.isActive = false;
    }
  }
  
  // Si pas actif, démarrer une nouvelle session
  if (!activity.isActive) {
    activity.isActive = true;
    activity.currentSessionStartTime = now;
  }
  
  activity.lastActivityTime = now;
  await saveActivityData(activity);
  return activity;
}

/**
 * Récupère le temps actif total en minutes
 */
export async function getActiveTimeMinutes() {
  const activity = await getActivityData();
  const now = Date.now();
  
  let totalMs = activity.totalActiveTimeMs;
  
  // Ajouter le temps de la session en cours si active
  if (activity.isActive && activity.currentSessionStartTime) {
    const currentSessionMs = now - activity.currentSessionStartTime;
    totalMs += currentSessionMs;
  }
  
  return Math.floor(totalMs / (60 * 1000));
}

/**
 * Récupère le temps actif total en millisecondes
 */
export async function getActiveTimeMs() {
  const activity = await getActivityData();
  const now = Date.now();
  
  let totalMs = activity.totalActiveTimeMs;
  
  if (activity.isActive && activity.currentSessionStartTime) {
    const currentSessionMs = now - activity.currentSessionStartTime;
    totalMs += currentSessionMs;
  }
  
  return totalMs;
}

/**
 * Réinitialise le tracking d'activité (pour nouveau jour)
 */
export async function resetActivityTracking() {
  const activity = await getActivityData();
  
  // Sauvegarder le temps de la session en cours avant reset
  if (activity.isActive && activity.currentSessionStartTime) {
    const now = Date.now();
    const sessionDuration = now - activity.currentSessionStartTime;
    activity.totalActiveTimeMs += sessionDuration;
  }
  
  const resetData = {
    ...DEFAULT_ACTIVITY,
    sessionStartTime: Date.now(),
    lastActivityTime: Date.now(),
    isActive: activity.isActive, // Conserver l'état actif si la session continue
    currentSessionStartTime: activity.isActive ? Date.now() : null,
  };
  
  await saveActivityData(resetData);
  return resetData;
}

/**
 * Vérifie si l'utilisateur est actuellement actif
 */
export async function isUserActive() {
  const activity = await getActivityData();
  const now = Date.now();
  
  if (!activity.isActive) {
    return false;
  }
  
  // Vérifier si la dernière activité est trop ancienne
  if (activity.lastActivityTime) {
    const timeSinceLastActivity = now - activity.lastActivityTime;
    if (timeSinceLastActivity > INACTIVITY_THRESHOLD_MS) {
      // Marquer comme inactif
      await endActivitySession();
      return false;
    }
  }
  
  return true;
}
