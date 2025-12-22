/**
 * Calcul du profil utilisateur depuis les réponses du quiz
 * 
 * Analyse les réponses et calcule les dimensions du profil utilisateur
 */

/**
 * Mapping des réponses aux dimensions
 * Chaque réponse (A, B, C) contribue différemment aux dimensions
 */
const ANSWER_MAPPING = {
  // Analyse : Réponses qui indiquent réflexion, logique, abstraction
  'analyse': {
    'A': 0,   // Pas d'analyse
    'B': 50,  // Analyse modérée
    'C': 100, // Analyse forte
  },
  // Execution : Réponses qui indiquent action, rapidité
  'execution': {
    'A': 100, // Action forte
    'B': 50,  // Action modérée
    'C': 0,   // Pas d'action
  },
  // Creativite : Réponses qui indiquent innovation, imagination
  'creativite': {
    'A': 0,   // Pas créatif
    'B': 50,  // Créativité modérée
    'C': 100, // Créativité forte
  },
  // Structure : Réponses qui indiquent besoin de cadre, méthode
  'structure': {
    'A': 100, // Besoin de structure fort
    'B': 50,  // Besoin modéré
    'C': 0,   // Pas de structure
  },
  // Autonomie : Réponses qui indiquent indépendance vs collectif
  'autonomie': {
    'A': 100, // Très autonome
    'B': 50,  // Modéré
    'C': 0,   // Collectif
  },
  // Tolerance_stress : Réponses qui indiquent résistance au stress
  'tolerance_stress': {
    'A': 100, // Haute tolérance
    'B': 50,  // Modérée
    'C': 0,   // Faible tolérance
  },
  // Rythme : Réponses qui indiquent vitesse de travail
  'rythme': {
    'A': 'rapide',
    'B': 'modéré',
    'C': 'lent',
  },
};

/**
 * Calcule le profil utilisateur depuis les réponses du quiz
 * @param {Object} answers - { questionId: 'A'|'B'|'C' }
 * @returns {Object} Profil utilisateur avec dimensions
 */
export function calculateUserProfileFromAnswers(answers) {
  const profile = {
    analyse: 0,
    execution: 0,
    creativite: 0,
    structure: 0,
    autonomie: 0,
    tolerance_stress: 0,
    rythme: 'modéré',
  };

  const answerCounts = {
    rythme: { 'rapide': 0, 'modéré': 0, 'lent': 0 },
  };

  const questionCount = Object.keys(answers).length;
  if (questionCount === 0) {
    return profile;
  }

  // Pour chaque réponse, calculer la contribution aux dimensions
  // Note: On distribue les contributions de manière équilibrée
  // car toutes les questions contribuent à toutes les dimensions
  Object.entries(answers).forEach(([questionId, answer]) => {
    if (!answer || !['A', 'B', 'C'].includes(answer)) {
      return;
    }

    // Distribution équilibrée : chaque réponse contribue à plusieurs dimensions
    // Analyse : C favorisé, B moyen, A faible
    if (answer === 'C') profile.analyse += 100 / questionCount * 0.15;
    else if (answer === 'B') profile.analyse += 100 / questionCount * 0.08;
    else profile.analyse += 100 / questionCount * 0.02;

    // Execution : A favorisé, B moyen, C faible
    if (answer === 'A') profile.execution += 100 / questionCount * 0.15;
    else if (answer === 'B') profile.execution += 100 / questionCount * 0.08;
    else profile.execution += 100 / questionCount * 0.02;

    // Creativite : C favorisé
    if (answer === 'C') profile.creativite += 100 / questionCount * 0.12;
    else if (answer === 'B') profile.creativite += 100 / questionCount * 0.06;
    else profile.creativite += 100 / questionCount * 0.02;

    // Structure : A favorisé (besoin de cadre)
    if (answer === 'A') profile.structure += 100 / questionCount * 0.12;
    else if (answer === 'B') profile.structure += 100 / questionCount * 0.06;
    else profile.structure += 100 / questionCount * 0.02;

    // Autonomie : A favorisé (indépendance)
    if (answer === 'A') profile.autonomie += 100 / questionCount * 0.12;
    else if (answer === 'B') profile.autonomie += 100 / questionCount * 0.06;
    else profile.autonomie += 100 / questionCount * 0.02;

    // Tolerance_stress : A favorisé (résistance)
    if (answer === 'A') profile.tolerance_stress += 100 / questionCount * 0.10;
    else if (answer === 'B') profile.tolerance_stress += 100 / questionCount * 0.05;
    else profile.tolerance_stress += 100 / questionCount * 0.02;

    // Rythme : compter les votes
    if (answer === 'A') answerCounts.rythme['rapide']++;
    else if (answer === 'B') answerCounts.rythme['modéré']++;
    else answerCounts.rythme['lent']++;
  });

  // Déterminer le rythme dominant
  const rythmeVotes = answerCounts.rythme;
  const maxRythme = Math.max(rythmeVotes.rapide, rythmeVotes['modéré'], rythmeVotes.lent);
  if (maxRythme > 0) {
    if (rythmeVotes.rapide === maxRythme) profile.rythme = 'rapide';
    else if (rythmeVotes['modéré'] === maxRythme) profile.rythme = 'modéré';
    else profile.rythme = 'lent';
  }

  // S'assurer que les valeurs sont entre 0 et 100
  profile.analyse = Math.min(100, Math.max(0, profile.analyse));
  profile.execution = Math.min(100, Math.max(0, profile.execution));
  profile.creativite = Math.min(100, Math.max(0, profile.creativite));
  profile.structure = Math.min(100, Math.max(0, profile.structure));
  profile.autonomie = Math.min(100, Math.max(0, profile.autonomie));
  profile.tolerance_stress = Math.min(100, Math.max(0, profile.tolerance_stress));

  return profile;
}






