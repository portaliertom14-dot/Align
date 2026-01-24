/**
 * Générateur de quêtes adaptatif
 * Génère des quêtes adaptées au niveau de l'utilisateur
 * Types: QUOTIDIENNES, HEBDOMADAIRES, PERFORMANCE
 */

import { Quest, QUEST_STATUS, QUEST_TYPES } from './v2/questModel';
import { getUserProgress } from '../userProgressSupabase';
import { calculateLevel } from '../progression';

/**
 * Types de cycles de quêtes
 */
export const QUEST_CYCLE_TYPES = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  PERFORMANCE: 'performance',
};

/**
 * Configuration des récompenses selon le niveau
 * Les récompenses augmentent progressivement avec le niveau
 */
function getRewardMultiplier(userLevel) {
  // Augmentation progressive: +10% tous les 5 niveaux
  return 1 + Math.floor(userLevel / 5) * 0.1;
}

/**
 * Calcule l'objectif adapté au niveau
 * @param {number} baseTarget - Objectif de base
 * @param {number} userLevel - Niveau de l'utilisateur
 * @param {number} scalingFactor - Facteur d'échelle (par défaut 0.1 = +10% tous les 10 niveaux)
 * @returns {number} Objectif adapté
 */
function getScaledTarget(baseTarget, userLevel, scalingFactor = 0.1) {
  // L'objectif augmente progressivement avec le niveau
  // Formule: baseTarget * (1 + floor(userLevel / 10) * scalingFactor)
  const multiplier = 1 + Math.floor(userLevel / 10) * scalingFactor;
  return Math.ceil(baseTarget * multiplier);
}

/**
 * Génère les quêtes quotidiennes adaptées au niveau
 * Se renouvellent chaque jour
 */
export async function generateDailyQuests() {
  const userProgress = await getUserProgress();
  const userLevel = calculateLevel(userProgress?.currentXP || 0);
  const rewardMultiplier = getRewardMultiplier(userLevel);

  const quests = [];

  // QUÊTE 1: Temps actif quotidien
  // Objectif de base: 10 minutes, augmente avec le niveau
  const timeTarget = getScaledTarget(10, userLevel, 0.2); // +20% tous les 10 niveaux
  quests.push(new Quest({
    type: QUEST_TYPES.TIME_SPENT,
    title: `Être actif ${timeTarget} minutes`,
    description: `Passe ${timeTarget} minutes actives sur l'app aujourd'hui`,
    target: timeTarget,
    progress: 0,
    status: QUEST_STATUS.ACTIVE,
    rewards: {
      stars: Math.ceil(5 * rewardMultiplier),
      xp: Math.ceil(50 * rewardMultiplier),
    },
    metadata: {
      cycleType: QUEST_CYCLE_TYPES.DAILY,
      userLevel,
      generatedAt: new Date().toISOString(),
    },
  }));

  // QUÊTE 2: Compléter des modules
  // Objectif de base: 1 module, augmente tous les 20 niveaux
  const moduleTarget = getScaledTarget(1, userLevel, 0.1); // +10% tous les 10 niveaux (arrondi)
  quests.push(new Quest({
    type: QUEST_TYPES.MODULE_COMPLETED,
    title: `Compléter ${moduleTarget} module${moduleTarget > 1 ? 's' : ''}`,
    description: `Termine ${moduleTarget} module${moduleTarget > 1 ? 's' : ''} aujourd'hui`,
    target: moduleTarget,
    progress: 0,
    status: QUEST_STATUS.ACTIVE,
    rewards: {
      stars: Math.ceil(10 * rewardMultiplier),
      xp: Math.ceil(100 * rewardMultiplier),
    },
    metadata: {
      cycleType: QUEST_CYCLE_TYPES.DAILY,
      userLevel,
      generatedAt: new Date().toISOString(),
    },
  }));

  // QUÊTE 3: Gagner des étoiles
  // Objectif de base: 15 étoiles, augmente avec le niveau
  const starsTarget = getScaledTarget(15, userLevel, 0.15); // +15% tous les 10 niveaux
  quests.push(new Quest({
    type: QUEST_TYPES.STAR_EARNED,
    title: `Gagner ${starsTarget} étoiles`,
    description: `Collecte ${starsTarget} étoiles aujourd'hui`,
    target: starsTarget,
    progress: 0,
    status: QUEST_STATUS.ACTIVE,
    rewards: {
      stars: Math.ceil(8 * rewardMultiplier),
      xp: Math.ceil(80 * rewardMultiplier),
    },
    metadata: {
      cycleType: QUEST_CYCLE_TYPES.DAILY,
      userLevel,
      generatedAt: new Date().toISOString(),
    },
  }));

  return quests;
}

/**
 * Génère les quêtes hebdomadaires adaptées au niveau
 * Se renouvellent quand toutes sont complétées
 */
export async function generateWeeklyQuests() {
  const userProgress = await getUserProgress();
  const userLevel = calculateLevel(userProgress?.currentXP || 0);
  const rewardMultiplier = getRewardMultiplier(userLevel);

  const quests = [];

  // QUÊTE 1: Séries parfaites
  // Objectif de base: 3 séries parfaites, augmente avec le niveau
  const perfectSeriesTarget = getScaledTarget(3, userLevel, 0.2); // +20% tous les 10 niveaux
  quests.push(new Quest({
    type: QUEST_TYPES.PERFECT_SERIES,
    title: `Réussir ${perfectSeriesTarget} séries parfaites`,
    description: `Complète ${perfectSeriesTarget} série${perfectSeriesTarget > 1 ? 's' : ''} sans erreur cette semaine`,
    target: perfectSeriesTarget,
    progress: 0,
    status: QUEST_STATUS.ACTIVE,
    rewards: {
      stars: Math.ceil(30 * rewardMultiplier),
      xp: Math.ceil(300 * rewardMultiplier),
    },
    metadata: {
      cycleType: QUEST_CYCLE_TYPES.WEEKLY,
      userLevel,
      generatedAt: new Date().toISOString(),
    },
  }));

  // QUÊTE 2: Compléter plusieurs modules
  // Objectif de base: 5 modules, augmente avec le niveau
  const modulesTarget = getScaledTarget(5, userLevel, 0.15); // +15% tous les 10 niveaux
  quests.push(new Quest({
    type: QUEST_TYPES.MODULE_COMPLETED,
    title: `Compléter ${modulesTarget} modules`,
    description: `Termine ${modulesTarget} modules cette semaine`,
    target: modulesTarget,
    progress: 0,
    status: QUEST_STATUS.ACTIVE,
    rewards: {
      stars: Math.ceil(25 * rewardMultiplier),
      xp: Math.ceil(250 * rewardMultiplier),
    },
    metadata: {
      cycleType: QUEST_CYCLE_TYPES.WEEKLY,
      userLevel,
      generatedAt: new Date().toISOString(),
    },
  }));

  // QUÊTE 3: Temps actif hebdomadaire
  // Objectif de base: 60 minutes (1h), augmente avec le niveau
  const weeklyTimeTarget = getScaledTarget(60, userLevel, 0.2); // +20% tous les 10 niveaux
  quests.push(new Quest({
    type: QUEST_TYPES.TIME_SPENT,
    title: `Être actif ${weeklyTimeTarget} minutes`,
    description: `Accumule ${weeklyTimeTarget} minutes actives cette semaine`,
    target: weeklyTimeTarget,
    progress: 0,
    status: QUEST_STATUS.ACTIVE,
    rewards: {
      stars: Math.ceil(35 * rewardMultiplier),
      xp: Math.ceil(350 * rewardMultiplier),
    },
    metadata: {
      cycleType: QUEST_CYCLE_TYPES.WEEKLY,
      userLevel,
      generatedAt: new Date().toISOString(),
    },
  }));

  // QUÊTE 4: Gagner des étoiles hebdomadaires
  // Objectif de base: 100 étoiles, augmente avec le niveau
  const weeklyStarsTarget = getScaledTarget(100, userLevel, 0.15); // +15% tous les 10 niveaux
  quests.push(new Quest({
    type: QUEST_TYPES.STAR_EARNED,
    title: `Gagner ${weeklyStarsTarget} étoiles`,
    description: `Collecte ${weeklyStarsTarget} étoiles cette semaine`,
    target: weeklyStarsTarget,
    progress: 0,
    status: QUEST_STATUS.ACTIVE,
    rewards: {
      stars: Math.ceil(40 * rewardMultiplier),
      xp: Math.ceil(400 * rewardMultiplier),
    },
    metadata: {
      cycleType: QUEST_CYCLE_TYPES.WEEKLY,
      userLevel,
      generatedAt: new Date().toISOString(),
    },
  }));

  return quests;
}

/**
 * Génère les quêtes de performance adaptées au niveau
 * Objectifs long-terme qui ne se renouvellent pas
 */
export async function generatePerformanceQuests() {
  const userProgress = await getUserProgress();
  const currentXP = userProgress?.currentXP || 0;
  const userLevel = calculateLevel(currentXP);
  const rewardMultiplier = getRewardMultiplier(userLevel);

  const quests = [];

  // QUÊTE 1: Atteindre le niveau suivant
  const nextLevel = userLevel + 1;
  quests.push(new Quest({
    type: QUEST_TYPES.LEVEL_REACHED,
    title: `Atteindre le niveau ${nextLevel}`,
    description: `Monte jusqu'au niveau ${nextLevel} pour débloquer de nouvelles récompenses`,
    target: nextLevel,
    progress: userLevel, // La progression commence au niveau actuel
    status: QUEST_STATUS.ACTIVE,
    rewards: {
      stars: Math.ceil(50 * rewardMultiplier),
      xp: Math.ceil(500 * rewardMultiplier),
    },
    metadata: {
      cycleType: QUEST_CYCLE_TYPES.PERFORMANCE,
      userLevel,
      targetLevel: nextLevel,
      generatedAt: new Date().toISOString(),
    },
  }));

  // QUÊTE 2: Atteindre un palier de niveau (+5)
  // Se débloque tous les 5 niveaux
  const nextMilestone = Math.ceil((userLevel + 1) / 5) * 5;
  if (nextMilestone > userLevel) {
    quests.push(new Quest({
      type: QUEST_TYPES.LEVEL_REACHED,
      title: `Atteindre le niveau ${nextMilestone}`,
      description: `Atteins le niveau ${nextMilestone} pour obtenir une récompense spéciale`,
      target: nextMilestone,
      progress: userLevel,
      status: QUEST_STATUS.ACTIVE,
      rewards: {
        stars: Math.ceil(100 * rewardMultiplier),
        xp: Math.ceil(1000 * rewardMultiplier),
      },
      metadata: {
        cycleType: QUEST_CYCLE_TYPES.PERFORMANCE,
        userLevel,
        targetLevel: nextMilestone,
        isMilestone: true,
        generatedAt: new Date().toISOString(),
      },
    }));
  }

  // QUÊTE 3: Total de séries parfaites (objectif long-terme)
  // Objectif de base: 10 séries parfaites, augmente avec le niveau
  const totalPerfectTarget = getScaledTarget(10, userLevel, 0.3); // +30% tous les 10 niveaux
  quests.push(new Quest({
    type: QUEST_TYPES.PERFECT_SERIES,
    title: `Réussir ${totalPerfectTarget} séries parfaites au total`,
    description: `Accumule ${totalPerfectTarget} séries parfaites pour prouver ta maîtrise`,
    target: totalPerfectTarget,
    progress: 0,
    status: QUEST_STATUS.ACTIVE,
    rewards: {
      stars: Math.ceil(80 * rewardMultiplier),
      xp: Math.ceil(800 * rewardMultiplier),
    },
    metadata: {
      cycleType: QUEST_CYCLE_TYPES.PERFORMANCE,
      userLevel,
      isLongTerm: true,
      generatedAt: new Date().toISOString(),
    },
  }));

  return quests;
}

/**
 * Génère toutes les quêtes (initialisation)
 */
export async function generateAllQuests() {
  const [daily, weekly, performance] = await Promise.all([
    generateDailyQuests(),
    generateWeeklyQuests(),
    generatePerformanceQuests(),
  ]);

  return {
    daily,
    weekly,
    performance,
  };
}

/**
 * Vérifie si les quêtes doivent être régénérées
 * (par exemple si le niveau a beaucoup changé)
 */
export function shouldRegenerateQuests(quests, currentLevel) {
  if (!quests || quests.length === 0) {
    return true;
  }

  // Vérifier le niveau utilisé lors de la génération
  const firstQuest = quests[0];
  const generatedLevel = firstQuest?.metadata?.userLevel || 0;

  // Régénérer si l'écart de niveau est > 10
  return Math.abs(currentLevel - generatedLevel) > 10;
}
