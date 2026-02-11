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
 * Récompenses plafonnées : max 100 XP et 10 étoiles par quête.
 * Petites: 10–25 XP, 1–3 ★ | Moyennes: 30–60 XP, 4–6 ★ | Grosses: 80–100 XP, 8–10 ★
 */
function clampRewards(stars, xp) {
  return {
    stars: Math.min(10, Math.max(0, stars)),
    xp: Math.min(100, Math.max(0, xp)),
  };
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

  const quests = [];

  // QUÊTE 1: Temps actif quotidien — petite (10–25 XP, 1–3 ★)
  const timeTarget = getScaledTarget(10, userLevel, 0.2);
  quests.push(new Quest({
    type: QUEST_TYPES.TIME_SPENT,
    title: `Être actif ${timeTarget} minutes`,
    description: `Passe ${timeTarget} minutes actives sur l'app aujourd'hui`,
    target: timeTarget,
    progress: 0,
    status: QUEST_STATUS.ACTIVE,
    rewards: clampRewards(2, 15),
    metadata: {
      cycleType: QUEST_CYCLE_TYPES.DAILY,
      userLevel,
      generatedAt: new Date().toISOString(),
    },
  }));

  // QUÊTE 2: Compléter des modules — moyenne (30–60 XP, 4–6 ★)
  const moduleTarget = getScaledTarget(1, userLevel, 0.1);
  quests.push(new Quest({
    type: QUEST_TYPES.MODULE_COMPLETED,
    title: `Compléter ${moduleTarget} module${moduleTarget > 1 ? 's' : ''}`,
    description: `Termine ${moduleTarget} module${moduleTarget > 1 ? 's' : ''} aujourd'hui`,
    target: moduleTarget,
    progress: 0,
    status: QUEST_STATUS.ACTIVE,
    rewards: clampRewards(5, 45),
    metadata: {
      cycleType: QUEST_CYCLE_TYPES.DAILY,
      userLevel,
      generatedAt: new Date().toISOString(),
    },
  }));

  // QUÊTE 3: Gagner des étoiles — moyenne (delta depuis début du jour)
  const starsTarget = getScaledTarget(15, userLevel, 0.15);
  const totalStars = userProgress?.totalStars ?? 0;
  quests.push(new Quest({
    type: QUEST_TYPES.STAR_EARNED,
    title: `Gagner ${starsTarget} étoiles`,
    description: `Collecte ${starsTarget} étoiles aujourd'hui`,
    target: starsTarget,
    progress: 0,
    status: QUEST_STATUS.ACTIVE,
    rewards: clampRewards(5, 50),
    metadata: {
      cycleType: QUEST_CYCLE_TYPES.DAILY,
      userLevel,
      starsAtQuestStart: totalStars,
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

  const quests = [];

  // QUÊTE 1: Séries parfaites — grosse (80–100 XP, 8–10 ★)
  const perfectSeriesTarget = getScaledTarget(3, userLevel, 0.2);
  quests.push(new Quest({
    type: QUEST_TYPES.PERFECT_SERIES,
    title: `Réussir ${perfectSeriesTarget} séries parfaites`,
    description: `Complète ${perfectSeriesTarget} série${perfectSeriesTarget > 1 ? 's' : ''} sans erreur cette semaine`,
    target: perfectSeriesTarget,
    progress: 0,
    status: QUEST_STATUS.ACTIVE,
    rewards: clampRewards(9, 90),
    metadata: {
      cycleType: QUEST_CYCLE_TYPES.WEEKLY,
      userLevel,
      generatedAt: new Date().toISOString(),
    },
  }));

  // QUÊTE 2: Compléter plusieurs modules — grosse (max)
  const modulesTarget = getScaledTarget(5, userLevel, 0.15);
  quests.push(new Quest({
    type: QUEST_TYPES.MODULE_COMPLETED,
    title: `Compléter ${modulesTarget} modules`,
    description: `Termine ${modulesTarget} modules cette semaine`,
    target: modulesTarget,
    progress: 0,
    status: QUEST_STATUS.ACTIVE,
    rewards: clampRewards(10, 100),
    metadata: {
      cycleType: QUEST_CYCLE_TYPES.WEEKLY,
      userLevel,
      generatedAt: new Date().toISOString(),
    },
  }));

  // QUÊTE 3: Temps actif hebdomadaire — grosse (80–100 XP, 8–10 ★)
  const weeklyTimeTarget = getScaledTarget(60, userLevel, 0.2);
  quests.push(new Quest({
    type: QUEST_TYPES.TIME_SPENT,
    title: `Être actif ${weeklyTimeTarget} minutes`,
    description: `Accumule ${weeklyTimeTarget} minutes actives cette semaine`,
    target: weeklyTimeTarget,
    progress: 0,
    status: QUEST_STATUS.ACTIVE,
    rewards: clampRewards(8, 85),
    metadata: {
      cycleType: QUEST_CYCLE_TYPES.WEEKLY,
      userLevel,
      generatedAt: new Date().toISOString(),
    },
  }));

  // QUÊTE 4: Gagner des étoiles hebdomadaires — grosse (delta depuis début de semaine)
  const weeklyStarsTarget = getScaledTarget(100, userLevel, 0.15);
  const totalStars = userProgress?.totalStars ?? 0;
  quests.push(new Quest({
    type: QUEST_TYPES.STAR_EARNED,
    title: `Gagner ${weeklyStarsTarget} étoiles`,
    description: `Collecte ${weeklyStarsTarget} étoiles cette semaine`,
    target: weeklyStarsTarget,
    progress: 0,
    status: QUEST_STATUS.ACTIVE,
    rewards: clampRewards(10, 100),
    metadata: {
      cycleType: QUEST_CYCLE_TYPES.WEEKLY,
      userLevel,
      starsAtQuestStart: totalStars,
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

  const quests = [];

  // QUÊTE 1: Atteindre le niveau suivant — moyenne (30–60 XP, 4–6 ★)
  const nextLevel = userLevel + 1;
  quests.push(new Quest({
    type: QUEST_TYPES.LEVEL_REACHED,
    title: `Atteindre le niveau ${nextLevel}`,
    description: `Monte jusqu'au niveau ${nextLevel} pour débloquer de nouvelles récompenses`,
    target: nextLevel,
    progress: userLevel,
    status: QUEST_STATUS.ACTIVE,
    rewards: clampRewards(6, 55),
    metadata: {
      cycleType: QUEST_CYCLE_TYPES.PERFORMANCE,
      userLevel,
      targetLevel: nextLevel,
      generatedAt: new Date().toISOString(),
    },
  }));

  // QUÊTE 2: Atteindre un palier de niveau (+5) — grosse (max), gérée aussi par questEngineUnified
  const nextMilestone = Math.ceil((userLevel + 1) / 5) * 5;
  if (nextMilestone > userLevel) {
    quests.push(new Quest({
      type: QUEST_TYPES.LEVEL_REACHED,
      title: `Atteindre le niveau ${nextMilestone}`,
      description: `Atteins le niveau ${nextMilestone} pour obtenir une récompense spéciale`,
      target: nextMilestone,
      progress: userLevel,
      status: QUEST_STATUS.ACTIVE,
      rewards: clampRewards(10, 100),
      metadata: {
        cycleType: QUEST_CYCLE_TYPES.PERFORMANCE,
        userLevel,
        targetLevel: nextMilestone,
        isMilestone: true,
        generatedAt: new Date().toISOString(),
      },
    }));
  }

  // QUÊTE 3: Total de séries parfaites — grosse (80–100 XP, 8–10 ★)
  const totalPerfectTarget = getScaledTarget(10, userLevel, 0.3);
  quests.push(new Quest({
    type: QUEST_TYPES.PERFECT_SERIES,
    title: `Réussir ${totalPerfectTarget} séries parfaites au total`,
    description: `Accumule ${totalPerfectTarget} séries parfaites pour prouver ta maîtrise`,
    target: totalPerfectTarget,
    progress: 0,
    status: QUEST_STATUS.ACTIVE,
    rewards: clampRewards(8, 80),
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
