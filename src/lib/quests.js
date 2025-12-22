/**
 * Système de quêtes Align
 * Gestion des quêtes hebdomadaires et mensuelles
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { addXP, addStars } from './userProgress';

const QUESTS_STORAGE_KEY = '@align_quests';

/**
 * États possibles d'une quête
 */
export const QUEST_STATUS = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
};

/**
 * Types de quêtes
 */
export const QUEST_TYPES = {
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
};

/**
 * Quêtes hebdomadaires disponibles
 */
export const WEEKLY_QUESTS = [
  {
    id: 'weekly_1',
    title: 'Lire 3 faits d\'actualité',
    description: 'Reste informé en lisant 3 articles',
    stars: 5,
    xp: 50,
    type: QUEST_TYPES.WEEKLY,
    target: 3,
    current: 0,
    status: QUEST_STATUS.NOT_STARTED,
  },
  {
    id: 'weekly_2',
    title: 'Apprendre pendant 5 minutes',
    description: 'Passe 5 minutes à apprendre',
    stars: 3,
    xp: 30,
    type: QUEST_TYPES.WEEKLY,
    target: 5,
    current: 0,
    status: QUEST_STATUS.NOT_STARTED,
  },
  {
    id: 'weekly_3',
    title: 'Réussir 5 séries parfaites',
    description: 'Complète 5 séries sans erreur',
    stars: 10,
    xp: 100,
    type: QUEST_TYPES.WEEKLY,
    target: 5,
    current: 0,
    status: QUEST_STATUS.NOT_STARTED,
  },
];

/**
 * Quêtes mensuelles disponibles
 */
export const MONTHLY_QUESTS = [
  {
    id: 'monthly_1',
    title: 'Compléter 10 leçons',
    description: 'Termine 10 leçons complètes',
    stars: 50,
    xp: 500,
    type: QUEST_TYPES.MONTHLY,
    target: 10,
    current: 0,
    status: QUEST_STATUS.NOT_STARTED,
  },
  {
    id: 'monthly_2',
    title: 'Atteindre le niveau 4',
    description: 'Monte jusqu\'au niveau 4',
    stars: 30,
    xp: 300,
    type: QUEST_TYPES.MONTHLY,
    target: 4,
    current: 0,
    status: QUEST_STATUS.NOT_STARTED,
  },
  {
    id: 'monthly_3',
    title: 'Cumuler 100 étoiles',
    description: 'Gagne au moins 100 étoiles',
    stars: 25,
    xp: 250,
    type: QUEST_TYPES.MONTHLY,
    target: 100,
    current: 0,
    status: QUEST_STATUS.NOT_STARTED,
  },
];

/**
 * Structure par défaut des quêtes
 */
const DEFAULT_QUESTS = {
  weekly: WEEKLY_QUESTS.map(q => ({ ...q })),
  monthly: MONTHLY_QUESTS.map(q => ({ ...q })),
  lastReset: {
    weekly: null,
    monthly: null,
  },
};

/**
 * Récupère toutes les quêtes
 */
export async function getQuests() {
  try {
    const questsJson = await AsyncStorage.getItem(QUESTS_STORAGE_KEY);
    
    if (questsJson) {
      return JSON.parse(questsJson);
    }
    
    return DEFAULT_QUESTS;
  } catch (error) {
    console.error('Erreur lors de la récupération des quêtes:', error);
    return DEFAULT_QUESTS;
  }
}

/**
 * Sauvegarde les quêtes
 */
async function saveQuests(quests) {
  try {
    await AsyncStorage.setItem(QUESTS_STORAGE_KEY, JSON.stringify(quests));
    return true;
  } catch (error) {
    console.error('Erreur lors de la sauvegarde des quêtes:', error);
    return false;
  }
}

/**
 * Met à jour une quête
 */
export async function updateQuest(questId, updates) {
  try {
    const quests = await getQuests();
    
    // Chercher la quête dans weekly ou monthly
    let quest = quests.weekly.find(q => q.id === questId);
    let questType = 'weekly';
    
    if (!quest) {
      quest = quests.monthly.find(q => q.id === questId);
      questType = 'monthly';
    }
    
    if (!quest) {
      console.warn('Quête non trouvée:', questId);
      return null;
    }
    
    // Mettre à jour la quête
    const updatedQuest = {
      ...quest,
      ...updates,
    };
    
    // Mettre à jour dans le bon tableau
    const questIndex = quests[questType].findIndex(q => q.id === questId);
    quests[questType][questIndex] = updatedQuest;
    
    await saveQuests(quests);
    return updatedQuest;
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la quête:', error);
    return null;
  }
}

/**
 * Complète une quête et ajoute les récompenses
 */
export async function completeQuest(questId) {
  try {
    const quests = await getQuests();
    
    // Chercher la quête
    let quest = quests.weekly.find(q => q.id === questId);
    let questType = 'weekly';
    
    if (!quest) {
      quest = quests.monthly.find(q => q.id === questId);
      questType = 'monthly';
    }
    
    if (!quest) {
      console.warn('Quête non trouvée:', questId);
      return null;
    }
    
    // Vérifier que la quête n'est pas déjà complétée
    if (quest.status === QUEST_STATUS.COMPLETED) {
      console.warn('Quête déjà complétée:', questId);
      return quest;
    }
    
    // Marquer comme complétée
    const updatedQuest = {
      ...quest,
      status: QUEST_STATUS.COMPLETED,
      current: quest.target, // S'assurer que current = target
    };
    
    // Mettre à jour dans le tableau
    const questIndex = quests[questType].findIndex(q => q.id === questId);
    quests[questType][questIndex] = updatedQuest;
    
    await saveQuests(quests);
    
    // Ajouter les récompenses
    if (updatedQuest.stars > 0) {
      await addStars(updatedQuest.stars);
    }
    
    if (updatedQuest.xp > 0) {
      await addXP(updatedQuest.xp);
    }
    
    return updatedQuest;
  } catch (error) {
    console.error('Erreur lors de la complétion de la quête:', error);
    return null;
  }
}

/**
 * Progression d'une quête (pour les quêtes avec progression)
 */
export async function progressQuest(questId, progress = 1) {
  try {
    const quests = await getQuests();
    
    // Chercher la quête
    let quest = quests.weekly.find(q => q.id === questId);
    let questType = 'weekly';
    
    if (!quest) {
      quest = quests.monthly.find(q => q.id === questId);
      questType = 'monthly';
    }
    
    if (!quest) {
      console.warn('Quête non trouvée:', questId);
      return null;
    }
    
    // Ne pas progresser si déjà complétée
    if (quest.status === QUEST_STATUS.COMPLETED) {
      return quest;
    }
    
    // Mettre à jour la progression
    const newCurrent = Math.min(quest.current + progress, quest.target);
    const newStatus = newCurrent >= quest.target 
      ? QUEST_STATUS.COMPLETED 
      : QUEST_STATUS.IN_PROGRESS;
    
    const updatedQuest = {
      ...quest,
      current: newCurrent,
      status: newStatus,
    };
    
    // Mettre à jour dans le tableau
    const questIndex = quests[questType].findIndex(q => q.id === questId);
    quests[questType][questIndex] = updatedQuest;
    
    await saveQuests(quests);
    
    // Si complétée, ajouter les récompenses
    if (newStatus === QUEST_STATUS.COMPLETED) {
      if (updatedQuest.stars > 0) {
        await addStars(updatedQuest.stars);
      }
      
      if (updatedQuest.xp > 0) {
        await addXP(updatedQuest.xp);
      }
    }
    
    return updatedQuest;
  } catch (error) {
    console.error('Erreur lors de la progression de la quête:', error);
    return null;
  }
}

/**
 * Réinitialise les quêtes hebdomadaires
 */
export async function resetWeeklyQuests() {
  try {
    const quests = await getQuests();
    quests.weekly = WEEKLY_QUESTS.map(q => ({ ...q }));
    quests.lastReset.weekly = new Date().toISOString();
    await saveQuests(quests);
    return quests;
  } catch (error) {
    console.error('Erreur lors de la réinitialisation des quêtes hebdomadaires:', error);
    return null;
  }
}

/**
 * Réinitialise les quêtes mensuelles
 */
export async function resetMonthlyQuests() {
  try {
    const quests = await getQuests();
    quests.monthly = MONTHLY_QUESTS.map(q => ({ ...q }));
    quests.lastReset.monthly = new Date().toISOString();
    await saveQuests(quests);
    return quests;
  } catch (error) {
    console.error('Erreur lors de la réinitialisation des quêtes mensuelles:', error);
    return null;
  }
}







