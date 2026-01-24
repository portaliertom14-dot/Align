/**
 * Générateur de quêtes personnalisées V2
 * Génère des quêtes dynamiques basées sur le profil utilisateur
 * Garantit l'exclusion entre quêtes hebdomadaires et mensuelles
 */

import { Quest, QUEST_STATUS, QUEST_TYPES } from './questModel';
import { QuestSection } from './questModel';
import { getUserProgress } from '../../userProgressSupabase';
import { loadQuests } from './storage';

/**
 * Types de quêtes supportés pour la personnalisation
 */
export const PERSONALIZED_QUEST_TYPES = {
  LEVEL: 'LEVEL',
  MODULE: 'MODULE',
  TIME_SPENT: 'TIME_SPENT',
};

/**
 * Scopes de quêtes
 */
export const QUEST_SCOPES = {
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY',
};

/**
 * Profil utilisateur pour la génération de quêtes
 */
class UserProfile {
  constructor(data) {
    this.level = data.level || 0;
    this.totalModulesCompleted = data.totalModulesCompleted || 0;
    this.totalTimeSpentMinutes = data.totalTimeSpentMinutes || 0;
  }
}

/**
 * Récupère le profil utilisateur depuis la progression
 * CRITICAL: Utilise les valeurs réelles de la progression utilisateur
 * Pour les modules et le temps, on utilise les valeurs depuis les quêtes actives
 * Si une quête personnalisée existe, on utilise startValue + progress pour calculer le total
 * @param {Array} sections - Sections de quêtes existantes (passées en paramètre pour éviter le cycle de dépendances)
 */
async function getUserProfile(sections = []) {
  try {
    const progress = await getUserProgress();
    
    // Initialiser avec des valeurs par défaut
    let totalTimeSpent = 0;
    let totalModules = 0;
    
    // Parcourir les sections pour trouver les valeurs réelles depuis les quêtes personnalisées
    for (const section of sections) {
      for (const quest of section.quests) {
        // Si la quête a des métadonnées personnalisées, utiliser startValue + progress
        if (quest.metadata?.personalizedType) {
          const startValue = quest.metadata.startValue || 0;
          const currentValue = startValue + quest.progress;
          
          if (quest.metadata.personalizedType === PERSONALIZED_QUEST_TYPES.TIME_SPENT) {
            totalTimeSpent = Math.max(totalTimeSpent, currentValue);
          } else if (quest.metadata.personalizedType === PERSONALIZED_QUEST_TYPES.MODULE) {
            totalModules = Math.max(totalModules, currentValue);
          }
        } else {
          // Fallback : utiliser progress directement pour les quêtes non personnalisées
          if (quest.type === QUEST_TYPES.TIME_SPENT && quest.status === QUEST_STATUS.ACTIVE) {
            totalTimeSpent = Math.max(totalTimeSpent, quest.progress);
          } else if ((quest.type === QUEST_TYPES.LESSON_COMPLETED || quest.type === QUEST_TYPES.MODULE_COMPLETED) && quest.status === QUEST_STATUS.ACTIVE) {
            totalModules = Math.max(totalModules, quest.progress);
          }
        }
      }
    }
    
    const userProfile = new UserProfile({
      level: progress.currentLevel || 0,
      totalModulesCompleted: totalModules || 0,
      totalTimeSpentMinutes: totalTimeSpent || 0,
    });

    return userProfile;
  } catch (error) {
    console.error('[PersonalizedGenerator] Erreur lors de la récupération du profil:', error);
    return new UserProfile({});
  }
}

/**
 * Génère une quête de niveau personnalisée
 */
function generateLevelQuest(userProfile, scope) {
  const currentLevel = userProfile.level;
  
  // Calculer l'objectif selon le niveau actuel
  let targetIncrement;
  if (currentLevel < 5) {
    targetIncrement = 2 + Math.floor(Math.random() * 3); // +2 à +4
  } else if (currentLevel < 20) {
    targetIncrement = 5 + Math.floor(Math.random() * 6); // +5 à +10
  } else if (currentLevel < 50) {
    targetIncrement = 10 + Math.floor(Math.random() * 6); // +10 à +15
  } else {
    targetIncrement = 10 + Math.floor(Math.random() * 11); // +10 à +20
  }
  
  const targetLevel = Math.min(currentLevel + targetIncrement, 1000); // Cap à 1000
  
  // Vérifier que l'objectif est supérieur au niveau actuel
  if (targetLevel <= currentLevel) {
    return null; // Quête invalide
  }
  
  // Calculer les récompenses selon la difficulté
  const difficulty = targetLevel - currentLevel;
  const stars = Math.floor(difficulty * 2);
  const xp = Math.floor(difficulty * 10);
  
  return {
    type: PERSONALIZED_QUEST_TYPES.LEVEL,
    title: `Atteindre le niveau ${targetLevel}`,
    description: `Monte jusqu'au niveau ${targetLevel}`,
    startValue: currentLevel,
    targetValue: targetLevel,
    progress: currentLevel,
    rewards: { stars, xp },
  };
}

/**
 * Génère une quête de modules personnalisée
 */
function generateModuleQuest(userProfile, scope) {
  const currentModules = userProfile.totalModulesCompleted;
  
  // Calculer l'incrément selon le nombre de modules déjà complétés
  let increment;
  if (currentModules < 5) {
    increment = 3 + Math.floor(Math.random() * 3); // +3 à +5
  } else if (currentModules < 20) {
    increment = 5 + Math.floor(Math.random() * 6); // +5 à +10
  } else if (currentModules < 40) {
    increment = 10 + Math.floor(Math.random() * 6); // +10 à +15
  } else {
    increment = 15 + Math.floor(Math.random() * 11); // +15 à +25
  }
  
  const targetModules = currentModules + increment;
  
  // Vérifier que l'objectif est supérieur au nombre actuel
  if (targetModules <= currentModules) {
    return null; // Quête invalide
  }
  
  // Calculer les récompenses
  const stars = Math.floor(increment * 2);
  const xp = Math.floor(increment * 10);
  
  return {
    type: PERSONALIZED_QUEST_TYPES.MODULE,
    title: `Compléter ${targetModules} modules`,
    description: `Termine ${targetModules} modules complets`,
    startValue: currentModules,
    targetValue: targetModules,
    progress: currentModules,
    rewards: { stars, xp },
  };
}

/**
 * Génère une quête de temps personnalisée
 */
function generateTimeQuest(userProfile, scope) {
  const currentTime = userProfile.totalTimeSpentMinutes;
  
  // Calculer l'incrément selon le temps déjà passé
  let increment;
  if (currentTime < 60) {
    increment = 15 + Math.floor(Math.random() * 16); // +15 à +30 min
  } else if (currentTime < 300) {
    increment = 30 + Math.floor(Math.random() * 31); // +30 à +60 min
  } else if (currentTime < 600) {
    increment = 60 + Math.floor(Math.random() * 61); // +60 à +120 min
  } else {
    increment = 120 + Math.floor(Math.random() * 121); // +120 à +240 min
  }
  
  const targetTime = currentTime + increment;
  
  // Vérifier que l'objectif est supérieur au temps actuel
  if (targetTime <= currentTime) {
    return null; // Quête invalide
  }
  
  // Calculer les récompenses
  const stars = Math.floor(increment / 10); // 1 étoile par 10 minutes
  const xp = Math.floor(increment * 2); // 2 XP par minute
  
  return {
    type: PERSONALIZED_QUEST_TYPES.TIME_SPENT,
    title: `Apprendre pendant ${increment} minutes`,
    description: `Passe ${increment} minutes supplémentaires à apprendre`,
    startValue: currentTime,
    targetValue: targetTime,
    progress: currentTime,
    rewards: { stars, xp },
  };
}

/**
 * Récupère les types de quêtes utilisés dans l'autre scope
 */
function getUsedTypesInOtherScope(scope, sections) {
  const otherScope = scope === QUEST_SCOPES.WEEKLY ? QUEST_SCOPES.MONTHLY : QUEST_SCOPES.WEEKLY;
  const otherScopeType = otherScope === QUEST_SCOPES.WEEKLY ? 'weekly' : 'monthly';
  
  const otherSection = sections.find(s => s.type === otherScopeType);
  if (!otherSection) {
    return new Set();
  }
  
  const usedTypes = new Set();
  for (const quest of otherSection.quests) {
    if (quest.status === QUEST_STATUS.ACTIVE) {
      // Mapper le type de quête vers le type personnalisé
      if (quest.type === QUEST_TYPES.LEVEL_REACHED) {
        usedTypes.add(PERSONALIZED_QUEST_TYPES.LEVEL);
      } else if (quest.type === QUEST_TYPES.LESSON_COMPLETED || quest.type === QUEST_TYPES.MODULE_COMPLETED) {
        usedTypes.add(PERSONALIZED_QUEST_TYPES.MODULE);
      } else if (quest.type === QUEST_TYPES.TIME_SPENT) {
        usedTypes.add(PERSONALIZED_QUEST_TYPES.TIME_SPENT);
      }
    }
  }
  
  return usedTypes;
}

/**
 * Génère une section de quêtes personnalisées
 * @param {string} scope - WEEKLY ou MONTHLY
 * @param {Array} existingSections - Sections de quêtes existantes (passées en paramètre pour éviter le cycle de dépendances)
 * @returns {Promise<QuestSection>}
 */
export async function generatePersonalizedSection(scope, existingSections = []) {
  try {
    // Récupérer le profil utilisateur (en passant les sections existantes)
    const userProfile = await getUserProfile(existingSections);
    
    // Utiliser les sections existantes pour l'exclusion
    const usedTypes = getUsedTypesInOtherScope(scope, existingSections);
    
    // Types disponibles (exclure ceux déjà utilisés dans l'autre scope)
    const availableTypes = Object.values(PERSONALIZED_QUEST_TYPES).filter(
      type => !usedTypes.has(type)
    );
    
    // Si aucun type disponible, utiliser tous les types (fallback)
    const typesToUse = availableTypes.length > 0 ? availableTypes : Object.values(PERSONALIZED_QUEST_TYPES);
    
    // Générer 3 quêtes (une par type disponible, ou répéter si nécessaire)
    const quests = [];
    const generators = {
      [PERSONALIZED_QUEST_TYPES.LEVEL]: generateLevelQuest,
      [PERSONALIZED_QUEST_TYPES.MODULE]: generateModuleQuest,
      [PERSONALIZED_QUEST_TYPES.TIME_SPENT]: generateTimeQuest,
    };
    
    // Sélectionner 3 types différents si possible
    const selectedTypes = [];
    for (let i = 0; i < 3; i++) {
      const type = typesToUse[i % typesToUse.length];
      if (!selectedTypes.includes(type)) {
        selectedTypes.push(type);
      } else {
        // Si on a déjà utilisé tous les types, réutiliser le premier disponible
        selectedTypes.push(typesToUse[0]);
      }
    }
    
    // Générer les quêtes
    for (const type of selectedTypes) {
      const generator = generators[type];
      if (generator) {
        const questData = generator(userProfile, scope);
        if (questData && questData.targetValue > questData.startValue) {
          // Mapper le type personnalisé vers le type de quête V2
          let questType;
          if (type === PERSONALIZED_QUEST_TYPES.LEVEL) {
            questType = QUEST_TYPES.LEVEL_REACHED;
          } else if (type === PERSONALIZED_QUEST_TYPES.MODULE) {
            questType = QUEST_TYPES.LESSON_COMPLETED;
          } else if (type === PERSONALIZED_QUEST_TYPES.TIME_SPENT) {
            questType = QUEST_TYPES.TIME_SPENT;
          }
          
          const quest = new Quest({
            id: `quest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: questType,
            title: questData.title,
            description: questData.description,
            target: questData.targetValue,
            progress: questData.progress,
            status: QUEST_STATUS.ACTIVE,
            rewards: questData.rewards,
            metadata: {
              personalizedType: type,
              startValue: questData.startValue,
              targetValue: questData.targetValue,
              scope,
              generatedAt: new Date().toISOString(),
            },
          });
          
          quests.push(quest);
        }
      }
    }
    
    // Si moins de 3 quêtes générées, compléter avec des quêtes par défaut
    let attempts = 0;
    const maxAttempts = 10; // Limiter les tentatives pour éviter la boucle infinie
    while (quests.length < 3 && attempts < maxAttempts) {
      attempts++;
      const defaultType = typesToUse[quests.length % typesToUse.length];
      const generator = generators[defaultType];
      if (generator) {
        const questData = generator(userProfile, scope);
        if (questData && questData.targetValue > questData.startValue) {
          // Mapper le type personnalisé vers le type de quête V2
          let questType;
          if (defaultType === PERSONALIZED_QUEST_TYPES.LEVEL) {
            questType = QUEST_TYPES.LEVEL_REACHED;
          } else if (defaultType === PERSONALIZED_QUEST_TYPES.MODULE) {
            questType = QUEST_TYPES.LESSON_COMPLETED;
          } else if (defaultType === PERSONALIZED_QUEST_TYPES.TIME_SPENT) {
            questType = QUEST_TYPES.TIME_SPENT;
          }
          
          const quest = new Quest({
            id: `quest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: questType,
            title: questData.title,
            description: questData.description,
            target: questData.targetValue,
            progress: questData.progress,
            status: QUEST_STATUS.ACTIVE,
            rewards: questData.rewards,
            metadata: {
              personalizedType: defaultType,
              startValue: questData.startValue,
              targetValue: questData.targetValue,
              scope,
              generatedAt: new Date().toISOString(),
            },
          });
          
          quests.push(quest);
        }
      }
    }
    
    // Créer la section
    const section = new QuestSection({
      title: scope === QUEST_SCOPES.WEEKLY ? 'Quêtes hebdomadaires' : 'Quêtes mensuelles',
      type: scope === QUEST_SCOPES.WEEKLY ? 'weekly' : 'monthly',
      quests,
    });
    
    return section;
  } catch (error) {
    console.error('[PersonalizedGenerator] Erreur lors de la génération:', error);
    // Retourner une section vide en cas d'erreur
    return new QuestSection({
      title: scope === QUEST_SCOPES.WEEKLY ? 'Quêtes hebdomadaires' : 'Quêtes mensuelles',
      type: scope === QUEST_SCOPES.WEEKLY ? 'weekly' : 'monthly',
      quests: [],
    });
  }
}
