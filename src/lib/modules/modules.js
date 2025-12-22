/**
 * Gestion des modules Align
 * Stockage, historique, anti-spam/répétition
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
// Ancien système aline supprimé - tous les modules sont maintenant générés directement par way
// import { generatePersonalizedModule, generateInitialModules, generateModulePool } from './aline';
// wayMock — remplacé plus tard par wayAI (OpenAI)
import { wayValidateModuleAnswer } from '../../services/wayMock';
import { addXP, addStars, getUserProgress, updateUserProgress } from '../userProgress';

const MODULES_STORAGE_KEY = '@align_modules';
const COMPLETED_MODULES_STORAGE_KEY = '@align_completed_modules';

/**
 * Structure d'un module stocké
 */
export function createModuleData(module, level) {
  return {
    ...module,
    level,
    status: 'available', // available, in_progress, completed
    startedAt: null,
    completedAt: null,
    userAnswer: null,
    validationResult: null,
  };
}

/**
 * Récupère les modules disponibles pour un niveau
 */
/**
 * DEPRECATED: Cette fonction n'est plus utilisée pour le nouveau système de modules
 * Les modules sont maintenant générés à la demande via way depuis l'écran Feed
 * Conservée pour compatibilité mais retourne toujours un tableau vide
 */
export async function getModulesForLevel(level) {
  // Ne plus charger depuis le stockage - les modules sont générés à la demande
  return [];
}

/**
 * Sauvegarde les modules
 */
export async function saveModules(modules) {
  try {
    await AsyncStorage.setItem(MODULES_STORAGE_KEY, JSON.stringify(modules));
    return true;
  } catch (error) {
    console.error('Erreur lors de la sauvegarde des modules:', error);
    return false;
  }
}

/**
 * Récupère un module par ID
 */
export async function getModuleById(moduleId) {
  try {
    const modulesJson = await AsyncStorage.getItem(MODULES_STORAGE_KEY);
    if (!modulesJson) return null;

    const modules = JSON.parse(modulesJson);
    return modules.find(m => m.id === moduleId) || null;
  } catch (error) {
    console.error('Erreur lors de la récupération du module:', error);
    return null;
  }
}

/**
 * Marque un module comme "en cours"
 */
export async function startModule(moduleId) {
  try {
    const modulesJson = await AsyncStorage.getItem(MODULES_STORAGE_KEY);
    if (!modulesJson) return false;

    const modules = JSON.parse(modulesJson);
    const moduleIndex = modules.findIndex(m => m.id === moduleId);
    
    if (moduleIndex === -1) return false;

    modules[moduleIndex] = {
      ...modules[moduleIndex],
      status: 'in_progress',
      startedAt: new Date().toISOString(),
    };

    await saveModules(modules);
    return true;
  } catch (error) {
    console.error('Erreur lors du démarrage du module:', error);
    return false;
  }
}

/**
 * Soumet une réponse pour un module
 */
export async function submitModuleAnswer(moduleId, answer) {
  try {
    const modulesJson = await AsyncStorage.getItem(MODULES_STORAGE_KEY);
    if (!modulesJson) return null;

    const modules = JSON.parse(modulesJson);
    const moduleIndex = modules.findIndex(m => m.id === moduleId);
    
    if (moduleIndex === -1) return null;

    modules[moduleIndex] = {
      ...modules[moduleIndex],
      userAnswer: answer,
    };

    await saveModules(modules);
    return modules[moduleIndex];
  } catch (error) {
    console.error('Erreur lors de la soumission de la réponse:', error);
    return null;
  }
}

/**
 * Marque un module comme complété avec validation
 */
export async function completeModule(moduleId, validationResult) {
  try {
    const modulesJson = await AsyncStorage.getItem(MODULES_STORAGE_KEY);
    if (!modulesJson) return false;

    const modules = JSON.parse(modulesJson);
    const moduleIndex = modules.findIndex(m => m.id === moduleId);
    
    if (moduleIndex === -1) return false;

    const module = modules[moduleIndex];
    
    // Si déjà complété, ne pas permettre de le refaire (anti-spam)
    if (module.status === 'completed') {
      return false;
    }

    // Mettre à jour le module
    modules[moduleIndex] = {
      ...module,
      status: 'completed',
      completedAt: new Date().toISOString(),
      validationResult,
    };

    // Ajouter aux modules complétés (pour historique)
    const completedModulesJson = await AsyncStorage.getItem(COMPLETED_MODULES_STORAGE_KEY);
    const completedModules = completedModulesJson ? JSON.parse(completedModulesJson) : [];
    completedModules.push({
      moduleId: module.id,
      templateId: module.templateId,
      completedAt: new Date().toISOString(),
      level: module.level,
    });
    await AsyncStorage.setItem(COMPLETED_MODULES_STORAGE_KEY, JSON.stringify(completedModules));

    // Donner les récompenses
    if (validationResult.isValid && module.reward) {
      await addStars(module.reward.stars || 0);
      await addXP(module.reward.xp || 0);
    }

    // Mettre à jour la progression utilisateur
    const progress = await getUserProgress();
    await updateUserProgress({
      completedModules: completedModules,
    });

    await saveModules(modules);
    return true;
  } catch (error) {
    console.error('Erreur lors de la complétion du module:', error);
    return false;
  }
}

/**
 * Vérifie si un module a déjà été complété (anti-spam)
 */
export async function isModuleCompleted(moduleId) {
  try {
    const modulesJson = await AsyncStorage.getItem(MODULES_STORAGE_KEY);
    if (!modulesJson) return false;

    const modules = JSON.parse(modulesJson);
    const module = modules.find(m => m.id === moduleId);
    return module?.status === 'completed';
  } catch (error) {
    console.error('Erreur lors de la vérification du module:', error);
    return false;
  }
}

/**
 * Génère de nouveaux modules si nécessaire
 * (Quand l'utilisateur a complété tous les modules disponibles)
 */
/**
 * DEPRECATED: Cette fonction n'est plus utilisée
 * Les modules sont maintenant générés à la demande via way depuis l'écran Feed
 */
export async function generateNewModulesIfNeeded(level) {
  // Ne plus générer automatiquement - les modules sont générés à la demande
  return [];
}

/**
 * Récupère l'historique des modules complétés
 */
export async function getCompletedModulesHistory() {
  try {
    const completedModulesJson = await AsyncStorage.getItem(COMPLETED_MODULES_STORAGE_KEY);
    return completedModulesJson ? JSON.parse(completedModulesJson) : [];
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'historique:', error);
    return [];
  }
}







