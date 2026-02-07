/**
 * Structure des 10 chapitres Align
 * Chaque chapitre contient 3 leçons et 3 types de modules
 * shortTitles = versions courtes (3-4 mots max) pour header et modal (1 ligne garantie)
 */
export const CHAPTERS = [
  {
    id: 1,
    title: 'Découverte de soi',
    lessons: ['Identifier ses centres d\'intérêt', 'Comprendre ses forces et faiblesses', 'Explorer différentes options de carrière'],
    shortTitles: ['Centres d\'intérêt', 'Forces et faiblesses', 'Options carrière'],
    complexity: 'simple',
  },
  {
    id: 2,
    title: 'Orientation',
    lessons: ['Explorer les secteurs d\'activité', 'Comprendre les tendances du marché', 'Identifier les métiers adaptés'],
    shortTitles: ['Explorer secteurs', 'Tendances marché', 'Métiers adaptés'],
    complexity: 'simple',
  },
  {
    id: 3,
    title: 'Compétences de base',
    lessons: ['Communication', 'Organisation', 'Résolution de problème'],
    shortTitles: ['Communication', 'Organisation', 'Résolution problème'],
    complexity: 'intermediate',
  },
  {
    id: 4,
    title: 'Prise de décision',
    lessons: ['Prendre des décisions rationnelles', 'Gérer l\'incertitude', 'Prioriser ses choix'],
    shortTitles: ['Décisions rationnelles', 'Gérer incertitude', 'Prioriser choix'],
    complexity: 'intermediate',
  },
  {
    id: 5,
    title: 'Développement pratique',
    lessons: ['Mettre en pratique les compétences', 'Apprentissage par projet', 'Suivi de ses progrès'],
    shortTitles: ['Pratique compétences', 'Apprentissage projet', 'Suivi progrès'],
    complexity: 'intermediate',
  },
  {
    id: 6,
    title: 'Exploration avancée',
    lessons: ['Tester différents métiers', 'Comprendre les secteurs connexes', 'Analyser les parcours inspirants'],
    shortTitles: ['Tester métiers', 'Secteurs connexes', 'Parcours inspirants'],
    complexity: 'advanced',
  },
  {
    id: 7,
    title: 'Professionnalisation',
    lessons: ['Compétences avancées', 'Networking', 'Gestion de projets'],
    shortTitles: ['Compétences avancées', 'Networking', 'Gestion projets'],
    complexity: 'advanced',
  },
  {
    id: 8,
    title: 'Spécialisation',
    lessons: ['Choisir sa spécialité', 'Optimiser ses forces', 'Construire un plan d\'évolution'],
    shortTitles: ['Choisir spécialité', 'Optimiser forces', 'Plan d\'évolution'],
    complexity: 'advanced',
  },
  {
    id: 9,
    title: 'Préparation à la carrière',
    lessons: ['Préparer son CV', 'Réseauter efficacement', 'Entretiens et mise en situation'],
    shortTitles: ['Préparer CV', 'Réseauter', 'Entretiens'],
    complexity: 'advanced',
  },
  {
    id: 10,
    title: 'Excellence et autonomie',
    lessons: ['Maîtriser son secteur', 'Créer sa trajectoire', 'Développer son autonomie'],
    shortTitles: ['Maîtriser secteur', 'Créer trajectoire', 'Autonomie'],
    complexity: 'advanced',
  },
];

/**
 * Types de modules disponibles
 */
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
 * Récupère le type de module selon l'index dans le chapitre (0, 1, 2)
 */
export function getModuleTypeByIndex(moduleIndex) {
  const types = [
    MODULE_TYPES.APPRENTISSAGE,
    MODULE_TYPES.TEST_SECTEUR,
    MODULE_TYPES.MINI_SIMULATION,
  ];
  return types[moduleIndex % 3];
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
