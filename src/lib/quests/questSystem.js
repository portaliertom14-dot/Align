/**
 * Système de quêtes complet et scalable
 * Gère les quêtes quotidiennes, hebdomadaires et performance
 * Adaptation automatique au niveau utilisateur
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserProgress } from '../userProgressSupabase';
import { calculateLevel } from '../progression';
import { getActiveTimeMinutes } from './activityTracker';
import { getTotalSeriesCompleted, getPerfectSeriesCompleted } from './seriesTracker';
import { addXP, addStars } from '../userProgressSupabase';

const QUESTS_SYSTEM_STORAGE_KEY = '@align_quests_system';

/**
 * Types de quêtes
 */
export const QUEST_SYSTEM_TYPES = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  PERFORMANCE: 'performance',
};

/**
 * Statuts des quêtes
 */
export const QUEST_SYSTEM_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  LOCKED: 'locked',
};

/**
 * Catégories de quêtes basées sur les métriques
 */
export const QUEST_CATEGORIES = {
  TIME_SPENT: 'time_spent',
  MODULES_COMPLETED: 'modules_completed',
  PERFECT_SERIES: 'perfect_series',
  REGULARITY: 'regularity',
  LEVEL_REACHED: 'level_reached',
};

/**
 * Structure d'une quête
 */
export class QuestSystemQuest {
  constructor(data) {
    this.id = data.id || `quest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.type = data.type; // daily, weekly, performance
    this.category = data.category; // time_spent, modules_completed, etc.
    this.title = data.title;
    this.description = data.description;
    this.target = data.target; // Objectif numérique
    this.progress = data.progress || 0;
    this.status = data.status || QUEST_SYSTEM_STATUS.ACTIVE;
    this.rewards = data.rewards || { stars: 0, xp: 0 };
    this.createdAt = data.createdAt || new Date().toISOString();
    this.completedAt = data.completedAt || null;
    this.metadata = data.metadata || {}; // Données supplémentaires
    this.cycleId = data.cycleId || null; // ID du cycle (pour renouvellement)
  }

  /**
   * Vérifie si la quête est complétée
   */
  isCompleted() {
    return this.status === QUEST_SYSTEM_STATUS.COMPLETED || this.progress >= this.target;
  }

  /**
   * Met à jour la progression
   */
  updateProgress(amount) {
    if (this.isCompleted()) {
      return false;
    }

    const previousProgress = this.progress;
    this.progress = Math.min(this.progress + amount, this.target);

    const wasCompleted = this.isCompleted();
    if (wasCompleted && previousProgress < this.target) {
      this.status = QUEST_SYSTEM_STATUS.COMPLETED;
      this.completedAt = new Date().toISOString();
      return true;
    }

    return false;
  }

  /**
   * Convertit en JSON
   */
  toJSON() {
    return {
      id: this.id,
      type: this.type,
      category: this.category,
      title: this.title,
      description: this.description,
      target: this.target,
      progress: this.progress,
      status: this.status,
      rewards: this.rewards,
      createdAt: this.createdAt,
      completedAt: this.completedAt,
      metadata: this.metadata,
      cycleId: this.cycleId,
    };
  }

  /**
   * Crée depuis JSON
   */
  static fromJSON(data) {
    return new QuestSystemQuest(data);
  }
}

/**
 * Structure du système de quêtes
 */
class QuestSystem {
  constructor(data) {
    this.userId = data.userId || null;
    this.dailyQuests = (data.dailyQuests || []).map(q => QuestSystemQuest.fromJSON(q));
    this.weeklyQuests = (data.weeklyQuests || []).map(q => QuestSystemQuest.fromJSON(q));
    this.performanceQuests = (data.performanceQuests || []).map(q => QuestSystemQuest.fromJSON(q));
    this.dailyCycleId = data.dailyCycleId || null;
    this.weeklyCycleId = data.weeklyCycleId || null;
    this.lastDailyReset = data.lastDailyReset || null;
    this.lastWeeklyReset = data.lastWeeklyReset || null;
    this.completedQuestsInSession = data.completedQuestsInSession || [];
  }

  /**
   * Récupère toutes les quêtes actives
   */
  getActiveQuests() {
    return [
      ...this.dailyQuests.filter(q => q.status === QUEST_SYSTEM_STATUS.ACTIVE),
      ...this.weeklyQuests.filter(q => q.status === QUEST_SYSTEM_STATUS.ACTIVE),
      ...this.performanceQuests.filter(q => q.status === QUEST_SYSTEM_STATUS.ACTIVE),
    ];
  }

  /**
   * Récupère les quêtes complétées dans cette session
   */
  getCompletedQuestsInSession() {
    return [...this.completedQuestsInSession];
  }

  /**
   * Vérifie si toutes les quêtes hebdomadaires sont complétées
   */
  areAllWeeklyQuestsCompleted() {
    return this.weeklyQuests.length > 0 && 
           this.weeklyQuests.every(q => q.isCompleted());
  }

  /**
   * Convertit en JSON
   */
  toJSON() {
    return {
      userId: this.userId,
      dailyQuests: this.dailyQuests.map(q => q.toJSON()),
      weeklyQuests: this.weeklyQuests.map(q => q.toJSON()),
      performanceQuests: this.performanceQuests.map(q => q.toJSON()),
      dailyCycleId: this.dailyCycleId,
      weeklyCycleId: this.weeklyCycleId,
      lastDailyReset: this.lastDailyReset,
      lastWeeklyReset: this.lastWeeklyReset,
      completedQuestsInSession: this.completedQuestsInSession.map(q => q.toJSON()),
    };
  }

  /**
   * Crée depuis JSON
   */
  static fromJSON(data) {
    return new QuestSystem(data);
  }
}

/**
 * Récupère le système de quêtes
 */
export async function getQuestSystem() {
  try {
    const { getCurrentUser } = require('../services/auth');
    const currentUser = await getCurrentUser();
    const currentUserId = currentUser?.id || null;

    if (!currentUserId) {
      return null;
    }

    const dataJson = await AsyncStorage.getItem(QUESTS_SYSTEM_STORAGE_KEY);
    
    if (dataJson) {
      const data = JSON.parse(dataJson);
      
      // Vérifier que les quêtes correspondent à l'utilisateur actuel
      if (data.userId !== currentUserId) {
        // Utilisateur différent, créer un nouveau système
        return await initializeQuestSystem(currentUserId);
      }
      
      return QuestSystem.fromJSON(data);
    }
    
    return await initializeQuestSystem(currentUserId);
  } catch (error) {
    console.error('[QuestSystem] Erreur lors de la récupération:', error);
    return null;
  }
}

/**
 * Sauvegarde le système de quêtes
 */
async function saveQuestSystem(system) {
  try {
    await AsyncStorage.setItem(QUESTS_SYSTEM_STORAGE_KEY, JSON.stringify(system.toJSON()));
    return true;
  } catch (error) {
    console.error('[QuestSystem] Erreur lors de la sauvegarde:', error);
    return false;
  }
}

/**
 * Initialise le système de quêtes pour un utilisateur
 */
async function initializeQuestSystem(userId) {
  const userProgress = await getUserProgress();
  const userLevel = calculateLevel(userProgress?.currentXP || 0);
  
  const dailyQuests = await generateDailyQuests(userLevel);
  const weeklyQuests = await generateWeeklyQuests(userLevel);
  const performanceQuests = await generatePerformanceQuests(userLevel);
  
  const dailyCycleId = `daily_${Date.now()}`;
  const weeklyCycleId = `weekly_${Date.now()}`;
  
  const system = new QuestSystem({
    userId,
    dailyQuests,
    weeklyQuests,
    performanceQuests,
    dailyCycleId,
    weeklyCycleId,
    lastDailyReset: new Date().toISOString(),
    lastWeeklyReset: new Date().toISOString(),
  });
  
  await saveQuestSystem(system);
  return system;
}

/**
 * Génère des quêtes quotidiennes adaptées au niveau
 */
async function generateDailyQuests(userLevel) {
  const baseMultiplier = Math.max(1, Math.floor(userLevel / 10) + 1);
  
  const timeSpentQuest = new QuestSystemQuest({
    type: QUEST_SYSTEM_TYPES.DAILY,
    category: QUEST_CATEGORIES.TIME_SPENT,
    title: `Passer ${10 * baseMultiplier} minutes actives`,
    description: `Reste actif pendant ${10 * baseMultiplier} minutes aujourd'hui`,
    target: 10 * baseMultiplier,
    progress: 0,
    rewards: { stars: 3 * baseMultiplier, xp: 30 * baseMultiplier },
    metadata: { baseMultiplier },
  });
  
  const modulesQuest = new QuestSystemQuest({
    type: QUEST_SYSTEM_TYPES.DAILY,
    category: QUEST_CATEGORIES.MODULES_COMPLETED,
    title: `Compléter ${Math.max(1, Math.floor(baseMultiplier / 2))} module${Math.max(1, Math.floor(baseMultiplier / 2)) > 1 ? 's' : ''}`,
    description: `Termine ${Math.max(1, Math.floor(baseMultiplier / 2))} module${Math.max(1, Math.floor(baseMultiplier / 2)) > 1 ? 's' : ''} aujourd'hui`,
    target: Math.max(1, Math.floor(baseMultiplier / 2)),
    progress: 0,
    rewards: { stars: 5 * baseMultiplier, xp: 50 * baseMultiplier },
    metadata: { baseMultiplier },
  });
  
  return [timeSpentQuest, modulesQuest];
}

/**
 * Génère des quêtes hebdomadaires adaptées au niveau
 */
async function generateWeeklyQuests(userLevel) {
  const baseMultiplier = Math.max(1, Math.floor(userLevel / 5) + 1);
  
  const perfectSeriesQuest = new QuestSystemQuest({
    type: QUEST_SYSTEM_TYPES.WEEKLY,
    category: QUEST_CATEGORIES.PERFECT_SERIES,
    title: `Réussir ${3 * baseMultiplier} séries parfaites`,
    description: `Complète ${3 * baseMultiplier} séries sans erreur cette semaine`,
    target: 3 * baseMultiplier,
    progress: 0,
    rewards: { stars: 15 * baseMultiplier, xp: 150 * baseMultiplier },
    metadata: { baseMultiplier },
  });
  
  const totalSeriesQuest = new QuestSystemQuest({
    type: QUEST_SYSTEM_TYPES.WEEKLY,
    category: QUEST_CATEGORIES.MODULES_COMPLETED,
    title: `Compléter ${5 * baseMultiplier} séries`,
    description: `Termine ${5 * baseMultiplier} séries cette semaine`,
    target: 5 * baseMultiplier,
    progress: 0,
    rewards: { stars: 10 * baseMultiplier, xp: 100 * baseMultiplier },
    metadata: { baseMultiplier },
  });
  
  const regularityQuest = new QuestSystemQuest({
    type: QUEST_SYSTEM_TYPES.WEEKLY,
    category: QUEST_CATEGORIES.REGULARITY,
    title: `Être actif ${Math.min(7, 3 + baseMultiplier)} jours`,
    description: `Connecte-toi ${Math.min(7, 3 + baseMultiplier)} jours cette semaine`,
    target: Math.min(7, 3 + baseMultiplier),
    progress: 0,
    rewards: { stars: 20 * baseMultiplier, xp: 200 * baseMultiplier },
    metadata: { baseMultiplier },
  });
  
  return [perfectSeriesQuest, totalSeriesQuest, regularityQuest];
}

/**
 * Génère des quêtes performance adaptées au niveau
 */
async function generatePerformanceQuests(userLevel) {
  const nextLevelTarget = userLevel + 1;
  const levelQuest = new QuestSystemQuest({
    type: QUEST_SYSTEM_TYPES.PERFORMANCE,
    category: QUEST_CATEGORIES.LEVEL_REACHED,
    title: `Atteindre le niveau ${nextLevelTarget}`,
    description: `Monte jusqu'au niveau ${nextLevelTarget}`,
    target: nextLevelTarget,
    progress: userLevel,
    rewards: { stars: 25, xp: 250 },
    metadata: { targetLevel: nextLevelTarget },
  });
  
  return [levelQuest];
}

/**
 * Met à jour la progression d'une quête par catégorie
 */
export async function updateQuestProgress(category, amount, metadata = {}) {
  const system = await getQuestSystem();
  if (!system) return [];
  
  const newlyCompleted = [];
  
  const allQuests = [
    ...system.dailyQuests,
    ...system.weeklyQuests,
    ...system.performanceQuests,
  ];
  
  for (const quest of allQuests) {
    if (quest.category === category && quest.status === QUEST_SYSTEM_STATUS.ACTIVE) {
      const wasCompleted = quest.updateProgress(amount);
      
      if (wasCompleted) {
        newlyCompleted.push(quest);
        system.completedQuestsInSession.push(quest);
        
        // Ajouter les récompenses
        if (quest.rewards.stars > 0) {
          await addStars(quest.rewards.stars);
        }
        if (quest.rewards.xp > 0) {
          await addXP(quest.rewards.xp);
        }
      }
    }
  }
  
  await saveQuestSystem(system);
  return newlyCompleted;
}

/**
 * Vérifie et renouvelle les quêtes quotidiennes si nécessaire
 */
export async function checkAndRenewDailyQuests() {
  const system = await getQuestSystem();
  if (!system) return;
  
  const now = new Date();
  const lastReset = system.lastDailyReset ? new Date(system.lastDailyReset) : null;
  
  // Vérifier si un nouveau jour a commencé
  const shouldReset = !lastReset || 
    now.getDate() !== lastReset.getDate() ||
    now.getMonth() !== lastReset.getMonth() ||
    now.getFullYear() !== lastReset.getFullYear();
  
  if (shouldReset) {
    const userProgress = await getUserProgress();
    const userLevel = calculateLevel(userProgress?.currentXP || 0);
    
    system.dailyQuests = await generateDailyQuests(userLevel);
    system.dailyCycleId = `daily_${Date.now()}`;
    system.lastDailyReset = now.toISOString();
    
    await saveQuestSystem(system);
  }
}

/**
 * Vérifie et renouvelle les quêtes hebdomadaires si toutes sont complétées
 */
export async function checkAndRenewWeeklyQuests() {
  const system = await getQuestSystem();
  if (!system) return;
  
  if (system.areAllWeeklyQuestsCompleted()) {
    const userProgress = await getUserProgress();
    const userLevel = calculateLevel(userProgress?.currentXP || 0);
    
    system.weeklyQuests = await generateWeeklyQuests(userLevel);
    system.weeklyCycleId = `weekly_${Date.now()}`;
    system.lastWeeklyReset = new Date().toISOString();
    
    await saveQuestSystem(system);
  }
}

/**
 * Met à jour les quêtes performance selon le niveau actuel
 */
export async function updatePerformanceQuests() {
  const system = await getQuestSystem();
  if (!system) return;
  
  const userProgress = await getUserProgress();
  const userLevel = calculateLevel(userProgress?.currentXP || 0);
  
  for (const quest of system.performanceQuests) {
    if (quest.category === QUEST_CATEGORIES.LEVEL_REACHED && 
        quest.status === QUEST_SYSTEM_STATUS.ACTIVE) {
      const wasCompleted = quest.updateProgress(userLevel - quest.progress);
      
      if (wasCompleted) {
        system.completedQuestsInSession.push(quest);
        // Pas de récompense ici: évaluation au chargement; récompense uniquement au claim (écran récompense)
        
        // Générer une nouvelle quête de niveau
        const nextLevelTarget = userLevel + 1;
        const newLevelQuest = new QuestSystemQuest({
          type: QUEST_SYSTEM_TYPES.PERFORMANCE,
          category: QUEST_CATEGORIES.LEVEL_REACHED,
          title: `Atteindre le niveau ${nextLevelTarget}`,
          description: `Monte jusqu'au niveau ${nextLevelTarget}`,
          target: nextLevelTarget,
          progress: userLevel,
          rewards: { stars: 25, xp: 250 },
          metadata: { targetLevel: nextLevelTarget },
        });
        
        const questIndex = system.performanceQuests.findIndex(q => q.id === quest.id);
        if (questIndex !== -1) {
          system.performanceQuests[questIndex] = newLevelQuest;
        }
      }
    }
  }
  
  await saveQuestSystem(system);
}

/**
 * Récupère les quêtes complétées dans cette session
 */
export async function getCompletedQuestsInSession() {
  const system = await getQuestSystem();
  if (!system) return [];
  
  return system.getCompletedQuestsInSession();
}

/**
 * Réinitialise la liste des quêtes complétées dans cette session
 */
export async function clearCompletedQuestsInSession() {
  const system = await getQuestSystem();
  if (!system) return;
  
  system.completedQuestsInSession = [];
  await saveQuestSystem(system);
}

/**
 * Récupère toutes les quêtes actives
 */
export async function getActiveQuests() {
  const system = await getQuestSystem();
  if (!system) return [];
  
  await checkAndRenewDailyQuests();
  await checkAndRenewWeeklyQuests();
  await updatePerformanceQuests();
  
  return system.getActiveQuests();
}

/**
 * Récupère toutes les quêtes par type
 */
export async function getQuestsByType(type) {
  const system = await getQuestSystem();
  if (!system) return [];
  
  await checkAndRenewDailyQuests();
  await checkAndRenewWeeklyQuests();
  await updatePerformanceQuests();
  
  switch (type) {
    case QUEST_SYSTEM_TYPES.DAILY:
      return system.dailyQuests;
    case QUEST_SYSTEM_TYPES.WEEKLY:
      return system.weeklyQuests;
    case QUEST_SYSTEM_TYPES.PERFORMANCE:
      return system.performanceQuests;
    default:
      return [];
  }
}
