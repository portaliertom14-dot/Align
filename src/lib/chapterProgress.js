/**
 * Gestion de la progression par chapitres et modules
 * Système : 3 modules par chapitre → passage au chapitre suivant
 */

import { getUserProgress, updateUserProgress } from './userProgressSupabase';
import { getChapterById, getModuleTypeByIndex } from '../data/chapters';

/**
 * Structure de progression par chapitre
 */
const DEFAULT_CHAPTER_PROGRESS = {
  currentChapter: 1,
  currentModuleInChapter: 0, // 0, 1 ou 2 (index du module dans le chapitre actuel)
  completedModulesInChapter: [], // [0, 1, 2] - modules complétés dans le chapitre actuel
  chapterHistory: [], // Historique des chapitres complétés
};

/**
 * Récupère la progression des chapitres
 * @param {boolean} forceRefresh - Force le rechargement depuis la DB (pour la modal Chapitres)
 */
export async function getChapterProgress(forceRefresh = false) {
  try {
    const progress = await getUserProgress(forceRefresh);
    return {
      currentChapter: progress.currentChapter || 1,
      currentModuleInChapter: progress.currentModuleInChapter || 0,
      completedModulesInChapter: progress.completedModulesInChapter || [],
      chapterHistory: progress.chapterHistory || [],
    };
  } catch (error) {
    console.error('Erreur lors de la récupération de la progression des chapitres:', error);
    return DEFAULT_CHAPTER_PROGRESS;
  }
}

/**
 * Marque un module comme complété dans le chapitre actuel
 * @param {number} moduleIndex - Index du module dans le chapitre (0, 1 ou 2)
 */
export async function completeModuleInChapter(moduleIndex) {
  try {
    const chapterProgress = await getChapterProgress();
    const { currentChapter, completedModulesInChapter, currentModuleInChapter } = chapterProgress;
    
    // Ajouter le module aux modules complétés s'il n'y est pas déjà
    const updatedCompleted = [...completedModulesInChapter];
    if (!updatedCompleted.includes(moduleIndex)) {
      updatedCompleted.push(moduleIndex);
    }
    
    // Vérifier si tous les 3 modules sont complétés
    // OU si on complète le module 2 (dernier module) - dans ce cas, le chapitre est automatiquement complété
    // même si completedModulesInChapter ne contient pas les 3 modules (cas de navigation via menu défilant)
    const allModulesCompleted = updatedCompleted.length >= 3 || moduleIndex === 2;
    
    if (allModulesCompleted) {
      // Passer au chapitre suivant
      const nextChapter = currentChapter + 1;
      const chapter = getChapterById(currentChapter);
      
      // Ajouter le chapitre complété à l'historique
      const updatedHistory = [...(chapterProgress.chapterHistory || [])];
      if (!updatedHistory.includes(currentChapter)) {
        updatedHistory.push(currentChapter);
      }
      
      // Mettre à jour la progression
      const updateResult = await updateUserProgress({
        currentChapter: nextChapter > 10 ? 10 : nextChapter, // Max chapitre 10
        currentModuleInChapter: 0, // Réinitialiser pour le nouveau chapitre
        completedModulesInChapter: [], // Réinitialiser
        chapterHistory: updatedHistory,
      });
      
      return {
        chapterCompleted: true,
        nextChapter: nextChapter > 10 ? null : nextChapter,
        currentChapter: nextChapter > 10 ? 10 : nextChapter,
        currentModuleInChapter: 0,
      };
    } else {
      // Calculer le prochain module à débloquer
      // Si on complète le module 0, le prochain est 1
      // Si on complète le module 1, le prochain est 2
      // Si on complète le module 2, on passe au chapitre suivant (géré ci-dessus)
      const nextModuleIndex = Math.min(moduleIndex + 1, 2);
      
      // Mettre à jour seulement les modules complétés et débloquer le suivant
      const updateResult = await updateUserProgress({
        completedModulesInChapter: updatedCompleted,
        currentModuleInChapter: nextModuleIndex, // Débloquer le module suivant
      });
      
      // Vérifier que la mise à jour a réussi
      if (!updateResult) {
        console.error('[completeModuleInChapter] ❌ Échec de la mise à jour de la progression');
        return null;
      }
      
      return {
        chapterCompleted: false,
        currentChapter,
        currentModuleInChapter: nextModuleIndex,
        completedModulesInChapter: updatedCompleted,
      };
    }
  } catch (error) {
    console.error('Erreur lors de la complétion du module:', error);
    return null;
  }
}

/**
 * Récupère le module actuel à compléter dans le chapitre
 */
export async function getCurrentModuleInfo() {
  try {
    const chapterProgress = await getChapterProgress();
    const { currentChapter, currentModuleInChapter } = chapterProgress;
    
    const chapter = getChapterById(currentChapter);
    const moduleType = getModuleTypeByIndex(currentModuleInChapter);
    
    return {
      chapter,
      chapterId: currentChapter,
      moduleIndex: currentModuleInChapter,
      moduleType,
      isLastModuleInChapter: currentModuleInChapter === 2,
    };
  } catch (error) {
    console.error('Erreur lors de la récupération du module actuel:', error);
    return null;
  }
}

/**
 * Vérifie si un module est déjà complété dans le chapitre actuel
 */
export async function isModuleCompletedInChapter(moduleIndex) {
  try {
    const chapterProgress = await getChapterProgress();
    return (chapterProgress.completedModulesInChapter || []).includes(moduleIndex);
  } catch (error) {
    console.error('Erreur lors de la vérification du module:', error);
    return false;
  }
}

/**
 * Récupère le statut de déverrouillage des modules dans le chapitre actuel
 */
export async function getModuleUnlockStatus() {
  try {
    const chapterProgress = await getChapterProgress();
    const { currentModuleInChapter, completedModulesInChapter } = chapterProgress;
    
    // Un module est débloqué si son index <= currentModuleInChapter
    // Un module est cliquable SEULEMENT si son index === currentModuleInChapter
    return {
      module0: {
        unlocked: 0 <= currentModuleInChapter,
        clickable: currentModuleInChapter === 0 && !completedModulesInChapter.includes(0),
        completed: completedModulesInChapter.includes(0),
      },
      module1: {
        unlocked: 1 <= currentModuleInChapter,
        clickable: currentModuleInChapter === 1 && !completedModulesInChapter.includes(1),
        completed: completedModulesInChapter.includes(1),
      },
      module2: {
        unlocked: 2 <= currentModuleInChapter,
        clickable: currentModuleInChapter === 2 && !completedModulesInChapter.includes(2),
        completed: completedModulesInChapter.includes(2),
      },
    };
  } catch (error) {
    console.error('Erreur lors de la récupération du statut de déverrouillage:', error);
    return {
      module0: { unlocked: true, clickable: true, completed: false },
      module1: { unlocked: false, clickable: false, completed: false },
      module2: { unlocked: false, clickable: false, completed: false },
    };
  }
}
