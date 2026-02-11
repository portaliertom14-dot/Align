/**
 * wayMock — Simulation locale de way (IA)
 * 
 * ⚠️ REMPLACÉ PLUS TARD PAR wayAI (OpenAI)
 * 
 * Cette version mockée fonctionne 100% localement sans API.
 * Structure identique à la future version IA pour faciliter la migration.
 */

import { getUserProgress } from '../lib/userProgress';
import { getUserProfile } from '../lib/userProfile';

/**
 * Secteurs autorisés (limités pour la version mock)
 */
const AUTHORIZED_SECTORS = {
  tech: 'Tech',
  business: 'Business',
  creation: 'Création',
  droit: 'Droit',
  sante: 'Santé',
};

/**
 * Métiers par secteur (1 seul métier par secteur pour simplifier)
 */
const METIERS_BY_SECTOR = {
  tech: { id: 'developpeur', nom: 'Développeur logiciel' },
  business: { id: 'entrepreneur', nom: 'Entrepreneur' },
  creation: { id: 'designer', nom: 'Designer' },
  droit: { id: 'avocat', nom: 'Avocat' },
  sante: { id: 'medecin', nom: 'Médecin' },
};

/**
 * Scoring simple basé sur les réponses utilisateur
 * Calcule des points par dimension : scientifique, logique, créatif, business, social
 */
function calculateSimpleScore(answers) {
  const scores = {
    scientifique: 0,
    logique: 0,
    creatif: 0,
    business: 0,
    social: 0,
  };

  // Parcourir les réponses (string "A"|"B"|"C" ou { label, value })
  Object.values(answers || {}).forEach((answer) => {
    const v = typeof answer === 'object' && answer !== null && 'value' in answer ? answer.value : answer;
    if (v === 'A') {
      scores.scientifique += 1;
      scores.logique += 1;
    } else if (v === 'B') {
      scores.creatif += 1;
      scores.business += 1;
    } else if (v === 'C') {
      scores.social += 1;
    }
  });

  return scores;
}

/**
 * Détermine UN SEUL secteur dominant basé sur le scoring
 */
function determineBestSector(answers) {
  const scores = calculateSimpleScore(answers);
  
  // Trouver le secteur avec le meilleur score de matching
  const sectorScores = {
    tech: scores.scientifique + scores.logique,
    business: scores.business + scores.logique,
    creation: scores.creatif + scores.social,
    droit: scores.logique + scores.social * 0.5,
    sante: scores.scientifique + scores.social,
  };

  let bestSectorId = 'tech'; // Par défaut
  let bestScore = sectorScores[bestSectorId];

  Object.entries(sectorScores).forEach(([sectorId, score]) => {
    if (score > bestScore) {
      bestScore = score;
      bestSectorId = sectorId;
    }
  });

  return {
    secteurId: bestSectorId,
    secteurName: AUTHORIZED_SECTORS[bestSectorId],
    score: bestScore,
  };
}

/**
 * Construit le profil utilisateur pour wayMock
 */
async function buildUserProfileForWay() {
  const progress = await getUserProgress();
  const profile = await getUserProfile();

  return {
    réponses_quiz_secteur: progress.quizAnswers || {},
    réponses_quiz_métier: progress.metierQuizAnswers || {},
    age: profile?.age || 17,
    niveau_scolaire: profile?.niveau_scolaire || 'lycée',
    historique_modules: progress.completedModules || [],
    niveau_utilisateur: progress.currentLevel || 1,
    étoiles: progress.totalStars || 0,
    xp: progress.currentXP || 0,
    secteur_actuel: progress.activeDirection || null,
    métier_actuel: progress.activeMetier || null,
  };
}

/**
 * wayMock détermine UN SEUL secteur dominant
 * @returns {Object} { secteurId, secteur, score, resume }
 */
export async function wayDetermineSecteur() {
  const userProfileData = await buildUserProfileForWay();
  const answers = userProfileData.réponses_quiz_secteur || {};

  // Déterminer le meilleur secteur
  const result = determineBestSector(answers);

  // Générer un résumé simple
  const resume = `Ton profil correspond au secteur ${result.secteurName}. Tes réponses montrent une appétence pour ce domaine.`;

  return {
    secteurId: result.secteurId,
    secteur: result.secteurName,
    score: Math.min(100, Math.max(50, result.score * 10)), // Score entre 50-100
    resume,
  };
}

/**
 * wayMock propose UN SEUL métier dans le secteur validé
 * @param {string} secteurId - Secteur déterminé
 * @param {string} secteurNom - Nom du secteur
 * @returns {Object} { id, nom, score, resume }
 */
export async function wayProposeMetiers(secteurId, secteurNom) {
  const userProfileData = await buildUserProfileForWay();
  const metier = METIERS_BY_SECTOR[secteurId] || METIERS_BY_SECTOR.tech;

  // Calculer un score simple basé sur les réponses métier
  const answers = userProfileData.réponses_quiz_métier || {};
  const scores = calculateSimpleScore(answers);
  const score = Math.min(100, Math.max(60, (scores.scientifique + scores.logique + scores.creatif + scores.business) * 5));

  const resume = `${metier.nom} est le métier qui correspond le mieux à ton profil dans le secteur ${secteurNom}.`;

  return {
    id: metier.id,
    nom: metier.nom,
    score,
    resume,
  };
}

/**
 * Génère un module mocké (Mini-Simulation Métier)
 * @param {string} secteurId - ID du secteur
 * @param {string} metierId - ID du métier
 * @param {number} niveau - Niveau utilisateur (optionnel, non utilisé en mode mock)
 */
export async function wayGenerateModuleMiniSimulationMetier(secteurId, metierId, niveau = 1) {
  const metier = METIERS_BY_SECTOR[secteurId] || METIERS_BY_SECTOR.tech;
  
  return {
    type: 'mini_simulation_metier',
    titre: `Mini-Simulation ${metier.nom}`,
    objectif: `Tester ta compatibilité avec le métier de ${metier.nom}`,
    consigne: 'Réponds aux questions pour découvrir si tu as les réflexes de ce professionnel.',
    durée_estimée: '3-5 min',
    items: generateModuleItems(12, metier.nom, 'mini_simulation'),
    feedback_final: {
      badge: `Tu as les réflexes d'un ${metier.nom}`,
      message: 'Bravo : tu viens d\'agir comme un professionnel.',
      score: 0, // Sera calculé
      recompense: {
        xp: 50,
        etoiles: 2, // Note: utiliser 'etoiles' (sans accent) pour correspondre à l'UI
      },
    },
  };
}

/**
 * Génère un module mocké (Apprentissage & Mindset)
 * @param {string} secteurId - ID du secteur (optionnel, non utilisé en mode mock)
 * @param {string} metierId - ID du métier (optionnel, non utilisé en mode mock)
 * @param {number} niveau - Niveau utilisateur (optionnel, non utilisé en mode mock)
 */
export async function wayGenerateModuleApprentissage(secteurId = null, metierId = null, niveau = 1) {
  return {
    type: 'apprentissage',
    titre: 'Apprentissage & Mindset',
    objectif: 'Améliorer ta façon d\'apprendre et de travailler',
    consigne: 'Découvre des méthodes efficaces pour mieux apprendre.',
    durée_estimée: '3-5 min',
    items: generateModuleItems(12, null, 'apprentissage'),
    feedback_final: {
      badge: 'Amélioration acquise',
      message: 'Tu viens d\'améliorer ta façon d\'apprendre.',
      score: 0, // Sera calculé
      recompense: {
        xp: 40,
        etoiles: 1,
      },
    },
  };
}

/**
 * Génère un module mocké (Test de Secteur)
 * @param {string} secteurId - ID du secteur
 * @param {number} niveau - Niveau utilisateur (optionnel, non utilisé en mode mock)
 */
export async function wayGenerateModuleTestSecteur(secteurId, niveau = 1) {
  const secteurName = AUTHORIZED_SECTORS[secteurId] || 'Tech';

  return {
    type: 'test_secteur',
    titre: `Test de Secteur ${secteurName}`,
    objectif: `Tester ta connaissance et ton adéquation avec le secteur ${secteurName}`,
    consigne: 'Réponds aux questions pour valider tes connaissances du secteur.',
    durée_estimée: '3-5 min',
    items: generateModuleItems(12, secteurName, 'test_secteur'),
    feedback_final: {
      badge: `Secteur ${secteurName} validé`,
      message: 'Tu maîtrises les bases du secteur.',
      score: 0, // Sera calculé
      recompense: {
        xp: 45,
        etoiles: 2,
      },
    },
  };
}

/**
 * Génère des items mockés pour un module
 * @param {number} count - Nombre d'items (10-12)
 * @param {string} context - Contexte (métier ou secteur)
 * @param {string} type - Type de module
 */
function generateModuleItems(count, context, type) {
  const items = [];

  // Templates de questions pour varier le contenu
  const miniSimQuestions = [
    { q: `En tant que ${context || 'professionnel'}, tu dois prioriser plusieurs tâches. Quelle méthode utilises-tu ?`, o: ['Classer par urgence et importance', 'Traiter dans l\'ordre d\'arrivée', 'Déléguer systématiquement'], c: 'A' },
    { q: `Un client présente un problème complexe. Comment réagis-tu ?`, o: ['Poser des questions précises pour comprendre', 'Proposer une solution immédiate', 'Attendre les instructions de ton supérieur'], c: 'A' },
    { q: `Tu découvres une erreur dans ton travail. Que fais-tu ?`, o: ['Corriger immédiatement et informer si nécessaire', 'Ignorer si personne ne le remarque', 'Attendre qu\'on te le signale'], c: 'A' },
    { q: `Tu dois présenter un projet important. Quelle approche choisis-tu ?`, o: ['Préparer soigneusement avec exemples concrets', 'Improviser sur le moment', 'Reporter la présentation'], c: 'A' },
    { q: `Une deadline approche et le travail n'est pas fini. Que décides-tu ?`, o: ['Organiser ton temps pour finir à temps', 'Demander un report', 'Faire le minimum'], c: 'A' },
  ];

  const apprentissageQuestions = [
    { q: 'Pour mieux retenir une information, il est préférable de :', o: ['La relire plusieurs fois rapidement', 'La réécrire et l\'expliquer avec tes propres mots', 'L\'apprendre juste avant le test'], c: 'B' },
    { q: 'Quelle méthode est la plus efficace pour apprendre ?', o: ['Réviser une seule fois longtemps', 'Réviser plusieurs fois sur plusieurs jours', 'Tout apprendre en une fois'], c: 'B' },
    { q: 'Pour être productif, il vaut mieux :', o: ['Travailler plusieurs heures sans pause', 'Faire des pauses régulières', 'Travailler uniquement quand on est motivé'], c: 'B' },
    { q: 'Face à une difficulté, la meilleure attitude est :', o: ['Abandonner rapidement', 'Persister et chercher des solutions', 'Attendre que ça passe'], c: 'B' },
    { q: 'Pour mémoriser efficacement, il est important de :', o: ['Mémoriser par cœur sans comprendre', 'Comprendre le sens et faire des liens', 'Copier plusieurs fois'], c: 'B' },
  ];

  const testSecteurQuestions = [
    { q: `Dans le secteur ${context || 'professionnel'}, quelle compétence est essentielle ?`, o: ['La créativité pure', 'La logique et l\'analyse', 'La communication uniquement'], c: 'B' },
    { q: `Pour réussir dans le secteur ${context || 'professionnel'}, il faut :`, o: ['Maîtriser les bases théoriques et pratiques', 'Improviser constamment', 'Se fier uniquement à l\'intuition'], c: 'A' },
    { q: `Un professionnel du secteur ${context || 'professionnel'} doit :`, o: ['Rester à jour sur les évolutions', 'Ignorer les nouveautés', 'Suivre aveuglément les traditions'], c: 'A' },
    { q: `Dans le secteur ${context || 'professionnel'}, la qualité prime sur :`, o: ['La quantité', 'La rapidité uniquement', 'Les relations'], c: 'A' },
    { q: `Pour progresser dans le secteur ${context || 'professionnel'}, il est important de :`, o: ['Apprendre continuellement', 'S\'arrêter après la formation initiale', 'Éviter les nouveaux défis'], c: 'A' },
  ];

  let questionSet;
  if (type === 'mini_simulation') {
    questionSet = miniSimQuestions;
  } else if (type === 'apprentissage') {
    questionSet = apprentissageQuestions;
  } else {
    questionSet = testSecteurQuestions;
  }

  for (let i = 1; i <= count; i++) {
    const template = questionSet[(i - 1) % questionSet.length];
    const explanation = type === 'apprentissage' 
      ? 'Les techniques d\'apprentissage actif sont plus efficaces que la simple relecture.'
      : type === 'mini_simulation'
      ? 'Chaque situation professionnelle demande réflexion et prise de décision adaptée.'
      : 'Tous les secteurs requièrent des compétences fondamentales en logique et analyse.';

    // Convertir 'A', 'B', 'C' en index numérique (0, 1, 2)
    const correctIndex = template.c === 'A' ? 0 : template.c === 'B' ? 1 : 2;

    items.push({
      id: `item_${i}`,
      question: template.q,
      type: 'multiple_choice',
      options: template.o,
      reponse_correcte: correctIndex, // Index numérique pour correspondre à l'UI
      explication: explanation,
    });
  }

  return items;
}

/**
 * Valide une réponse d'item de module (mock)
 * @param {string} itemId - ID de l'item
 * @param {string} userAnswer - Réponse de l'utilisateur
 * @param {Object} item - Item complet avec reponse_correcte
 * @returns {Object} { correct, explanation }
 */
export async function wayValidateModuleAnswer(itemId, userAnswer, item) {
  const correct = userAnswer === item.reponse_correcte;
  return {
    correct,
    explanation: item.explanation || (correct ? 'Bonne réponse !' : 'Réponse incorrecte.'),
  };
}






