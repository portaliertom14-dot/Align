import { Platform, AppState } from 'react-native';
import { getUserProgress, updateUserProgress } from './userProgressSupabase';
import { getCurrentUser } from '../services/auth';

/**
 * Système de sauvegarde automatique de la progression utilisateur
 * 
 * Fonctionnalités :
 * - Sauvegarde périodique (toutes les 30 secondes)
 * - Sauvegarde lors des changements d'état de l'app (background/foreground)
 * - Sauvegarde avant la fermeture
 * - Queue de sauvegarde pour éviter les appels multiples
 * - Dirty flag pour ne sauvegarder que si des changements ont été faits
 */

// État du système de sauvegarde automatique
let autoSaveInterval = null;
let isAutoSaveEnabled = false;
let lastSavedProgress = null;
let pendingSave = null;
let saveQueue = [];
let isSaving = false;
let autoSaveGracePeriod = false; // Délai de grâce après login (évite sauvegarde immédiate)

// Configuration
const AUTO_SAVE_INTERVAL = 30000; // 30 secondes
const MIN_CHANGES_THRESHOLD = 0; // Sauvegarder même les changements minimes

/**
 * Initialise le système de sauvegarde automatique
 */
export async function initializeAutoSave() {
  if (isAutoSaveEnabled) {
    console.log('[AutoSave] Système déjà initialisé');
    return;
  }

  // Vérifier qu'un utilisateur est connecté avant d'initialiser
  let user;
  try {
    user = await getCurrentUser();
  } catch (error) {
    console.error('[AutoSave] Erreur lors de la récupération de l\'utilisateur:', error);
    return;
  }
  
  if (!user) {
    console.log('[AutoSave] Aucun utilisateur connecté, système de sauvegarde non initialisé');
    return;
  }

  console.log('[AutoSave] 🚀 Initialisation du système de sauvegarde automatique...');

  // Charger la progression actuelle comme référence
  try {
    // CRITICAL: Forcer un refresh depuis DB pour avoir les vraies valeurs
    const progress = await getUserProgress(true);
    lastSavedProgress = progress;
    console.log('[AutoSave] ✅ Progression de référence chargée:', {
      xp: progress.currentXP,
      stars: progress.totalStars,
      level: progress.currentLevel
    });
    
    // CRITICAL: Activer délai de grâce (2 secondes) pour éviter sauvegarde immédiate après login
    autoSaveGracePeriod = true;
    setTimeout(() => {
      autoSaveGracePeriod = false;
      console.log('[AutoSave] ✅ Délai de grâce terminé, sauvegarde automatique activée');
    }, 2000);
  } catch (err) {
    console.error('[AutoSave] Erreur lors du chargement de la progression de référence:', err);
  }

  // Démarrer la sauvegarde périodique
  try {
    startPeriodicSave();
  } catch (error) {
    console.error('[AutoSave] Erreur lors du démarrage de la sauvegarde périodique:', error);
  }

  // Écouter les changements d'état de l'app (uniquement sur mobile)
  if (Platform.OS !== 'web') {
    try {
      setupAppStateListener();
    } catch (error) {
      console.error('[AutoSave] Erreur lors de la configuration de l\'écouteur d\'état:', error);
    }
  } else {
    console.log('[AutoSave] Écouteur d\'état ignoré sur web');
  }

  isAutoSaveEnabled = true;
  console.log('[AutoSave] ✅ Système de sauvegarde automatique activé');
}

/**
 * Arrête le système de sauvegarde automatique
 */
export function stopAutoSave() {
  if (!isAutoSaveEnabled) {
    return;
  }

  console.log('[AutoSave] Arrêt du système de sauvegarde automatique...');

  // Arrêter la sauvegarde périodique
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval);
    autoSaveInterval = null;
  }

  // Retirer l'écouteur d'état de l'app
  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
  }

  // Sauvegarder une dernière fois avant l'arrêt
  saveProgressNow().catch(err => {
    console.error('[AutoSave] Erreur lors de la sauvegarde finale:', err);
  });

  isAutoSaveEnabled = false;
  console.log('[AutoSave] ✅ Système de sauvegarde automatique arrêté');
}

/**
 * Démarre la sauvegarde périodique
 */
function startPeriodicSave() {
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval);
  }

  autoSaveInterval = setInterval(() => {
    saveProgressIfNeeded().catch(err => {
      console.error('[AutoSave] Erreur lors de la sauvegarde périodique:', err);
    });
  }, AUTO_SAVE_INTERVAL);

  console.log(`[AutoSave] Sauvegarde périodique activée (toutes les ${AUTO_SAVE_INTERVAL / 1000}s)`);
}

/**
 * Configure l'écouteur des changements d'état de l'app
 */
function setupAppStateListener() {
  if (Platform.OS === 'web') {
    // AppState n'est pas disponible ou fonctionne différemment sur web
    return;
  }
  
  if (appStateSubscription) {
    appStateSubscription.remove();
  }
  
  try {
    appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
  } catch (error) {
    console.error('[AutoSave] Erreur lors de l\'ajout de l\'écouteur AppState:', error);
  }
}

let appStateSubscription = null;

/**
 * Gère les changements d'état de l'app
 */
function handleAppStateChange(nextAppState) {
  if (nextAppState === 'background' || nextAppState === 'inactive') {
    // Sauvegarder quand l'app passe en arrière-plan
    console.log('[AutoSave] App en arrière-plan, sauvegarde...');
    saveProgressNow().catch(err => {
      console.error('[AutoSave] Erreur lors de la sauvegarde en arrière-plan:', err);
    });
  } else if (nextAppState === 'active') {
    // Rafraîchir la progression de référence quand l'app revient au premier plan
    console.log('[AutoSave] App au premier plan, rafraîchissement de la progression...');
    getUserProgress(true).then(progress => {
      lastSavedProgress = progress;
    }).catch(err => {
      console.error('[AutoSave] Erreur lors du rafraîchissement:', err);
    });
  }
}

/**
 * Sauvegarde la progression immédiatement si nécessaire
 * @returns {Promise<boolean>} True si sauvegardé, false sinon
 */
export async function saveProgressIfNeeded() {
  try {
    // CRITICAL: Vérifier délai de grâce
    if (autoSaveGracePeriod) {
      console.log('[AutoSave] ⏳ Délai de grâce actif, sauvegarde différée');
      return false;
    }
    
    // CRITICAL: Vérifier qu'un utilisateur est connecté AVANT toute vérification
    const user = await getCurrentUser();
    if (!user || !user.id) {
      console.log('[AutoSave] ⚠️ Pas d\'utilisateur connecté, sauvegarde annulée');
      return false;
    }

    // Récupérer la progression actuelle
    const currentProgress = await getUserProgress(false); // Ne pas forcer le refresh pour éviter les appels DB inutiles

    // Comparer avec la dernière sauvegarde
    if (!hasSignificantChanges(lastSavedProgress, currentProgress)) {
      return false; // Pas de changements significatifs, pas besoin de sauvegarder
    }

    // Sauvegarder
    await saveProgressNow();
    return true;
  } catch (error) {
    console.error('[AutoSave] Erreur lors de la vérification de sauvegarde:', error);
    return false;
  }
}

/**
 * Sauvegarde la progression immédiatement (sans vérification)
 * @returns {Promise<boolean>} True si sauvegardé avec succès
 */
export async function saveProgressNow() {
  // Si une sauvegarde est déjà en cours, ajouter à la queue
  if (isSaving) {
    return new Promise((resolve) => {
      saveQueue.push(resolve);
    });
  }

  isSaving = true;

  try {
    // CRITICAL: Vérifier qu'un utilisateur est connecté AVANT toute sauvegarde
    const user = await getCurrentUser();
    if (!user) {
      console.log('[AutoSave] ⚠️ Pas d\'utilisateur connecté, sauvegarde annulée');
      isSaving = false;
      processSaveQueue();
      return false;
    }

    // Récupérer la progression actuelle
    const currentProgress = await getUserProgress(false);

    if (!currentProgress) {
      console.warn('[AutoSave] Aucune progression à sauvegarder');
      isSaving = false;
      processSaveQueue();
      return false;
    }

    // Sauvegarder uniquement les champs qui ont changé
    const changes = getChangedFields(lastSavedProgress, currentProgress);
    
    if (Object.keys(changes).length === 0) {
      console.log('[AutoSave] Aucun changement détecté, pas de sauvegarde nécessaire');
      isSaving = false;
      processSaveQueue();
      return true;
    }

    // 🔒 PROTECTION CONTRE LES RÉGRESSIONS : Ne pas sauvegarder si XP/étoiles passent de > 0 à 0
    // Cela indique une mauvaise récupération depuis Supabase, pas une vraie régression
    if (lastSavedProgress) {
      const lastXP = lastSavedProgress.currentXP || 0;
      const lastStars = lastSavedProgress.totalStars || 0;
      const currentXP = currentProgress.currentXP || 0;
      const currentStars = currentProgress.totalStars || 0;
      
      // Si on avait des valeurs > 0 et qu'on passe à 0, c'est suspect
      if ((lastXP > 0 && currentXP === 0) || (lastStars > 0 && currentStars === 0)) {
        console.warn('[AutoSave] ⚠️ Régression détectée (XP/étoiles passent de > 0 à 0). Forçage du refresh depuis Supabase...');
        
        // Forcer un refresh depuis Supabase pour récupérer les vraies valeurs
        try {
          const { getUserProgress } = require('./userProgressSupabase');
          const refreshedProgress = await getUserProgress(true); // Force refresh
          
          if (refreshedProgress) {
            const refreshedXP = refreshedProgress.currentXP || 0;
            const refreshedStars = refreshedProgress.totalStars || 0;
            
            // Si Supabase a les vraies valeurs, les utiliser
            if (refreshedXP > 0 || refreshedStars > 0) {
              console.log('[AutoSave] ✅ Vraies valeurs récupérées depuis Supabase:', {
                xp: refreshedXP,
                stars: refreshedStars
              });
              
              // Mettre à jour la référence avec les vraies valeurs
              lastSavedProgress = { ...refreshedProgress };
              isSaving = false;
              processSaveQueue();
              return true; // Pas de sauvegarde nécessaire, les valeurs sont déjà en DB
            }
          }
        } catch (refreshError) {
          console.error('[AutoSave] ❌ Erreur lors du refresh depuis Supabase:', refreshError);
        }
        
        // Si le refresh échoue, ne pas sauvegarder les valeurs à 0
        console.warn('[AutoSave] ⚠️ Annulation de la sauvegarde pour éviter d\'écraser les valeurs');
        isSaving = false;
        processSaveQueue();
        return false;
      }
    }

    console.log('[AutoSave] 💾 Sauvegarde en cours...', Object.keys(changes));

    // Sauvegarder dans Supabase
    const result = await updateUserProgress(changes);

    if (result) {
      // Mettre à jour la référence
      lastSavedProgress = { ...currentProgress };
      console.log('[AutoSave] ✅ Progression sauvegardée avec succès');
      isSaving = false;
      processSaveQueue();
      return true;
    } else {
      console.error('[AutoSave] ❌ Échec de la sauvegarde');
      isSaving = false;
      processSaveQueue();
      return false;
    }
  } catch (error) {
    console.error('[AutoSave] ❌ Erreur lors de la sauvegarde:', error);
    isSaving = false;
    processSaveQueue();
    return false;
  }
}

/**
 * Traite la queue de sauvegarde
 */
function processSaveQueue() {
  if (saveQueue.length > 0 && !isSaving) {
    const resolve = saveQueue.shift();
    saveProgressNow().then(success => {
      if (resolve) resolve(success);
    });
  }
}

/**
 * Vérifie s'il y a des changements significatifs entre deux progressions
 * @param {Object} oldProgress - Ancienne progression
 * @param {Object} newProgress - Nouvelle progression
 * @returns {boolean} True si changements significatifs
 */
function hasSignificantChanges(oldProgress, newProgress) {
  if (!oldProgress || !newProgress) {
    return true; // Si l'une des deux est null, considérer comme changement
  }

  // Vérifier les champs critiques
  const criticalFields = ['currentXP', 'totalStars', 'currentLevel', 'currentModuleIndex'];
  
  for (const field of criticalFields) {
    if (oldProgress[field] !== newProgress[field]) {
      return true;
    }
  }

  // Vérifier les autres champs
  const changes = getChangedFields(oldProgress, newProgress);
  return Object.keys(changes).length > MIN_CHANGES_THRESHOLD;
}

/**
 * Récupère les champs qui ont changé entre deux progressions
 * @param {Object} oldProgress - Ancienne progression
 * @param {Object} newProgress - Nouvelle progression
 * @returns {Object} Objet contenant uniquement les champs modifiés
 */
function getChangedFields(oldProgress, newProgress) {
  if (!oldProgress) {
    // Si pas d'ancienne progression, retourner tous les champs de la nouvelle
    // MAIS exclure les champs undefined pour éviter de sauvegarder 0 par erreur
    const changes = {};
    const fieldsToCheck = [
      'currentXP',
      'totalStars',
      'currentLevel',
      'currentModuleIndex',
      'currentModuleInChapter',
      'completedModulesInChapter',
      'chapterHistory',
      'activeDirection',
      'activeSerie',
      'activeMetier',
      'activeModule',
      'currentChapter',
      'currentLesson',
      'completedLevels',
      'quizAnswers',
      'metierQuizAnswers',
    ];
    
    for (const field of fieldsToCheck) {
      if (newProgress[field] !== undefined) {
        changes[field] = newProgress[field];
      }
    }
    
    return changes;
  }

  if (!newProgress) {
    return {};
  }

  const changes = {};

  // Liste des champs à surveiller
  const fieldsToCheck = [
    'currentXP',
    'totalStars',
    'currentLevel',
    'currentModuleIndex',
    'currentModuleInChapter',
    'completedModulesInChapter',
    'chapterHistory',
    'activeDirection',
    'activeSerie',
    'activeMetier',
    'activeModule',
    'currentChapter',
    'currentLesson',
    'completedLevels',
    'quizAnswers',
    'metierQuizAnswers',
  ];

  for (const field of fieldsToCheck) {
    const oldValue = oldProgress[field];
    const newValue = newProgress[field];

    // Comparaison profonde pour les objets/tableaux
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes[field] = newValue;
    }
  }

  return changes;
}

/**
 * Force une sauvegarde immédiate (utilisé lors d'événements critiques)
 * @returns {Promise<boolean>} True si sauvegardé avec succès
 */
export async function forceSave() {
  console.log('[AutoSave] 🔄 Sauvegarde forcée...');
  lastSavedProgress = null; // Forcer la sauvegarde en réinitialisant la référence
  return await saveProgressNow();
}

/**
 * Marque la progression comme "dirty" pour forcer une sauvegarde au prochain cycle
 */
export function markProgressDirty() {
  // Réinitialiser la référence pour forcer une sauvegarde
  lastSavedProgress = null;
}
