/**
 * Générateur de quêtes V2
 * Génère des quêtes adaptées au profil utilisateur
 * Aucune quête absurde ou déjà complétée ne doit être générée
 */

import { Quest, QUEST_TYPES, QUEST_STATUS } from './questModel';
import { QuestSection } from './questModel';
import { getUserProgress } from '../../userProgressSupabase';
import { questEngine } from './questEngine';

/**
 * Catalogue de templates de quêtes
 */
const QUEST_TEMPLATES = {
  star_earned: [
    { title: 'Gagner 10 étoiles', description: 'Gagne 10 étoiles en complétant des modules', target: 10, rewards: { stars: 5, xp: 50 } },
    { title: 'Gagner 25 étoiles', description: 'Gagne 25 étoiles en complétant des modules', target: 25, rewards: { stars: 10, xp: 100 } },
    { title: 'Gagner 50 étoiles', description: 'Gagne 50 étoiles en complétant des modules', target: 50, rewards: { stars: 20, xp: 200 } },
  ],
  lesson_completed: [
    { title: 'Compléter 3 leçons', description: 'Termine 3 modules complets', target: 3, rewards: { stars: 10, xp: 100 } },
    { title: 'Compléter 5 leçons', description: 'Termine 5 modules complets', target: 5, rewards: { stars: 15, xp: 150 } },
    { title: 'Compléter 10 leçons', description: 'Termine 10 modules complets', target: 10, rewards: { stars: 30, xp: 300 } },
  ],
  module_completed: [
    { title: 'Compléter 2 modules', description: 'Termine 2 modules avec un score >= 50%', target: 2, rewards: { stars: 10, xp: 100 } },
    { title: 'Compléter 5 modules', description: 'Termine 5 modules avec un score >= 50%', target: 5, rewards: { stars: 25, xp: 250 } },
  ],
  level_reached: [
    { title: 'Atteindre le niveau 2', description: 'Monte jusqu\'au niveau 2', target: 2, rewards: { stars: 20, xp: 200 } },
    { title: 'Atteindre le niveau 5', description: 'Monte jusqu\'au niveau 5', target: 5, rewards: { stars: 50, xp: 500 } },
    { title: 'Atteindre le niveau 10', description: 'Monte jusqu\'au niveau 10', target: 10, rewards: { stars: 100, xp: 1000 } },
  ],
  time_spent: [
    { title: 'Apprendre pendant 10 minutes', description: 'Passe 10 minutes à apprendre', target: 10, rewards: { stars: 10, xp: 100 } },
    { title: 'Apprendre pendant 30 minutes', description: 'Passe 30 minutes à apprendre', target: 30, rewards: { stars: 30, xp: 300 } },
    { title: 'Apprendre pendant 60 minutes', description: 'Passe 60 minutes à apprendre', target: 60, rewards: { stars: 60, xp: 600 } },
  ],
  perfect_series: [
    { title: 'Réussir 3 séries parfaites', description: 'Obtiens un score de 100% sur 3 modules', target: 3, rewards: { stars: 30, xp: 300 } },
    { title: 'Réussir 5 séries parfaites', description: 'Obtiens un score de 100% sur 5 modules', target: 5, rewards: { stars: 50, xp: 500 } },
  ],
};

/**
 * Génère une nouvelle section de quêtes
 * @param {string} sectionType - Type de section ('weekly' ou 'monthly')
 * @returns {Promise<QuestSection>}
 */
export async function generateNewSection(sectionType) {
  try {
    // Récupérer le profil utilisateur actuel
    const userProgress = await getUserProgress();
    const currentLevel = userProgress.currentLevel || 0;
    const totalStars = userProgress.totalStars || 0;
    const currentXP = userProgress.currentXP || 0;

    // Récupérer les valeurs actuelles pour chaque type de tracking
    const currentValues = await getCurrentTrackingValues();

    // Générer 3 quêtes adaptées au profil
    const quests = [];
    const questTypes = Object.keys(QUEST_TEMPLATES);
    
    // Sélectionner 3 types de quêtes différents de manière déterministe
    const selectedTypes = selectQuestTypes(questTypes, sectionType, currentLevel);
    
    for (const questType of selectedTypes) {
      const templates = QUEST_TEMPLATES[questType];
      if (!templates || templates.length === 0) continue;

      // Sélectionner un template adapté au profil
      const template = selectAdaptedTemplate(templates, questType, currentValues, currentLevel);
      
      if (template) {
        // Vérifier que l'objectif n'est pas déjà dépassé
        const currentValue = currentValues[questType] || 0;
        if (currentValue < template.target) {
          const quest = new Quest({
            type: questType,
            title: template.title,
            description: template.description,
            target: template.target,
            progress: currentValue, // Initialiser avec la valeur actuelle
            status: QUEST_STATUS.ACTIVE,
            rewards: template.rewards,
            metadata: {
              sectionType,
              generatedAt: new Date().toISOString(),
            },
          });
          quests.push(quest);
        }
      }
    }

    // Si moins de 3 quêtes générées, compléter avec des quêtes par défaut
    while (quests.length < 3) {
      const defaultQuest = generateDefaultQuest(quests.length, sectionType, currentValues);
      if (defaultQuest) {
        quests.push(defaultQuest);
      } else {
        break; // Éviter la boucle infinie
      }
    }

    // Créer la section
    const section = new QuestSection({
      title: sectionType === 'weekly' ? 'Quêtes hebdomadaires' : 'Quêtes mensuelles',
      type: sectionType,
      quests,
    });

    return section;
  } catch (error) {
    console.error('[QuestGenerator] Erreur lors de la génération de section:', error);
    // Retourner une section vide en cas d'erreur
    return new QuestSection({
      title: sectionType === 'weekly' ? 'Quêtes hebdomadaires' : 'Quêtes mensuelles',
      type: sectionType,
      quests: [],
    });
  }
}

/**
 * Récupère les valeurs actuelles de tracking
 */
async function getCurrentTrackingValues() {
  const userProgress = await getUserProgress();
  const sections = questEngine.getSections();
  
  // Calculer les valeurs actuelles depuis les quêtes actives
  const values = {
    [QUEST_TYPES.STAR_EARNED]: userProgress.totalStars || 0,
    [QUEST_TYPES.LESSON_COMPLETED]: 0, // À calculer depuis les quêtes
    [QUEST_TYPES.MODULE_COMPLETED]: 0, // À calculer depuis les quêtes
    [QUEST_TYPES.LEVEL_REACHED]: userProgress.currentLevel || 0,
    [QUEST_TYPES.TIME_SPENT]: 0, // À calculer depuis les quêtes
    [QUEST_TYPES.PERFECT_SERIES]: 0, // À calculer depuis les quêtes
  };

  // Pour les valeurs cumulatives, on peut utiliser les snapshots des sections
  // ou calculer depuis les quêtes actives
  for (const section of sections) {
    for (const quest of section.quests) {
      if (quest.status === QUEST_STATUS.ACTIVE) {
        // Les quêtes actives ont leur progress initialisé avec la valeur actuelle
        // On peut utiliser cette valeur comme référence
        if (quest.type === QUEST_TYPES.LESSON_COMPLETED && quest.progress > values[QUEST_TYPES.LESSON_COMPLETED]) {
          values[QUEST_TYPES.LESSON_COMPLETED] = quest.progress;
        }
        if (quest.type === QUEST_TYPES.MODULE_COMPLETED && quest.progress > values[QUEST_TYPES.MODULE_COMPLETED]) {
          values[QUEST_TYPES.MODULE_COMPLETED] = quest.progress;
        }
        if (quest.type === QUEST_TYPES.TIME_SPENT && quest.progress > values[QUEST_TYPES.TIME_SPENT]) {
          values[QUEST_TYPES.TIME_SPENT] = quest.progress;
        }
        if (quest.type === QUEST_TYPES.PERFECT_SERIES && quest.progress > values[QUEST_TYPES.PERFECT_SERIES]) {
          values[QUEST_TYPES.PERFECT_SERIES] = quest.progress;
        }
      }
    }
  }

  return values;
}

/**
 * Sélectionne les types de quêtes à générer (déterministe)
 */
function selectQuestTypes(availableTypes, sectionType, userLevel) {
  // Sélectionner 3 types différents de manière déterministe
  // Utiliser un seed basé sur le type de section et le niveau
  const seed = (sectionType === 'weekly' ? 1 : 2) * 1000 + userLevel;
  const shuffled = [...availableTypes];
  
  // Mélange déterministe
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = seed % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, 3);
}

/**
 * Sélectionne un template adapté au profil utilisateur
 */
function selectAdaptedTemplate(templates, questType, currentValues, userLevel) {
  const currentValue = currentValues[questType] || 0;

  // Filtrer les templates dont l'objectif n'est pas déjà dépassé
  const validTemplates = templates.filter(t => currentValue < t.target);

  if (validTemplates.length === 0) {
    return null; // Aucun template valide
  }

  // Pour les quêtes de niveau, s'assurer que le target est > niveau actuel
  if (questType === QUEST_TYPES.LEVEL_REACHED) {
    const levelTemplates = validTemplates.filter(t => t.target > userLevel);
    if (levelTemplates.length > 0) {
      // Sélectionner le template le plus proche du niveau actuel
      return levelTemplates.reduce((closest, template) => {
        return template.target < closest.target ? template : closest;
      });
    }
  }

  // Pour les autres types, sélectionner le template avec le target le plus proche de currentValue
  return validTemplates.reduce((closest, template) => {
    const closestDiff = Math.abs(closest.target - currentValue);
    const templateDiff = Math.abs(template.target - currentValue);
    return templateDiff < closestDiff ? template : closest;
  });
}

/**
 * Génère une quête par défaut si nécessaire
 */
function generateDefaultQuest(index, sectionType, currentValues) {
  const defaultTemplates = [
    { type: QUEST_TYPES.LESSON_COMPLETED, title: `Compléter ${3 + index} leçons`, description: `Termine ${3 + index} modules complets`, target: 3 + index, rewards: { stars: 10 + index * 5, xp: 100 + index * 50 } },
    { type: QUEST_TYPES.STAR_EARNED, title: `Gagner ${10 + index * 5} étoiles`, description: `Gagne ${10 + index * 5} étoiles`, target: 10 + index * 5, rewards: { stars: 5 + index * 2, xp: 50 + index * 25 } },
    { type: QUEST_TYPES.TIME_SPENT, title: `Apprendre pendant ${10 + index * 5} minutes`, description: `Passe ${10 + index * 5} minutes à apprendre`, target: 10 + index * 5, rewards: { stars: 10 + index * 5, xp: 100 + index * 50 } },
  ];

  if (index < defaultTemplates.length) {
    const template = defaultTemplates[index];
    const currentValue = currentValues[template.type] || 0;
    
    if (currentValue < template.target) {
      return new Quest({
        type: template.type,
        title: template.title,
        description: template.description,
        target: template.target,
        progress: currentValue,
        status: QUEST_STATUS.ACTIVE,
        rewards: template.rewards,
        metadata: {
          sectionType,
          isDefault: true,
          generatedAt: new Date().toISOString(),
        },
      });
    }
  }

  return null;
}
