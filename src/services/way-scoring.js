/**
 * Système de scoring et de matching pour way
 * 
 * way calcule un profil utilisateur basé sur des dimensions,
 * puis matche ce profil avec des secteurs et métiers.
 */

/**
 * Dimensions du profil utilisateur
 */
export const USER_DIMENSIONS = {
  analyse: 0,           // Logique, réflexion, abstraction (0-100)
  execution: 0,         // Action, rapidité, passage à l'acte (0-100)
  creativite: 0,        // Innovation, imagination (0-100)
  structure: 0,         // Besoin de cadre, méthode (0-100)
  autonomie: 0,         // Indépendance vs collectif (0-100)
  rythme: 'modéré',     // 'lent' | 'modéré' | 'rapide'
  tolerance_stress: 0,  // Faible → élevée (0-100)
};

/**
 * Profils cibles par secteur
 * Chaque secteur a un profil idéal pour matching
 */
export const SECTOR_PROFILES = {
  tech: {
    analyse: 80,
    execution: 75,
    creativite: 60,
    structure: 70,
    autonomie: 75,
    rythme: 'rapide',
    tolerance_stress: 70,
  },
  santé: {
    analyse: 75,
    execution: 85,
    creativite: 50,
    structure: 90,
    autonomie: 60,
    rythme: 'modéré',
    tolerance_stress: 85,
  },
  droit: {
    analyse: 90,
    execution: 60,
    creativite: 40,
    structure: 95,
    autonomie: 70,
    rythme: 'modéré',
    tolerance_stress: 80,
  },
  ingénierie: {
    analyse: 85,
    execution: 80,
    creativite: 55,
    structure: 85,
    autonomie: 70,
    rythme: 'modéré',
    tolerance_stress: 75,
  },
  recherche: {
    analyse: 95,
    execution: 50,
    creativite: 70,
    structure: 80,
    autonomie: 85,
    rythme: 'lent',
    tolerance_stress: 60,
  },
  business: {
    analyse: 70,
    execution: 90,
    creativite: 60,
    structure: 65,
    autonomie: 85,
    rythme: 'rapide',
    tolerance_stress: 85,
  },
  création: {
    analyse: 60,
    execution: 70,
    creativite: 95,
    structure: 40,
    autonomie: 80,
    rythme: 'variable',
    tolerance_stress: 65,
  },
  finance: {
    analyse: 85,
    execution: 75,
    creativite: 45,
    structure: 90,
    autonomie: 75,
    rythme: 'rapide',
    tolerance_stress: 85,
  },
  sciences_humaines: {
    analyse: 80,
    execution: 55,
    creativite: 70,
    structure: 60,
    autonomie: 75,
    rythme: 'modéré',
    tolerance_stress: 70,
  },
  design: {
    analyse: 65,
    execution: 75,
    creativite: 90,
    structure: 55,
    autonomie: 75,
    rythme: 'modéré',
    tolerance_stress: 70,
  },
  communication: {
    analyse: 70,
    execution: 80,
    creativite: 85,
    structure: 60,
    autonomie: 70,
    rythme: 'rapide',
    tolerance_stress: 75,
  },
  architecture: {
    analyse: 80,
    execution: 70,
    creativite: 80,
    structure: 85,
    autonomie: 70,
    rythme: 'modéré',
    tolerance_stress: 70,
  },
  enseignement: {
    analyse: 75,
    execution: 65,
    creativite: 70,
    structure: 75,
    autonomie: 60,
    rythme: 'modéré',
    tolerance_stress: 75,
  },
};

/**
 * Profils cibles par métier (exemples pour chaque secteur)
 * Chaque métier a un profil idéal pour matching
 */
export const METIER_PROFILES = {
  // Tech
  'developpeur': {
    secteur: 'tech',
    analyse: 85,
    execution: 80,
    creativite: 65,
    structure: 75,
    autonomie: 80,
    rythme: 'rapide',
    tolerance_stress: 75,
  },
  'data_scientist': {
    secteur: 'tech',
    analyse: 95,
    execution: 70,
    creativite: 70,
    structure: 80,
    autonomie: 75,
    rythme: 'modéré',
    tolerance_stress: 70,
  },
  // Droit
  'avocat': {
    secteur: 'droit',
    analyse: 90,
    execution: 70,
    creativite: 50,
    structure: 95,
    autonomie: 75,
    rythme: 'rapide',
    tolerance_stress: 85,
  },
  'juriste': {
    secteur: 'droit',
    analyse: 85,
    execution: 60,
    creativite: 45,
    structure: 90,
    autonomie: 65,
    rythme: 'modéré',
    tolerance_stress: 75,
  },
  // Business
  'commercial': {
    secteur: 'business',
    analyse: 65,
    execution: 95,
    creativite: 70,
    structure: 60,
    autonomie: 90,
    rythme: 'rapide',
    tolerance_stress: 85,
  },
  'entrepreneur': {
    secteur: 'business',
    analyse: 75,
    execution: 90,
    creativite: 80,
    structure: 70,
    autonomie: 95,
    rythme: 'rapide',
    tolerance_stress: 90,
  },
  // Santé
  'medecin': {
    secteur: 'santé',
    analyse: 85,
    execution: 90,
    creativite: 50,
    structure: 95,
    autonomie: 70,
    rythme: 'modéré',
    tolerance_stress: 90,
  },
  'infirmier': {
    secteur: 'santé',
    analyse: 70,
    execution: 85,
    creativite: 55,
    structure: 85,
    autonomie: 60,
    rythme: 'modéré',
    tolerance_stress: 85,
  },
  // Création
  'graphiste': {
    secteur: 'création',
    analyse: 60,
    execution: 75,
    creativite: 95,
    structure: 50,
    autonomie: 80,
    rythme: 'variable',
    tolerance_stress: 70,
  },
  'redacteur': {
    secteur: 'création',
    analyse: 75,
    execution: 70,
    creativite: 90,
    structure: 60,
    autonomie: 75,
    rythme: 'modéré',
    tolerance_stress: 65,
  },
};

/**
 * Convertit une valeur de rythme en nombre pour le calcul
 */
function rythmeToNumber(rythme) {
  const mapping = {
    'lent': 30,
    'modéré': 50,
    'rapide': 80,
    'variable': 50, // Variable = modéré pour le calcul
  };
  return mapping[rythme] || 50;
}

/**
 * Calcule un score de matching entre un profil utilisateur et un profil cible
 * @param {Object} userProfile - Profil utilisateur avec dimensions
 * @param {Object} targetProfile - Profil cible (secteur ou métier)
 * @returns {number} Score de matching (0-100)
 */
export function calculateMatchingScore(userProfile, targetProfile) {
  let totalScore = 0;
  let weightSum = 0;

  // Dimensions numériques
  const numericDimensions = ['analyse', 'execution', 'creativite', 'structure', 'autonomie', 'tolerance_stress'];
  
  numericDimensions.forEach(dim => {
    const userValue = userProfile[dim] || 0;
    const targetValue = targetProfile[dim] || 0;
    const diff = Math.abs(userValue - targetValue);
    const similarity = 100 - diff; // Plus proche = score plus élevé
    totalScore += similarity;
    weightSum += 1;
  });

  // Rythme (comparaison spéciale)
  const userRythme = rythmeToNumber(userProfile.rythme);
  const targetRythme = rythmeToNumber(targetProfile.rythme);
  const rythmeDiff = Math.abs(userRythme - targetRythme);
  const rythmeSimilarity = 100 - (rythmeDiff * 2); // Pénalité doublée pour le rythme
  totalScore += Math.max(0, rythmeSimilarity);
  weightSum += 1;

  // Score moyen
  const score = totalScore / weightSum;
  return Math.max(0, Math.min(100, score)); // S'assurer que le score est entre 0 et 100
}

/**
 * Trouve le secteur avec le meilleur score de matching
 * @param {Object} userProfile - Profil utilisateur
 * @returns {Object} { secteurId, score }
 */
export function findBestMatchingSector(userProfile) {
  let bestSector = null;
  let bestScore = -1;

  Object.entries(SECTOR_PROFILES).forEach(([secteurId, profile]) => {
    const score = calculateMatchingScore(userProfile, profile);
    if (score > bestScore) {
      bestScore = score;
      bestSector = secteurId;
    }
  });

  return {
    secteurId: bestSector,
    score: bestScore,
  };
}

/**
 * Trouve les métiers d'un secteur avec les meilleurs scores de matching
 * @param {Object} userProfile - Profil utilisateur
 * @param {string} secteurId - Secteur validé
 * @returns {Array} [{ metierId, score }] trié par score décroissant
 */
export function findBestMatchingMetiers(userProfile, secteurId) {
  const metiers = Object.entries(METIER_PROFILES)
    .filter(([metierId, profile]) => profile.secteur === secteurId)
    .map(([metierId, profile]) => ({
      metierId,
      score: calculateMatchingScore(userProfile, profile),
    }))
    .sort((a, b) => b.score - a.score);

  return metiers;
}






