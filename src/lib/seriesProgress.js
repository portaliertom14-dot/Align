import AsyncStorage from '@react-native-async-storage/async-storage';

const PROGRESS_STORAGE_KEY = '@align_series_progress';

/**
 * Structure de progression des Series
 */
const DEFAULT_PROGRESS = {
  module1: {
    completed: false,
    started: false,
    selectedScenarios: [],
    missionsCompleted: [],
  },
  module2: {
    completed: false,
    started: false,
    lessonsCompleted: [],
    xpEarned: 0,
  },
  module3: {
    completed: false,
    started: false,
    sectorsExplored: [],
  },
  seriesComplete: false,
  startedAt: null,
  completedAt: null,
  totalXP: 0,
  level: 1,
};

/**
 * Récupère la progression des Series
 * @returns {Promise<Object>} Progression sauvegardée
 */
export async function getSeriesProgress() {
  try {
    const progressJson = await AsyncStorage.getItem(PROGRESS_STORAGE_KEY);
    
    if (progressJson) {
      return JSON.parse(progressJson);
    }
    
    // Retourner la progression par défaut
    return DEFAULT_PROGRESS;
  } catch (error) {
    console.error('Erreur lors de la récupération de la progression:', error);
    return DEFAULT_PROGRESS;
  }
}

/**
 * Met à jour la progression d'un module
 * @param {string} moduleName - Nom du module ('module1', 'module2', 'module3')
 * @param {Object} status - Statut à mettre à jour
 */
export async function updateSeriesProgress(moduleName, status) {
  try {
    const currentProgress = await getSeriesProgress();
    
    const updatedProgress = {
      ...currentProgress,
      [moduleName]: {
        ...currentProgress[moduleName],
        ...status,
      },
    };

    // Si c'est le premier démarrage, enregistrer la date
    if (!updatedProgress.startedAt) {
      updatedProgress.startedAt = new Date().toISOString();
    }

    // Si tous les modules sont complétés, marquer la série comme complète
    if (
      updatedProgress.module1.completed &&
      updatedProgress.module2.completed &&
      updatedProgress.module3.completed &&
      !updatedProgress.seriesComplete
    ) {
      updatedProgress.seriesComplete = true;
      updatedProgress.completedAt = new Date().toISOString();
    }

    await AsyncStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify(updatedProgress)
    );

    return updatedProgress;
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la progression:', error);
    return null;
  }
}

/**
 * Marque un module comme complété
 * @param {string} moduleName - Nom du module
 */
export async function completeModule(moduleName) {
  return await updateSeriesProgress(moduleName, {
    completed: true,
    started: true,
  });
}

/**
 * Marque un module comme démarré
 * @param {string} moduleName - Nom du module
 */
export async function startModule(moduleName) {
  return await updateSeriesProgress(moduleName, {
    started: true,
  });
}

/**
 * Réinitialise la progression des Series
 */
export async function resetSeriesProgress() {
  try {
    await AsyncStorage.removeItem(PROGRESS_STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Erreur lors de la réinitialisation:', error);
    return false;
  }
}

/**
 * Vérifie si une série est complète
 */
export async function isSeriesComplete() {
  const progress = await getSeriesProgress();
  return progress.seriesComplete;
}

/**
 * Ajoute de l'XP et met à jour le niveau
 * @param {number} xp - XP à ajouter
 */
export async function addXP(xp) {
  try {
    const currentProgress = await getSeriesProgress();
    const newTotalXP = (currentProgress.totalXP || 0) + xp;
    
    // Calculer le niveau (1 niveau = 1500 XP)
    const newLevel = Math.floor(newTotalXP / 1500) + 1;
    
    const updatedProgress = {
      ...currentProgress,
      totalXP: newTotalXP,
      level: newLevel,
    };

    await AsyncStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify(updatedProgress)
    );

    return { totalXP: newTotalXP, level: newLevel };
  } catch (error) {
    console.error('Erreur lors de l\'ajout d\'XP:', error);
    return null;
  }
}

