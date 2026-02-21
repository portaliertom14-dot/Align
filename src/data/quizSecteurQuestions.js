/**
 * QUIZ SECTEUR — 50 QUESTIONS ALIGN (40 officielles + 6 domaine cognitif Q41–Q46 + 4 micro-domaine Q47–Q50)
 * NE PAS MODIFIER, NE PAS REFORMULER les 40 premières.
 */

export const quizSecteurQuestions = [
  // SECTION 1 — Ton mode de pensée
  {
    id: 'secteur_1',
    section: 1,
    sectionTitle: 'Ton mode de pensée',
    question: 'Quand tu apprends quelque chose, tu préfères :',
    options: [
      'comprendre le pourquoi',
      'comprendre comment on fait',
      'tester directement',
    ],
  },
  {
    id: 'secteur_2',
    section: 1,
    sectionTitle: 'Ton mode de pensée',
    question: 'Quand tu dois résoudre un problème, tu :',
    options: [
      'réfléchis longtemps',
      'testes plusieurs idées',
      'demandes un avis rapide',
    ],
  },
  {
    id: 'secteur_3',
    section: 1,
    sectionTitle: 'Ton mode de pensée',
    question: 'Ce qui te motive le plus :',
    options: [
      'comprendre',
      'créer',
      'faire / exécuter',
    ],
  },
  {
    id: 'secteur_4',
    section: 1,
    sectionTitle: 'Ton mode de pensée',
    question: 'Tu retiens mieux quand :',
    options: [
      'tu vois',
      'tu entends',
      'tu pratiques',
    ],
  },
  {
    id: 'secteur_5',
    section: 1,
    sectionTitle: 'Ton mode de pensée',
    question: 'Face à une nouvelle info, tu réagis plutôt :',
    options: [
      'logique',
      'spontanée',
      'créative',
    ],
  },
  {
    id: 'secteur_6',
    section: 1,
    sectionTitle: 'Ton mode de pensée',
    question: 'Quand on te donne une tâche, tu veux :',
    options: [
      'les détails',
      'le résultat final',
      'comprendre le sens',
    ],
  },
  {
    id: 'secteur_7',
    section: 1,
    sectionTitle: 'Ton mode de pensée',
    question: 'Tu préfères les activités :',
    options: [
      'structurées',
      'flexibles',
      'totalement libres',
    ],
  },

  // SECTION 2 — Comment tu fonctionnes vraiment
  {
    id: 'secteur_8',
    section: 2,
    sectionTitle: 'Comment tu fonctionnes vraiment',
    question: 'Quand tu travailles, tu es plutôt :',
    options: [
      'concentré longtemps',
      'concentré par périodes',
      'concentré par impulsions',
    ],
  },
  {
    id: 'secteur_9',
    section: 2,
    sectionTitle: 'Comment tu fonctionnes vraiment',
    question: 'Tu gères mieux la pression quand :',
    options: [
      'tu anticipes',
      'tu improvises',
      'tu demandes de l\'aide',
    ],
  },
  {
    id: 'secteur_10',
    section: 2,
    sectionTitle: 'Comment tu fonctionnes vraiment',
    question: 'Tu prends une décision :',
    options: [
      'après analyse',
      'rapidement',
      'après avoir demandé des avis',
    ],
  },
  {
    id: 'secteur_11',
    section: 2,
    sectionTitle: 'Comment tu fonctionnes vraiment',
    question: 'Quand tu dois apprendre un sujet difficile, tu :',
    options: [
      'le décomposes',
      'cherches des exemples',
      'passes à la pratique',
    ],
  },
  {
    id: 'secteur_12',
    section: 2,
    sectionTitle: 'Comment tu fonctionnes vraiment',
    question: 'Tu préfères avancer :',
    options: [
      'seul',
      'avec 1–2 personnes',
      'en groupe',
    ],
  },
  {
    id: 'secteur_13',
    section: 2,
    sectionTitle: 'Comment tu fonctionnes vraiment',
    question: 'Quand tu échoues, tu :',
    options: [
      'réfléchis à ce qui n\'a pas marché',
      'recommences autrement',
      'changes complètement d\'approche',
    ],
  },
  {
    id: 'secteur_14',
    section: 2,
    sectionTitle: 'Comment tu fonctionnes vraiment',
    question: 'Tu te sens le plus efficace quand :',
    options: [
      'tout est clair',
      'tout bouge vite',
      'tu peux tester',
    ],
  },

  // SECTION 3 — Ce qui t'énergise
  {
    id: 'secteur_15',
    section: 3,
    sectionTitle: 'Ce qui t\'énergise',
    question: 'Tu préfères un environnement où :',
    options: [
      'La performance est visible et évaluée',
      'La stabilité et la sécurité priment',
      'L\'innovation et l\'exploration dominent',
    ],
  },
  {
    id: 'secteur_16',
    section: 3,
    sectionTitle: 'Ce qui t\'énergise',
    question: 'Tu es plus attiré par :',
    options: [
      'Le corps et l\'effort physique',
      'L\'esprit et la réflexion',
      'Les objets et la matière',
    ],
  },
  {
    id: 'secteur_17',
    section: 3,
    sectionTitle: 'Ce qui t\'énergise',
    question: 'Ton rythme naturel :',
    options: [
      'stable',
      'variable',
      'intense par moments',
    ],
  },
  {
    id: 'secteur_18',
    section: 3,
    sectionTitle: 'Ce qui t\'énergise',
    question: 'Interagir avec les gens te :',
    options: [
      'fatigue',
      'stimule un peu',
      'stimule beaucoup',
    ],
  },
  {
    id: 'secteur_19',
    section: 3,
    sectionTitle: 'Ce qui t\'énergise',
    question: 'Tu préfères :',
    options: [
      'Être responsable d\'une équipe ou d\'un projet',
      'Être expert dans un domaine précis',
      'Être sur le terrain au contact direct',
    ],
  },
  {
    id: 'secteur_20',
    section: 3,
    sectionTitle: 'Ce qui t\'énergise',
    question: 'Tu te sens aligné quand :',
    options: [
      'tout est logique',
      'tout est possible',
      'tout avance',
    ],
  },

  // SECTION 4 — Environnement qui te correspond
  {
    id: 'secteur_21',
    section: 4,
    sectionTitle: 'Environnement qui te correspond',
    question: 'Tu préfères travailler dans un endroit :',
    options: [
      'calme',
      'vivant',
      'variable',
    ],
  },
  {
    id: 'secteur_22',
    section: 4,
    sectionTitle: 'Environnement qui te correspond',
    question: 'Ton type d\'organisation :',
    options: [
      'planifiée',
      'semi-planifiée',
      'sans plan',
    ],
  },
  {
    id: 'secteur_23',
    section: 4,
    sectionTitle: 'Environnement qui te correspond',
    question: 'Tu te sens mieux quand un cadre est :',
    options: [
      'clair',
      'souple',
      'libre',
    ],
  },
  {
    id: 'secteur_24',
    section: 4,
    sectionTitle: 'Environnement qui te correspond',
    question: 'Ton environnement idéal :',
    options: [
      'stable',
      'en mouvement',
      'changeant',
    ],
  },
  {
    id: 'secteur_25',
    section: 4,
    sectionTitle: 'Environnement qui te correspond',
    question: 'Tu aimes les projets :',
    options: [
      'précis',
      'créatifs',
      'rapides',
    ],
  },
  {
    id: 'secteur_26',
    section: 4,
    sectionTitle: 'Environnement qui te correspond',
    question: 'Tu préfères que ton travail soit :',
    options: [
      'prévisible',
      'diversifié',
      'imprévisible',
    ],
  },
  {
    id: 'secteur_27',
    section: 4,
    sectionTitle: 'Environnement qui te correspond',
    question: 'Tu aimes quand on te donne :',
    options: [
      'un plan',
      'une direction',
      'une liberté',
    ],
  },
  {
    id: 'secteur_28',
    section: 4,
    sectionTitle: 'Environnement qui te correspond',
    question: 'Tu te sens à l\'aise dans :',
    options: [
      'les systèmes organisés',
      'les projets ouverts',
      'les environnements dynamiques',
    ],
  },

  // SECTION 5 — Relation au stress et à la difficulté
  {
    id: 'secteur_29',
    section: 5,
    sectionTitle: 'Relation au stress et à la difficulté',
    question: 'Face au stress, tu :',
    options: [
      'te poses',
      'te canalises',
      't\'actives',
    ],
  },
  {
    id: 'secteur_30',
    section: 5,
    sectionTitle: 'Relation au stress et à la difficulté',
    question: 'Tu gères un imprévu en :',
    options: [
      'analysant',
      'improvisant',
      'demandant de l\'aide',
    ],
  },
  {
    id: 'secteur_31',
    section: 5,
    sectionTitle: 'Relation au stress et à la difficulté',
    question: 'Tu te sentirais plus utile dans une situation où :',
    options: [
      'Il faut réagir face à un danger immédiat',
      'Il faut appliquer une règle ou une loi',
      'Il faut analyser calmement avant d\'agir',
    ],
  },
  {
    id: 'secteur_32',
    section: 5,
    sectionTitle: 'Relation au stress et à la difficulté',
    question: 'Quand tu perds le contrôle, tu :',
    options: [
      'reprends une structure',
      'trouves un plan B',
      'fonces',
    ],
  },
  {
    id: 'secteur_33',
    section: 5,
    sectionTitle: 'Relation au stress et à la difficulté',
    question: 'Les deadlines te :',
    options: [
      'stressent',
      'motivent',
      'boostent',
    ],
  },
  {
    id: 'secteur_34',
    section: 5,
    sectionTitle: 'Relation au stress et à la difficulté',
    question: 'Quand ça devient difficile, tu :',
    options: [
      'continues calmement',
      'changes de stratégie',
      'accélères',
    ],
  },

  // SECTION 6 — Projection & envies profondes
  {
    id: 'secteur_35',
    section: 6,
    sectionTitle: 'Projection & envies profondes',
    question: 'Dans ton avenir, tu veux :',
    options: [
      'stabilité',
      'créativité',
      'action',
    ],
  },
  {
    id: 'secteur_36',
    section: 6,
    sectionTitle: 'Projection & envies profondes',
    question: 'Tu te vois dans un métier :',
    options: [
      'technique',
      'créatif',
      'dynamique',
    ],
  },
  {
    id: 'secteur_37',
    section: 6,
    sectionTitle: 'Projection & envies profondes',
    question: 'Tu te sens plus aligné quand ton travail :',
    options: [
      'Génère un revenu ou une croissance mesurable',
      'Transforme concrètement la vie de quelqu\'un',
      'Produit une œuvre, une forme ou une expérience',
    ],
  },
  {
    id: 'secteur_38',
    section: 6,
    sectionTitle: 'Projection & envies profondes',
    question: 'Tu veux un environnement :',
    options: [
      'clair',
      'inspirant',
      'stimulant',
    ],
  },
  {
    id: 'secteur_39',
    section: 6,
    sectionTitle: 'Projection & envies profondes',
    question: 'Dans un futur travail, tu veux surtout :',
    options: [
      'résoudre',
      'inventer',
      'réussir rapidement',
    ],
  },
  {
    id: 'secteur_40',
    section: 6,
    sectionTitle: 'Projection & envies profondes',
    question: 'Ton avenir idéal te ressemble :',
    options: [
      'calme et stable',
      'libre et innovant',
      'intense et rapide',
    ],
  },
  // SECTION 7 — Domaine cognitif (6 questions, discrimination IA)
  {
    id: 'secteur_41',
    section: 7,
    sectionTitle: 'Domaine cognitif',
    question: 'Tu préfères travailler avec :',
    options: [
      'Des objets, outils ou matières concrètes',
      'Des systèmes, données ou mécanismes à optimiser',
      'Des personnes et leurs comportements',
    ],
  },
  {
    id: 'secteur_42',
    section: 7,
    sectionTitle: 'Domaine cognitif',
    question: 'Ce qui te motive le plus :',
    options: [
      'Construire quelque chose de solide et durable',
      'Améliorer l\'efficacité ou la performance d\'un système',
      'Faire progresser directement une personne',
    ],
  },
  {
    id: 'secteur_43',
    section: 7,
    sectionTitle: 'Domaine cognitif',
    question: 'Tu te sens plus à l\'aise avec :',
    options: [
      'La matière, l\'espace ou le concret',
      'Les règles, logiques ou structures abstraites',
      'Le mouvement, l\'intensité ou la performance',
    ],
  },
  {
    id: 'secteur_44',
    section: 7,
    sectionTitle: 'Domaine cognitif',
    question: 'Tu préfères un résultat :',
    options: [
      'Visible et tangible',
      'Mesurable par des chiffres ou des performances',
      'Visible dans une évolution humaine',
    ],
  },
  {
    id: 'secteur_45',
    section: 7,
    sectionTitle: 'Domaine cognitif',
    question: 'Tu es naturellement attiré par :',
    options: [
      'La structure d\'un projet ou d\'un objet',
      'La performance ou la rentabilité',
      'Le développement d\'une personne',
    ],
  },
  {
    id: 'secteur_46',
    section: 7,
    sectionTitle: 'Domaine cognitif',
    question: 'Dans ton futur idéal, tu aimerais surtout :',
    options: [
      'Créer quelque chose qui reste dans le temps',
      'Atteindre des objectifs mesurables et ambitieux',
      'Aider quelqu\'un à devenir autonome',
    ],
  },
  // SECTION 8 — Micro-domaine (Q47–Q50, scoring serveur)
  {
    id: 'secteur_47',
    section: 8,
    sectionTitle: 'Micro-domaine',
    question: 'Tu es plus attiré par :',
    options: [
      'Gérer des situations à risque réel ou d\'urgence',
      'Prendre des risques calculés pour réussir',
      'Accompagner sans prise de risque directe',
    ],
  },
  {
    id: 'secteur_48',
    section: 8,
    sectionTitle: 'Micro-domaine',
    question: 'Ce qui t\'attire le plus :',
    options: [
      'Influencer l\'opinion ou raconter une histoire',
      'Gérer des flux financiers ou des risques économiques',
      'Optimiser un système technique',
    ],
  },
  {
    id: 'secteur_49',
    section: 8,
    sectionTitle: 'Micro-domaine',
    question: 'Tu es plus motivé par :',
    options: [
      'Comprendre et faire respecter des règles',
      'Innover et sortir du cadre',
      'Analyser en profondeur pour comprendre',
    ],
  },
  {
    id: 'secteur_50',
    section: 8,
    sectionTitle: 'Micro-domaine',
    question: 'Tu te projettes davantage dans :',
    options: [
      'Protéger des personnes',
      'Préserver des écosystèmes ou la nature',
      'Optimiser des systèmes techniques',
    ],
  },
];

export const TOTAL_SECTEUR_QUESTIONS = quizSecteurQuestions.length;








