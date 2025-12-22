/**
 * Algorithme POST-QUIZ Align
 * Analyse les 40 réponses et génère un profil utilisateur
 * 
 * ⚠️ VERSION TEMPORAIRE - Architecture prête pour calibration réelle
 */

/**
 * Catégories de profils Align (temporaires)
 */
const PROFIL_CATEGORIES = {
  STRUCTURE: 'Structuré',
  CREATIF: 'Créatif',
  DYNAMIQUE: 'Dynamique',
  MIXTE: 'Mixte',
  POLYFORME: 'Polyforme',
};

/**
 * Styles d'apprentissage (temporaires)
 */
const LEARNING_STYLES = {
  VISUEL: 'Visuel',
  AUDITIF: 'Auditif',
  KINESTHESIQUE: 'Kinesthésique',
  LECTURE: 'Lecture-Écriture',
  MIXTE: 'Mixte',
};

/**
 * Forces possibles (temporaires)
 */
const POSSIBLE_STRENGTHS = [
  'Analyse approfondie',
  'Créativité',
  'Adaptabilité',
  'Leadership',
  'Collaboration',
  'Résolution de problèmes',
  'Communication',
  'Organisation',
];

/**
 * Faiblesses possibles (temporaires)
 */
const POSSIBLE_WEAKNESSES = [
  'Gestion du temps',
  'Prise de décision rapide',
  'Attention aux détails',
  'Gestion du stress',
  'Multitâche',
  'Planification long terme',
];

/**
 * Niveaux de motivation (temporaires)
 */
const MOTIVATION_LEVELS = {
  HIGH: 'Élevée',
  MEDIUM: 'Modérée',
  LOW: 'À développer',
};

/**
 * Calcule le profil Align à partir des réponses
 * @param {Object} answers - Réponses du quiz { questionId: answer }
 * @returns {Object} Profil Align structuré
 */
export function calculateAlignProfile(answers) {
  // Compter les réponses par option
  const optionCounts = {
    A: 0,
    B: 0,
    C: 0,
    D: 0,
    null: 0,
  };

  // Analyser les réponses
  Object.values(answers).forEach((answer) => {
    if (answer === null || answer === undefined) {
      optionCounts.null++;
    } else if (answer.includes('Option A') || answer === 'A') {
      optionCounts.A++;
    } else if (answer.includes('Option B') || answer === 'B') {
      optionCounts.B++;
    } else if (answer.includes('Option C') || answer === 'C') {
      optionCounts.C++;
    } else if (answer.includes('Option D') || answer === 'D') {
      optionCounts.D++;
    }
  });

  // Calculer les scores par catégorie (pondération temporaire)
  const scores = {
    structure: optionCounts.A * 1.2 + optionCounts.B * 0.8,
    creatif: optionCounts.B * 1.3 + optionCounts.C * 0.9,
    dynamique: optionCounts.C * 1.1 + optionCounts.D * 1.0,
    mixte: optionCounts.A * 0.7 + optionCounts.B * 0.7 + optionCounts.C * 0.7 + optionCounts.D * 0.7,
  };

  // Déterminer la catégorie principale
  const maxScore = Math.max(...Object.values(scores));
  let categorie = PROFIL_CATEGORIES.MIXTE;

  if (scores.structure === maxScore) {
    categorie = PROFIL_CATEGORIES.STRUCTURE;
  } else if (scores.creatif === maxScore) {
    categorie = PROFIL_CATEGORIES.CREATIF;
  } else if (scores.dynamique === maxScore) {
    categorie = PROFIL_CATEGORIES.DYNAMIQUE;
  } else if (maxScore < 15) {
    categorie = PROFIL_CATEGORIES.POLYFORME;
  }

  // Déterminer le style d'apprentissage (temporaire)
  const totalAnswered = 40 - optionCounts.null;
  const styleApprentissage = totalAnswered > 30
    ? LEARNING_STYLES.MIXTE
    : totalAnswered > 20
    ? LEARNING_STYLES.VISUEL
    : LEARNING_STYLES.AUDITIF;

  // Générer les forces (temporaire - basé sur la catégorie)
  const forces = generateStrengths(categorie, scores);

  // Générer les faiblesses (temporaire)
  const faiblesses = generateWeaknesses(categorie, scores);

  // Déterminer la motivation (temporaire)
  const motivation = optionCounts.null < 5
    ? MOTIVATION_LEVELS.HIGH
    : optionCounts.null < 15
    ? MOTIVATION_LEVELS.MEDIUM
    : MOTIVATION_LEVELS.LOW;

  return {
    styleApprentissage,
    forces,
    faiblesses,
    motivation,
    categorie,
    scores, // Inclus pour debug/futur
    totalAnswered,
    optionCounts, // Inclus pour debug/futur
  };
}

/**
 * Génère les forces basées sur la catégorie (temporaire)
 */
function generateStrengths(categorie, scores) {
  const strengths = [];

  switch (categorie) {
    case PROFIL_CATEGORIES.STRUCTURE:
      strengths.push('Analyse approfondie', 'Organisation', 'Planification');
      break;
    case PROFIL_CATEGORIES.CREATIF:
      strengths.push('Créativité', 'Innovation', 'Pensée divergente');
      break;
    case PROFIL_CATEGORIES.DYNAMIQUE:
      strengths.push('Adaptabilité', 'Leadership', 'Communication');
      break;
    case PROFIL_CATEGORIES.MIXTE:
      strengths.push('Polyvalence', 'Collaboration', 'Résolution de problèmes');
      break;
    case PROFIL_CATEGORIES.POLYFORME:
      strengths.push('Flexibilité', 'Curiosité', 'Apprentissage continu');
      break;
    default:
      strengths.push('Polyvalence', 'Adaptabilité');
  }

  return strengths.slice(0, 3); // Retourner max 3 forces
}

/**
 * Génère les faiblesses basées sur la catégorie (temporaire)
 */
function generateWeaknesses(categorie, scores) {
  const weaknesses = [];

  switch (categorie) {
    case PROFIL_CATEGORIES.STRUCTURE:
      weaknesses.push('Prise de décision rapide', 'Flexibilité');
      break;
    case PROFIL_CATEGORIES.CREATIF:
      weaknesses.push('Gestion du temps', 'Organisation');
      break;
    case PROFIL_CATEGORIES.DYNAMIQUE:
      weaknesses.push('Attention aux détails', 'Planification long terme');
      break;
    default:
      weaknesses.push('Gestion du stress', 'Multitâche');
  }

  return weaknesses.slice(0, 2); // Retourner max 2 faiblesses
}

/**
 * Valide que les réponses sont complètes
 */
export function validateAnswers(answers, totalQuestions = 40) {
  const answeredCount = Object.keys(answers).filter(
    (key) => answers[key] !== null && answers[key] !== undefined
  ).length;

  return {
    isComplete: answeredCount >= totalQuestions * 0.7, // Au moins 70% répondu
    answeredCount,
    totalQuestions,
    percentage: (answeredCount / totalQuestions) * 100,
  };
}













