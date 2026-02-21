import AsyncStorage from '@react-native-async-storage/async-storage';
import { DIRECTION_TO_SERIE, SECTEUR_ID_TO_DIRECTION, LEGACY_SECTEUR_ID_TO_NEW, DIRECTION_TO_FIRST_SECTEUR, normalizeSecteurIdToV16 } from '../data/serieData';

const USER_PROGRESS_STORAGE_KEY = '@align_user_progress';

/**
 * Structure de progression utilisateur
 */
const DEFAULT_USER_PROGRESS = {
  activeDirection: null,
  activeSerie: null,
  activeMetier: null, // Métier proposé par way
  activeModule: 'mini_simulation_metier', // Module actif pour le bloc info
  currentChapter: 1, // Chapitre actuel
  currentLesson: 1, // Leçon actuelle
  currentLevel: 0, // Niveau initial à 0 (sera recalculé à partir de l'XP)
  currentXP: 0, // XP initial à 0
  completedLevels: [],
  totalStars: 0, // Étoiles totales gagnées (initial à 0)
  completedModules: [], // Historique des modules complétés (pour way)
  quizAnswers: {}, // Réponses du quiz secteur (pour way)
  metierQuizAnswers: {}, // Réponses du quiz métier (pour way)
};

/**
 * Récupère la progression utilisateur
 * @returns {Promise<Object>} Progression sauvegardée
 */
export async function getUserProgress() {
  try {
    const progressJson = await AsyncStorage.getItem(USER_PROGRESS_STORAGE_KEY);
    
    if (progressJson) {
      return JSON.parse(progressJson);
    }
    
    return DEFAULT_USER_PROGRESS;
  } catch (error) {
    console.error('Erreur lors de la récupération de la progression:', error);
    return DEFAULT_USER_PROGRESS;
  }
}

/**
 * Met à jour la progression utilisateur
 * @param {Object} updates - Mises à jour à appliquer
 */
export async function updateUserProgress(updates) {
  try {
    const currentProgress = await getUserProgress();
    
    const updatedProgress = {
      ...currentProgress,
      ...updates,
    };

    await AsyncStorage.setItem(
      USER_PROGRESS_STORAGE_KEY,
      JSON.stringify(updatedProgress)
    );

    return updatedProgress;
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la progression:', error);
    return null;
  }
}

/**
 * Définit la direction active et la série associée.
 * Persiste le secteurId (ex: ingenierie_tech) pour cohérence Edge/DB, pas le libellé.
 */
export async function setActiveDirection(direction) {
  const secteurIdToStore = normalizeSecteurIdToV16(direction);
  const directionName = SECTEUR_ID_TO_DIRECTION[secteurIdToStore];
  const serieId = directionName ? DIRECTION_TO_SERIE[directionName] : undefined;
  const finalSerieId = serieId || DIRECTION_TO_SERIE['Sciences & Technologies'];
  const result = await updateUserProgress({
    activeDirection: secteurIdToStore,
    activeSerie: finalSerieId,
    // Réinitialiser la progression si on change de série
    currentLevel: 1,
    currentXP: 0,
    completedLevels: [],
  });
  return result;
}

/**
 * Définit la série active
 * @param {string} serieId - ID de la série
 */
export async function setActiveSerie(serieId) {
  return await updateUserProgress({
    activeSerie: serieId,
  });
}

/**
 * Définit le métier actif (proposé par le quiz métier)
 * @param {string} metierId - ID du métier (ex: 'avocat', 'developpeur')
 */
export async function setActiveMetier(metierId) {
  return await updateUserProgress({
    activeMetier: metierId,
  });
}

/**
 * Ajoute de l'XP et met à jour le niveau
 * @param {number} xp - XP à ajouter
 */
export async function addXP(xp) {
  try {
    const currentProgress = await getUserProgress();
    const newXP = (currentProgress.currentXP || 0) + xp;
    
    // Calculer le niveau (1 niveau = 100 XP pour chaque niveau de série)
    const newLevel = Math.floor(newXP / 100) + 1;
    
    return await updateUserProgress({
      currentXP: newXP,
      currentLevel: Math.min(newLevel, 3), // Max niveau 3
    });
  } catch (error) {
    console.error('Erreur lors de l\'ajout d\'XP:', error);
    return null;
  }
}

/**
 * Marque un niveau comme complété
 * @param {number} levelNumber - Numéro du niveau (1, 2 ou 3)
 */
export async function completeLevel(levelNumber) {
  try {
    const currentProgress = await getUserProgress();
    const completedLevels = [...(currentProgress.completedLevels || [])];
    
    if (!completedLevels.includes(levelNumber)) {
      completedLevels.push(levelNumber);
    }
    
    // Débloquer le niveau suivant
    const nextLevel = levelNumber < 3 ? levelNumber + 1 : 3;
    
    return await updateUserProgress({
      completedLevels,
      currentLevel: Math.max(currentProgress.currentLevel, nextLevel),
    });
  } catch (error) {
    console.error('Erreur lors de la complétion du niveau:', error);
    return null;
  }
}

/**
 * Vérifie si un niveau est complété
 * @param {number} levelNumber - Numéro du niveau
 */
export async function isLevelCompleted(levelNumber) {
  const progress = await getUserProgress();
  return (progress.completedLevels || []).includes(levelNumber);
}

/**
 * Récupère le niveau actuel
 */
export async function getCurrentLevel() {
  const progress = await getUserProgress();
  return progress.currentLevel || 1;
}

/**
 * Récupère la série active
 */
export async function getActiveSerie() {
  const progress = await getUserProgress();
  return progress.activeSerie;
}

/**
 * Récupère la direction active
 */
export async function getActiveDirection() {
  const progress = await getUserProgress();
  return progress.activeDirection;
}

/**
 * Ajoute des étoiles à l'utilisateur
 * @param {number} stars - Nombre d'étoiles à ajouter
 */
export async function addStars(stars) {
  try {
    const currentProgress = await getUserProgress();
    const newStars = (currentProgress.totalStars || 0) + stars;
    
    return await updateUserProgress({
      totalStars: newStars,
    });
  } catch (error) {
    console.error('Erreur lors de l\'ajout d\'étoiles:', error);
    return null;
  }
}

/**
 * Réinitialise la progression utilisateur
 */
export async function resetUserProgress() {
  try {
    await AsyncStorage.removeItem(USER_PROGRESS_STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Erreur lors de la réinitialisation:', error);
    return false;
  }
}









