/**
 * Structure des 10 chapitres Align
 * Chaque chapitre contient 3 leçons et 3 types de modules
 */

export const CHAPTERS = [
  {
    id: 1,
    title: 'Découverte de soi',
    lessons: [
      'Identifier ses centres d\'intérêt',
      'Comprendre ses forces et faiblesses',
      'Explorer différentes options de carrière',
    ],
    complexity: 'simple', // simple, intermediate, advanced
  },
  {
    id: 2,
    title: 'Orientation',
    lessons: [
      'Explorer les secteurs d\'activité',
      'Comprendre les tendances du marché',
      'Identifier les métiers adaptés',
    ],
    complexity: 'simple',
  },
  {
    id: 3,
    title: 'Compétences de base',
    lessons: [
      'Communication',
      'Organisation',
      'Résolution de problème',
    ],
    complexity: 'intermediate',
  },
  {
    id: 4,
    title: 'Prise de décision',
    lessons: [
      'Prendre des décisions rationnelles',
      'Gérer l\'incertitude',
      'Prioriser ses choix',
    ],
    complexity: 'intermediate',
  },
  {
    id: 5,
    title: 'Développement pratique',
    lessons: [
      'Mettre en pratique les compétences',
      'Apprentissage par projet',
      'Suivi de ses progrès',
    ],
    complexity: 'intermediate',
  },
  {
    id: 6,
    title: 'Exploration avancée',
    lessons: [
      'Tester différents métiers',
      'Comprendre les secteurs connexes',
      'Analyser les parcours inspirants',
    ],
    complexity: 'advanced',
  },
  {
    id: 7,
    title: 'Professionnalisation',
    lessons: [
      'Compétences avancées',
      'Networking',
      'Gestion de projets',
    ],
    complexity: 'advanced',
  },
  {
    id: 8,
    title: 'Spécialisation',
    lessons: [
      'Choisir sa spécialité',
      'Optimiser ses forces',
      'Construire un plan d\'évolution',
    ],
    complexity: 'advanced',
  },
  {
    id: 9,
    title: 'Préparation à la carrière',
    lessons: [
      'Préparer son CV',
      'Réseauter efficacement',
      'Entretiens et mise en situation',
    ],
    complexity: 'advanced',
  },
  {
    id: 10,
    title: 'Excellence et autonomie',
    lessons: [
      'Maîtriser son secteur',
      'Créer sa trajectoire',
      'Développer son autonomie',
    ],
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
 */
export function getCurrentLesson(chapterId, moduleIndex) {
  const chapter = getChapterById(chapterId);
  // Mapper directement moduleIndex (0, 1, 2) vers lessonIndex (0, 1, 2)
  const lessonIndex = Math.min(moduleIndex, chapter.lessons.length - 1);
  return chapter.lessons[lessonIndex] || chapter.lessons[0];
}
