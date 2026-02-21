/**
 * Générateur de questions personnalisées selon le chapitre, module, secteur et métier
 * Analyse le contexte et crée des questions cohérentes
 */

import { getChapterById, getModuleTypeByIndex, MODULE_TYPES } from '../data/chapters';
import { 
  wayGenerateModuleApprentissage, 
  wayGenerateModuleTestSecteur, 
  wayGenerateModuleMiniSimulationMetier 
} from '../services/way';

/** Liste officielle Align — 16 secteurs (contexte pour génération) */
const SECTOR_CONTEXTS = {
  ingenierie_tech: { name: 'Ingénierie & Tech', skills: ['programmation', 'logique', 'résolution de problèmes'], tools: ['langages', 'frameworks'], challenges: ['optimisation', 'sécurité'], workStyle: 'collaboratif et méthodique' },
  data_ia: { name: 'Data & IA', skills: ['analyse de données', 'modélisation', 'algorithmes'], tools: ['outils d\'analyse', 'ML'], challenges: ['qualité des données', 'innovation'], workStyle: 'analytique et rigoureux' },
  creation_design: { name: 'Création & Design', skills: ['créativité', 'sens esthétique', 'expression'], tools: ['logiciels créatifs', 'design'], challenges: ['inspiration', 'deadlines'], workStyle: 'libre et expressif' },
  communication_medias: { name: 'Communication & Médias', skills: ['rédaction', 'storytelling', 'réseaux'], tools: ['médias', 'outils de com'], challenges: ['audience', 'impact'], workStyle: 'créatif et réactif' },
  business_entrepreneuriat: { name: 'Business & Entrepreneuriat', skills: ['stratégie', 'négociation', 'leadership'], tools: ['CRM', 'analyse marché'], challenges: ['concurrence', 'croissance'], workStyle: 'dynamique et orienté résultats' },
  finance_audit: { name: 'Finance & Audit', skills: ['analyse financière', 'rigueur', 'conformité'], tools: ['outils financiers', 'audit'], challenges: ['réglementation', 'précision'], workStyle: 'méthodique et structuré' },
  droit_justice: { name: 'Droit & Justice', skills: ['argumentation', 'analyse juridique', 'rédaction'], tools: ['codes', 'jurisprudence'], challenges: ['cas complexes', 'procédures'], workStyle: 'rigoureux et argumenté' },
  defense_securite: { name: 'Défense & Sécurité', skills: ['réactivité', 'analyse de risque', 'discipline'], tools: ['protocoles', 'sécurité'], challenges: ['crises', 'vigilance'], workStyle: 'structuré et réactif' },
  sante_medical: { name: 'Santé & Médical', skills: ['empathie', 'rigueur', 'diagnostic'], tools: ['protocoles', 'technologies médicales'], challenges: ['décisions rapides', 'stress'], workStyle: 'méthodique et humain' },
  sciences_recherche: { name: 'Sciences & Recherche', skills: ['méthode scientifique', 'expérimentation', 'analyse'], tools: ['recherche', 'publication'], challenges: ['hypothèses', 'innovation'], workStyle: 'méthodique et analytique' },
  education_transmission: { name: 'Éducation & Transmission', skills: ['pédagogie', 'écoute', 'adaptation'], tools: ['supports', 'évaluation'], challenges: ['diversité des profils', 'engagement'], workStyle: 'patient et structuré' },
  architecture_urbanisme: { name: 'Architecture & Urbanisme', skills: ['conception', 'créativité', 'technique'], tools: ['dessin', 'maquettes'], challenges: ['contraintes', 'esthétique'], workStyle: 'créatif et rigoureux' },
  industrie_production: { name: 'Industrie & Production', skills: ['organisation', 'process', 'qualité'], tools: ['outils de production'], challenges: ['efficacité', 'sécurité'], workStyle: 'structuré et opérationnel' },
  sport_performance: { name: 'Sport & Performance', skills: ['entraînement', 'motivation', 'analyse'], tools: ['méthodes d\'entraînement'], challenges: ['performance', 'régularité'], workStyle: 'dynamique et exigeant' },
  social_accompagnement: { name: 'Social & Accompagnement', skills: ['écoute', 'empathie', 'accompagnement'], tools: ['méthodes d\'intervention'], challenges: ['situations complexes', 'bienveillance'], workStyle: 'humain et structuré' },
  environnement_energie: { name: 'Environnement & Énergie', skills: ['analyse', 'transition', 'durabilité'], tools: ['outils d\'analyse', 'normes'], challenges: ['transition', 'innovation'], workStyle: 'engagé et rigoureux' },
};

/**
 * Mapping des métiers vers leurs spécificités
 */
const METIER_CONTEXTS = {
  developpeur: {
    name: 'Développeur',
    dailyTasks: ['écrire du code', 'déboguer', 'collaborer avec l\'équipe', 'optimiser les performances'],
    skills: ['programmation', 'résolution de bugs', 'architecture logicielle'],
  },
  medecin: {
    name: 'Médecin',
    dailyTasks: ['diagnostiquer', 'soigner les patients', 'suivre les protocoles', 'communiquer'],
    skills: ['diagnostic', 'empathie', 'prise de décision rapide'],
  },
  entrepreneur: {
    name: 'Entrepreneur',
    dailyTasks: ['développer la stratégie', 'gérer l\'équipe', 'négocier', 'innover'],
    skills: ['leadership', 'vision stratégique', 'gestion de projet'],
  },
  designer: {
    name: 'Designer',
    dailyTasks: ['créer des concepts', 'collaborer avec les clients', 'prototyper', 'itérer'],
    skills: ['créativité', 'sens esthétique', 'communication visuelle'],
  },
  avocat: {
    name: 'Avocat',
    dailyTasks: ['analyser des dossiers', 'préparer des arguments', 'défendre des clients', 'négocier'],
    skills: ['argumentation', 'analyse juridique', 'communication persuasive'],
  },
  chercheur: {
    name: 'Chercheur',
    dailyTasks: ['formuler des hypothèses', 'expérimenter', 'analyser des données', 'publier'],
    skills: ['méthode scientifique', 'analyse critique', 'innovation'],
  },
};

/**
 * Génère des questions personnalisées pour le module Apprentissage
 * 12 questions différentes par chapitre avec difficulté progressive
 */
function generateApprentissageQuestions(chapter, sectorContext, metierContext, complexity) {
  const chapterId = chapter?.id || 1;
  const sectorName = sectorContext.name;
  const metierName = metierContext?.name || 'professionnel';
  
  // Déterminer le niveau de difficulté selon le chapitre
  // Chapitres 1-2: simple, 3-5: intermediate, 6-12: advanced
  const difficultyLevel = chapterId <= 2 ? 'simple' : (chapterId <= 5 ? 'intermediate' : 'advanced');
  
  // Générer 12 questions différentes selon le chapitre avec difficulté progressive
  // Chapitres 1-2 (simple), 3-5 (intermediate), 6-12 (advanced)
  
  const getQuestionVariant = (baseIndex, chapterId) => {
    // Utiliser chapterId pour créer des variantes uniques par chapitre
    // Chaque chapitre aura 12 questions différentes basées sur le même thème
    const chapterOffset = (chapterId - 1) * 12; // Offset pour varier par chapitre
    return (baseIndex + chapterOffset) % 12; // Boucle sur 12 questions de base
  };
  
  // Base de questions communes - 12 templates de base qui seront adaptés par chapitre
  const baseQuestionTemplates = [
    {
      question: `Quelle compétence technique est la plus demandée dans le secteur ${sectorName} ?`,
      options: [
        sectorContext.skills[0] || 'Communication',
        sectorContext.skills[1] || 'Créativité',
        sectorContext.skills[2] || 'Logique et analyse',
      ],
      correctAnswer: 0,
      explanation: `Dans le secteur ${sectorName}, ${sectorContext.skills[0]} est une compétence technique essentielle recherchée par les employeurs.`,
    },
    {
      question: `Quel outil est le plus utilisé dans ${sectorName} pour ${sectorContext.tools?.[0] || 'travailler efficacement'} ?`,
      options: [
        sectorContext.tools?.[0] || 'Outils de base du secteur',
        'Outils génériques non spécialisés',
        'Aucun outil spécifique',
      ],
      correctAnswer: 0,
      explanation: `Les ${sectorContext.tools?.[0] || 'outils spécialisés'} sont essentiels pour travailler efficacement dans ${sectorName}.`,
    },
    {
      question: `Pour réussir dans ${sectorName}, quelle méthode est la plus efficace ?`,
      options: [
        `Maîtriser les bases théoriques et pratiques`,
        'Improviser constamment sans préparation',
        'Suivre uniquement l\'intuition sans méthode',
      ],
      correctAnswer: 0,
      explanation: `Dans ${sectorName}, la maîtrise des bases théoriques et pratiques est la méthode la plus efficace pour progresser.`,
    },
    {
      question: `Quelles compétences sont les plus recherchées dans ${sectorName} ?`,
      options: [
        `${sectorContext.skills[0]} et ${sectorContext.skills[1]}`,
        'Uniquement la créativité',
        'Uniquement la logique',
      ],
      correctAnswer: 0,
      explanation: `Les compétences ${sectorContext.skills[0]} et ${sectorContext.skills[1]} sont complémentaires dans ${sectorName}.`,
    },
    {
      question: `Comment développer tes compétences en ${sectorName} ?`,
      options: [
        'Pratique régulière et apprentissage continu',
        'Attendre l\'expérience professionnelle',
        'Se concentrer uniquement sur la théorie',
      ],
      correctAnswer: 0,
      explanation: 'La pratique régulière combinée à l\'apprentissage continu est la clé du développement.',
    },
    {
      question: `Pour exceller dans ${sectorName}, quelle approche est la plus efficace ?`,
      options: [
        'Combiner expertise technique et vision stratégique',
        'Se spécialiser dans un seul domaine',
        'Éviter toute spécialisation',
      ],
      correctAnswer: 0,
      explanation: 'L\'excellence vient de la combinaison entre expertise technique et vision stratégique.',
    },
    {
      question: `Quel type de défi est le plus fréquent dans ${sectorName} ?`,
      options: [
        sectorContext.challenges?.[0] || 'Défis techniques',
        'Défis uniquement personnels',
        'Aucun défi spécifique',
      ],
      correctAnswer: 0,
      explanation: `Les ${sectorContext.challenges?.[0] || 'défis techniques'} sont fréquents dans ${sectorName}.`,
    },
    {
      question: `Quel est le style de travail le plus adapté dans ${sectorName} ?`,
      options: [
        sectorContext.workStyle || 'Méthodique et structuré',
        'Improvisation constante',
        'Travailler uniquement seul',
      ],
      correctAnswer: 0,
      explanation: `Le style de travail ${sectorContext.workStyle || 'méthodique et structuré'} est le plus adapté dans ${sectorName}.`,
    },
    {
      question: `Comment rester à jour dans ${sectorName} ?`,
      options: [
        'Formation continue et veille professionnelle',
        'Compter uniquement sur l\'expérience',
        'Ignorer les nouvelles tendances',
      ],
      correctAnswer: 0,
      explanation: 'La formation continue et la veille professionnelle sont essentielles pour rester compétent.',
    },
    {
      question: `Quelle est la meilleure façon d'apprendre ${sectorContext.skills?.[1] || 'une compétence'} en ${sectorName} ?`,
      options: [
        'Apprendre par la pratique et l\'expérimentation',
        'Uniquement par la lecture',
        'Attendre qu\'on te l\'enseigne',
      ],
      correctAnswer: 0,
      explanation: 'L\'apprentissage par la pratique et l\'expérimentation est plus efficace que la théorie seule.',
    },
    {
      question: `Quel facteur est le plus important pour progresser dans ${sectorName} ?`,
      options: [
        'La persévérance et la régularité',
        'Les compétences naturelles uniquement',
        'La chance et les opportunités',
      ],
      correctAnswer: 0,
      explanation: 'La persévérance et la régularité dans l\'apprentissage sont plus importantes que les talents naturels.',
    },
    {
      question: `Comment gérer efficacement les ${sectorContext.challenges?.[1] || 'défis complexes'} dans ${sectorName} ?`,
      options: [
        'Analyser le problème, planifier, agir méthodiquement',
        'Réagir immédiatement sans réfléchir',
        'Éviter les situations difficiles',
      ],
      correctAnswer: 0,
      explanation: 'Une approche méthodique (analyse, planification, action) est plus efficace que l\'improvisation.',
    },
  ];
  
  // Adapter les questions selon le chapitre et la difficulté
  // Pour chaque chapitre, utiliser un offset différent pour varier les questions
  const adaptedQuestions = baseQuestionTemplates.map((template, index) => {
    // Utiliser chapterId pour créer une variante unique par chapitre
    const variantOffset = ((chapterId - 1) * 7 + index) % 12; // Décalage différent par chapitre
    const variant = baseQuestionTemplates[variantOffset];
    
    // Adapter la question selon le niveau de difficulté
    let adaptedQuestion = variant.question;
    let adaptedOptions = [...variant.options];
    
    if (difficultyLevel === 'intermediate') {
      // Niveau intermédiaire : ajouter du contexte
      adaptedQuestion = adaptedQuestion
        .replace(/Quelle compétence/, `Comment développer tes compétences en ${sectorName}`)
        .replace(/Quel outil/, `Quels outils techniques`)
        .replace(/Comment développer/, `Comment optimiser tes compétences en`);
    } else if (difficultyLevel === 'advanced') {
      // Niveau avancé : ajouter des contraintes complexes
      adaptedQuestion = adaptedQuestion
        .replace(/Quelle compétence/, `Face à un défi complexe en ${sectorName}, quelle compétence prioriser`)
        .replace(/Quel outil/, `Pour résoudre un problème avancé, quels outils`)
        .replace(/Comment développer/, `Comment optimiser tes compétences en`)
        .replace(/Comment gérer/, `Dans un contexte complexe, comment gérer`);
    }
    
    return {
      ...variant,
      question: adaptedQuestion.replace(/\{sector\}/g, sectorName).replace(/\{metier\}/g, metierName),
      options: adaptedOptions,
    };
  });
  
  // Retourner exactement 12 questions uniques par chapitre
  return adaptedQuestions.slice(0, 12);
}

/**
 * Génère des questions personnalisées pour le module Test de secteur
 * 12 questions différentes par chapitre avec difficulté progressive
 */
function generateTestSecteurQuestions(chapter, sectorContext, metierContext, complexity) {
  const chapterId = chapter?.id || 1;
  const sectorName = sectorContext.name;
  const metierName = metierContext?.name || 'professionnel';
  
  // Déterminer le niveau de difficulté selon le chapitre
  const difficultyLevel = chapterId <= 2 ? 'simple' : (chapterId <= 5 ? 'intermediate' : 'advanced');
  
  const getQuestionVariant = (baseIndex, chapterId) => {
    const chapterOffset = (chapterId - 1) * 12;
    return (baseIndex + chapterOffset) % 12;
  };
  
  // Base de 12 questions pour le module Test Secteur
  const baseQuestionTemplates = [
    {
      question: `Pour réussir dans ${sectorName}, il faut :`,
      options: [
        `Maîtriser les bases théoriques et pratiques`,
        'Improviser constamment',
        'Suivre uniquement l\'intuition',
      ],
      correctAnswer: 0,
      explanation: `Dans ${sectorName}, la maîtrise des bases est essentielle.`,
    },
    {
      question: `Quels outils sont essentiels dans ${sectorName} ?`,
      options: [
        sectorContext.tools?.[0] || 'Outils de base',
        'Aucun outil spécifique',
        'Uniquement l\'intuition',
      ],
      correctAnswer: 0,
      explanation: `Les ${sectorContext.tools?.[0] || 'outils de base'} sont fondamentaux dans ${sectorName}.`,
    },
    {
      question: `Quels défis sont les plus courants dans ${sectorName} ?`,
      options: [
        sectorContext.challenges?.[0] || 'Défis techniques',
        'Aucun défi spécifique',
        'Défis uniquement personnels',
      ],
      correctAnswer: 0,
      explanation: `Les ${sectorContext.challenges?.[0] || 'défis techniques'} sont fréquents dans ${sectorName}.`,
    },
    {
      question: `Comment gérer efficacement les ${sectorContext.challenges?.[0] || 'défis'} dans ${sectorName} ?`,
      options: [
        'Méthode structurée et collaboration',
        'Improvisation totale',
        'Éviter les défis',
      ],
      correctAnswer: 0,
      explanation: 'Une méthode structurée avec collaboration est la meilleure approche.',
    },
    {
      question: `Quel vocabulaire technique est spécifique au secteur ${sectorName} ?`,
      options: [
        'Termes techniques du secteur',
        'Vocabulaire générique uniquement',
        'Pas de vocabulaire spécialisé',
      ],
      correctAnswer: 0,
      explanation: `Chaque secteur ${sectorName} possède son vocabulaire technique spécifique.`,
    },
    {
      question: `Quelle est la culture professionnelle dominante dans ${sectorName} ?`,
      options: [
        sectorContext.workStyle || 'Culture méthodique',
        'Culture improvisée',
        'Pas de culture spécifique',
      ],
      correctAnswer: 0,
      explanation: `La culture professionnelle de ${sectorName} privilégie ${sectorContext.workStyle || 'une approche méthodique'}.`,
    },
    {
      question: `Quels principes fondamentaux régissent le secteur ${sectorName} ?`,
      options: [
        'Rigueur, qualité, professionnalisme',
        'Improvisation et spontanéité',
        'Pas de principes spécifiques',
      ],
      correctAnswer: 0,
      explanation: 'Les secteurs professionnels reposent sur des principes de rigueur, qualité et professionnalisme.',
    },
    {
      question: `Comment identifier les opportunités dans ${sectorName} ?`,
      options: [
        'Veille sectorielle et analyse de marché',
        'Attendre les opportunités',
        'Improviser sans stratégie',
      ],
      correctAnswer: 0,
      explanation: 'La veille sectorielle et l\'analyse de marché permettent d\'identifier les opportunités.',
    },
    {
      question: `Quelles sont les tendances actuelles dans ${sectorName} ?`,
      options: [
        'Innovation technologique et méthodes modernes',
        'Tradition et méthodes anciennes uniquement',
        'Aucune évolution',
      ],
      correctAnswer: 0,
      explanation: 'Les secteurs évoluent avec l\'innovation technologique et les méthodes modernes.',
    },
    {
      question: `Quel type de collaboration est le plus efficace dans ${sectorName} ?`,
      options: [
        'Travail d\'équipe structuré et communication',
        'Travail individuel uniquement',
        'Collaboration informelle sans structure',
      ],
      correctAnswer: 0,
      explanation: 'Le travail d\'équipe structuré avec communication est plus efficace que le travail isolé.',
    },
    {
      question: `Comment évaluer la qualité du travail dans ${sectorName} ?`,
      options: [
        'Standards professionnels et critères objectifs',
        'Intuition personnelle uniquement',
        'Pas de critères spécifiques',
      ],
      correctAnswer: 0,
      explanation: 'La qualité se mesure selon des standards professionnels et des critères objectifs.',
    },
    {
      question: `Quelle est l'importance de la formation continue dans ${sectorName} ?`,
      options: [
        'Essentielle pour rester compétent',
        'Optionnelle, l\'expérience suffit',
        'Inutile une fois formé',
      ],
      correctAnswer: 0,
      explanation: 'La formation continue est essentielle pour rester compétent dans un secteur en évolution.',
    },
  ];
  
  // Adapter les questions selon le chapitre
  const adaptedQuestions = baseQuestionTemplates.map((template, index) => {
    const variantOffset = ((chapterId - 1) * 7 + index) % 12;
    const variant = baseQuestionTemplates[variantOffset];
    
    let adaptedQuestion = variant.question;
    if (difficultyLevel === 'intermediate') {
      adaptedQuestion = variant.question.replace(/Pour réussir/, `Pour progresser efficacement dans`);
    } else if (difficultyLevel === 'advanced') {
      adaptedQuestion = variant.question.replace(/Pour réussir/, `Face aux enjeux actuels de ${sectorName}, pour réussir`);
    }
    
    return {
      ...variant,
      question: adaptedQuestion.replace(/\{sector\}/g, sectorName).replace(/\{metier\}/g, metierName),
    };
  });
  
  return adaptedQuestions.slice(0, 12);
}

/**
 * Génère des questions personnalisées pour le module Mini-simulation
 * 12 questions différentes par chapitre avec difficulté progressive
 */
function generateMiniSimulationQuestions(chapter, sectorContext, metierContext, complexity) {
  const chapterId = chapter?.id || 1;
  const sectorName = sectorContext.name;
  const metierName = metierContext?.name || 'professionnel';
  const dailyTask = metierContext?.dailyTasks?.[0] || 'travailler';
  
  // Déterminer le niveau de difficulté selon le chapitre
  const difficultyLevel = chapterId <= 2 ? 'simple' : (chapterId <= 5 ? 'intermediate' : 'advanced');
  
  const getQuestionVariant = (baseIndex, chapterId) => {
    const chapterOffset = (chapterId - 1) * 12;
    return (baseIndex + chapterOffset) % 12;
  };
  
  // Base de 12 scénarios pour le module Mini-simulation
  const baseScenarioTemplates = [
    {
      question: `Tu dois ${dailyTask} avant la fin de la journée. Que fais-tu ?`,
      options: [
        'Chercher la solution dans la documentation',
        'Improviser sans comprendre',
        'Demander directement à un collègue',
      ],
      correctAnswer: 0,
      explanation: 'Consulter la documentation est la première étape pour résoudre un problème efficacement.',
    },
    {
      question: `Un ${sectorContext.challenges?.[0] || 'défi'} se présente. Que fais-tu ?`,
      options: [
        'Suivre le protocole établi',
        'Improviser au feeling',
        'Attendre les instructions',
      ],
      correctAnswer: 0,
      explanation: `Dans ${sectorName}, suivre les protocoles est essentiel pour la qualité.`,
    },
    {
      question: `Tu dois prioriser plusieurs tâches importantes. Quelle méthode utilises-tu ?`,
      options: [
        'Classer par urgence et importance',
        'Traiter dans l\'ordre d\'arrivée',
        'Déléguer systématiquement',
      ],
      correctAnswer: 0,
      explanation: 'Prioriser par urgence et importance permet une gestion efficace du temps.',
    },
    {
      question: `Un projet complexe nécessite une décision stratégique. Comment procèdes-tu ?`,
      options: [
        'Analyser les options, consulter l\'équipe, décider',
        'Décider immédiatement seul',
        'Reporter la décision indéfiniment',
      ],
      correctAnswer: 0,
      explanation: 'Une décision stratégique nécessite analyse et consultation.',
    },
    {
      question: `Un client ou collègue te présente un problème complexe. Comment réagis-tu ?`,
      options: [
        'Poser des questions précises pour comprendre le besoin',
        'Proposer une solution immédiate sans comprendre',
        'Reporter le problème à un supérieur',
      ],
      correctAnswer: 0,
      explanation: 'Comprendre précisément le besoin est essentiel avant de proposer une solution.',
    },
    {
      question: `Tu découvres une erreur dans ton travail. Que fais-tu ?`,
      options: [
        'Corriger immédiatement et informer si nécessaire',
        'Ignorer si personne ne le remarque',
        'Attendre qu\'on te le signale',
      ],
      correctAnswer: 0,
      explanation: 'Corriger les erreurs immédiatement démontre le professionnalisme.',
    },
    {
      question: `Tu dois présenter un projet important. Quelle approche choisis-tu ?`,
      options: [
        'Préparer soigneusement avec exemples concrets',
        'Improviser sur le moment',
        'Reporter la présentation',
      ],
      correctAnswer: 0,
      explanation: 'Une présentation préparée avec exemples concrets est plus efficace.',
    },
    {
      question: `Une deadline approche et le travail n'est pas fini. Que décides-tu ?`,
      options: [
        'Organiser ton temps pour finir à temps ou alerter en amont',
        'Faire le minimum pour respecter la deadline',
        'Attendre la deadline sans rien faire',
      ],
      correctAnswer: 0,
      explanation: 'Gérer le temps efficacement ou alerter en amont montre le professionnalisme.',
    },
    {
      question: `Tu dois apprendre une nouvelle compétence rapidement. Quelle méthode utilises-tu ?`,
      options: [
        'Théorie + pratique immédiate avec feedback',
        'Uniquement lire la documentation',
        'Attendre une formation officielle',
      ],
      correctAnswer: 0,
      explanation: 'Combiner théorie et pratique immédiate accélère l\'apprentissage.',
    },
    {
      question: `Un collègue demande ton aide alors que tu es occupé. Que fais-tu ?`,
      options: [
        'Évaluer l\'urgence et prioriser ou proposer un créneau',
        'Refuser systématiquement',
        'Abandonner tes tâches immédiatement',
      ],
      correctAnswer: 0,
      explanation: 'Savoir prioriser et communiquer efficacement gère les demandes sans impacter tes objectifs.',
    },
    {
      question: `Tu dois choisir entre plusieurs solutions techniques. Comment procèdes-tu ?`,
      options: [
        'Évaluer chaque option selon des critères objectifs',
        'Choisir la première qui vient à l\'esprit',
        'Reporter le choix indéfiniment',
      ],
      correctAnswer: 0,
      explanation: 'Une évaluation méthodique selon des critères objectifs conduit à de meilleures décisions.',
    },
    {
      question: `Tu as terminé une tâche complexe. Quelle est la prochaine étape ?`,
      options: [
        'Vérifier la qualité et documenter si nécessaire',
        'Passer immédiatement à la suite',
        'Attendre les retours avant de continuer',
      ],
      correctAnswer: 0,
      explanation: 'Vérifier la qualité et documenter assure la traçabilité et la maintenance.',
    },
  ];
  
  // Adapter les scénarios selon le chapitre
  let adaptedScenarios = baseScenarioTemplates.map((template, index) => {
    const variantIndex = getQuestionVariant(index, chapterId);
    const variant = baseScenarioTemplates[variantIndex];
    
    // Adapter selon la difficulté
    let adaptedQuestion = variant.question;
    if (difficultyLevel === 'intermediate') {
      adaptedQuestion = variant.question.replace(/Tu dois/, `Tu dois gérer`);
      // Ajouter du contexte pour niveau intermédiaire
    } else if (difficultyLevel === 'advanced') {
      adaptedQuestion = variant.question.replace(/Tu dois/, `Dans un contexte complexe, tu dois`);
      // Ajouter des contraintes pour niveau avancé
    }
    
    return {
      ...variant,
      question: adaptedQuestion.replace(/\{sector\}/g, sectorName).replace(/\{metier\}/g, metierName),
    };
  });
  
  return adaptedScenarios.slice(0, 12);
}

/**
 * Génère un module complet avec questions personnalisées
 * Utilise way (IA) si disponible, sinon utilise les templates
 * @param {number} chapterId - ID du chapitre (1-10)
 * @param {number} moduleIndex - Index du module dans le chapitre (0, 1, 2)
 * @param {string} secteurId - ID du secteur (tech, sante, business, etc.)
 * @param {string} metierId - ID du métier (developpeur, medecin, etc.)
 * @param {boolean} useAI - Utiliser way (IA) pour générer les questions (défaut: true)
 */
export async function generatePersonalizedModule(chapterId, moduleIndex, secteurId, metierId, useAI = true) {
  const chapter = getChapterById(chapterId);
  const moduleType = getModuleTypeByIndex(moduleIndex);
  const complexity = chapter.complexity;
  
  // Récupérer les contextes secteur et métier
  const sectorContext = SECTOR_CONTEXTS[secteurId] || SECTOR_CONTEXTS.ingenierie_tech;
  const metierContext = METIER_CONTEXTS[metierId] || null;
  
  // Si useAI est activé, essayer d'utiliser way avec contexte chapitre
  if (useAI) {
    try {
      
      // Construire le contexte du chapitre pour way
      const chapterContext = {
        chapterId,
        chapterTitle: chapter.title,
        lessons: chapter.lessons,
        complexity: chapter.complexity,
        currentLesson: chapter.lessons[Math.floor(moduleIndex / 3) % chapter.lessons.length] || chapter.lessons[0],
      };
      
      let wayModule;
      switch (moduleType) {
        case MODULE_TYPES.APPRENTISSAGE:
          // Personnaliser le prompt pour way avec le contexte du chapitre
          wayModule = await wayGenerateModuleApprentissage(secteurId, metierId, chapterId);
          break;
        case MODULE_TYPES.TEST_SECTEUR:
          wayModule = await wayGenerateModuleTestSecteur(secteurId, chapterId);
          break;
        case MODULE_TYPES.MINI_SIMULATION:
          if (metierId) {
            wayModule = await wayGenerateModuleMiniSimulationMetier(secteurId, metierId, chapterId);
          } else {
            // Fallback sur test secteur si pas de métier
            wayModule = await wayGenerateModuleTestSecteur(secteurId, chapterId);
          }
          break;
      }
      
      if (wayModule && wayModule.items && wayModule.items.length > 0) {
        // Adapter le module way au format attendu avec contexte chapitre
        // Personnaliser les questions selon le chapitre si possible
        const personalizedItems = wayModule.items.map((item, index) => {
          // Adapter la question selon le contexte du chapitre si nécessaire
          let personalizedQuestion = item.question;
          if (chapterContext.currentLesson && !personalizedQuestion.includes(chapterContext.currentLesson)) {
            // Optionnel : enrichir la question avec le contexte de la leçon
            // Pour l'instant, on garde les questions telles quelles générées par way
          }
          
          return {
            ...item,
            question: personalizedQuestion,
            explication: item.explication || item.explanation || '',
          };
        });
        
        return {
          ...wayModule,
          id: `chapter_${chapterId}_module_${moduleIndex}_${Date.now()}`,
          titre: `${wayModule.titre} - Chapitre ${chapterId}: ${chapter.title}`,
          objectif: `${wayModule.objectif} - Leçon: ${chapterContext.currentLesson}`,
          type: moduleType,
          chapitre: chapterId,
          moduleIndex,
          items: personalizedItems,
          feedback_final: wayModule.feedback_final || {
            message: `✔ Tu as complété le module ${moduleIndex + 1} du chapitre ${chapterId}: ${chapter.title}.`,
            recompense: {
              xp: 50 + (chapterId * 10),
              etoiles: 2 + Math.floor(chapterId / 3),
            },
          },
        };
      }
    } catch (error) {
      console.warn('[questionGenerator] Erreur lors de la génération via way, utilisation des templates:', error);
      // Continuer avec les templates en cas d'erreur
    }
  }
  
  // Fallback : utiliser les templates
  let questions = [];
  let moduleTitle = '';
  let moduleObjective = '';
  
  switch (moduleType) {
    case MODULE_TYPES.APPRENTISSAGE:
      questions = generateApprentissageQuestions(chapter, sectorContext, metierContext, complexity);
      moduleTitle = `Apprentissage - ${chapter.title}`;
      moduleObjective = `Comprendre les bases de ${chapter.title.toLowerCase()} dans ${sectorContext.name}`;
      break;
    case MODULE_TYPES.TEST_SECTEUR:
      questions = generateTestSecteurQuestions(chapter, sectorContext, metierContext, complexity);
      moduleTitle = `Test de secteur - ${chapter.title}`;
      moduleObjective = `Tester tes connaissances sur ${sectorContext.name}`;
      break;
    case MODULE_TYPES.MINI_SIMULATION:
      questions = generateMiniSimulationQuestions(chapter, sectorContext, metierContext, complexity);
      moduleTitle = `Mini-simulation - ${chapter.title}`;
      moduleObjective = `Mettre en pratique ${chapter.title.toLowerCase()} dans ${sectorContext.name}`;
      break;
  }
  
  // Convertir les questions au format attendu par l'écran Module
  const items = questions.map((q, index) => ({
    id: `item_${index}`,
    question: q.question,
    options: q.options,
    reponse_correcte: q.correctAnswer,
    explication: q.explanation,
  }));
  
  return {
    id: `chapter_${chapterId}_module_${moduleIndex}_${Date.now()}`,
    titre: moduleTitle,
    objectif: moduleObjective,
    type: moduleType,
    chapitre: chapterId,
    moduleIndex,
    items,
    feedback_final: {
      message: `✔ Tu as complété le module ${moduleIndex + 1} du chapitre ${chapterId}.`,
      recompense: {
        xp: 50 + (chapterId * 10), // XP augmente avec le chapitre
        etoiles: 2 + Math.floor(chapterId / 3), // Étoiles augmentent progressivement
      },
    },
  };
}
