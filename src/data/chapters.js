/**
 * RÈGLE STRUCTURELLE — CHAPITRES ALIGN
 *
 * Un module Align est composé de 10 chapitres.
 * - Ces 10 chapitres ne constituent PAS une fin de parcours.
 * - Ils représentent un CYCLE de progression.
 * - À la fin du chapitre 10, l'utilisateur n'est PAS "prêt", il est simplement plus aligné.
 *
 * Logique des chapitres :
 * - Chapitres 1–3 : découverte guidée (repères, vocabulaire, situations simples)
 * - Chapitres 4–7 : compréhension active (choix, nuances, responsabilités)
 * - Chapitres 8–10 : complexification progressive (ambiguïté, compromis, pression)
 *
 * Après le chapitre 10 : un nouveau cycle peut commencer (difficulté accrue, nouvelles situations).
 * Il n'existe PAS de "chapitre final". Align est un parcours continu, pas un programme à terminer.
 *
 * shortTitles = versions courtes (3-4 mots max) pour header et modal (1 ligne garantie)
 */
export const TOTAL_CHAPTERS = 10;

export const CHAPTERS = [
  // --- Chapitres 1–3 : découverte guidée (repères, vocabulaire, situations simples) ---
  {
    id: 1,
    title: 'Repères et vocabulaire',
    lessons: ['Identifier ses centres d\'intérêt', 'Comprendre ses forces et faiblesses', 'Explorer différentes options de carrière'],
    shortTitles: ['Repères et vocabulaire', 'Forces et faiblesses', 'Options carrière'],
    complexity: 'simple',
  },
  {
    id: 2,
    title: 'Explorer les secteurs',
    lessons: ['Explorer les secteurs d\'activité', 'Comprendre les tendances du marché', 'Identifier les métiers adaptés'],
    shortTitles: ['Explorer les secteurs', 'Tendances marché', 'Métiers adaptés'],
    complexity: 'simple',
  },
  {
    id: 3,
    title: 'Situations simples',
    lessons: ['Communication', 'Organisation', 'Résolution de problème'],
    shortTitles: ['Situations simples', 'Organisation', 'Résolution problème'],
    complexity: 'simple',
  },
  // --- Chapitres 4–7 : compréhension active (choix, nuances, responsabilités) ---
  {
    id: 4,
    title: 'Choix et nuances',
    lessons: ['Prendre des décisions rationnelles', 'Gérer l\'incertitude', 'Prioriser ses choix'],
    shortTitles: ['Choix et nuances', 'Gérer l\'incertitude', 'Prioriser choix'],
    complexity: 'intermediate',
  },
  {
    id: 5,
    title: 'Responsabilités',
    lessons: ['Mettre en pratique les compétences', 'Apprentissage par projet', 'Suivi de ses progrès'],
    shortTitles: ['Responsabilités', 'Apprentissage projet', 'Suivi progrès'],
    complexity: 'intermediate',
  },
  {
    id: 6,
    title: 'Compréhension active',
    lessons: ['Tester différents métiers', 'Comprendre les secteurs connexes', 'Analyser les parcours inspirants'],
    shortTitles: ['Compréhension active', 'Secteurs connexes', 'Parcours inspirants'],
    complexity: 'intermediate',
  },
  {
    id: 7,
    title: 'Pratique et décisions',
    lessons: ['Compétences avancées', 'Networking', 'Gestion de projets'],
    shortTitles: ['Pratique et décisions', 'Networking', 'Gestion projets'],
    complexity: 'intermediate',
  },
  // --- Chapitres 8–10 : complexification progressive (ambiguïté, compromis, pression) ---
  {
    id: 8,
    title: 'Ambiguïté et compromis',
    lessons: ['Choisir sa spécialité', 'Optimiser ses forces', 'Construire un plan d\'évolution'],
    shortTitles: ['Ambiguïté et compromis', 'Optimiser forces', 'Plan d\'évolution'],
    complexity: 'advanced',
  },
  {
    id: 9,
    title: 'Compromis et préparation',
    lessons: ['Préparer son CV', 'Réseauter efficacement', 'Entretiens et mise en situation'],
    shortTitles: ['Compromis et préparation', 'Réseauter', 'Entretiens'],
    complexity: 'advanced',
  },
  {
    id: 10,
    title: 'Pression et autonomie',
    lessons: ['Maîtriser son secteur', 'Créer sa trajectoire', 'Développer son autonomie'],
    shortTitles: ['Pression et autonomie', 'Créer trajectoire', 'Autonomie'],
    complexity: 'advanced',
  },
];

/**
 * SOURCE DE VÉRITÉ UNIQUE — Ordre officiel Align (module 1 = index 0, etc.)
 * Ne pas dupliquer ce mapping ailleurs. currentModuleIndex → MODULE_ORDER[index].
 */
export const MODULE_ORDER = [
  'mini_simulation_metier',   // index 0 = module 1
  'apprentissage_mindset',    // index 1 = module 2
  'test_secteur',             // index 2 = module 3
];

/** Types courts (legacy / display). Préférer MODULE_ORDER pour la logique. */
export const MODULE_TYPES = {
  APPRENTISSAGE: 'apprentissage',
  TEST_SECTEUR: 'test_secteur',
  MINI_SIMULATION: 'mini_simulation',
};

/**
 * Récupère un chapitre par son ID
 */
export function getChapterById(chapterId) {
  return CHAPTERS.find(ch => ch.id === chapterId) || CHAPTERS[0];
}

/**
 * Récupère le type de module selon l'index dans le chapitre (0, 1, 2).
 * Source unique : MODULE_ORDER[index].
 */
export function getModuleTypeByIndex(moduleIndex) {
  return MODULE_ORDER[moduleIndex % 3] ?? MODULE_ORDER[0];
}

/**
 * Retourne l'index (0, 1 ou 2) pour un type de module. Inverse de getModuleTypeByIndex.
 */
export function getModuleIndexForType(moduleType) {
  const i = MODULE_ORDER.indexOf(moduleType);
  return i >= 0 ? i : 0;
}

/**
 * Récupère la leçon actuelle selon le module dans le chapitre
 * Chaque module (0, 1, 2) correspond à une leçon (0, 1, 2)
 * @param {number} chapterId - ID du chapitre
 * @param {number} moduleIndex - Index du module (0, 1, 2)
 * @param {boolean} short - Si true, retourne shortTitle (3-4 mots max)
 */
export function getCurrentLesson(chapterId, moduleIndex, short = false) {
  const chapter = getChapterById(chapterId);
  const lessonIndex = Math.min(moduleIndex, chapter.lessons.length - 1);
  if (short && Array.isArray(chapter.shortTitles) && chapter.shortTitles[lessonIndex]) {
    return chapter.shortTitles[lessonIndex];
  }
  return chapter.lessons[lessonIndex] || chapter.lessons[0];
}
