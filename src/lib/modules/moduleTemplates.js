/**
 * Templates de modules Align
 * 10 templates minimum pour éviter la répétition
 * Chaque template est adapté à TOUS les secteurs et peut être personnalisé par ALINE
 */

export const MODULE_TEMPLATES = {
  // 1. Test de compréhension réelle
  TEST_COMPREHENSION: {
    id: 'test_comprehension',
    baseType: 'test',
    generateModule: (profile) => {
      const { secteur, metier, niveau } = profile;
      const scenarios = {
        droit_argumentation: {
          title: 'Test de compréhension : Analyse d\'un cas juridique',
          objective: 'Comprendre un cas réel du secteur juridique',
          instructions: 'Lis attentivement ce cas fictif : "Un commerçant a signé un contrat de location commerciale. Après 6 mois, le propriétaire augmente le loyer de 40% sans préavis."',
          deliverable: 'Explique en 3-5 phrases pourquoi cette augmentation peut être contestée ou non. Identifie les éléments clés du problème.',
          duration: 10, // minutes
        },
        sciences_technologies: {
          title: 'Test de compréhension : Logique algorithmique',
          objective: 'Comprendre un problème technique réel',
          instructions: 'Un système doit trier 1000 commandes par priorité. Chaque commande a un délai et une valeur. Quelle approche logique utiliserais-tu ?',
          deliverable: 'Explique ta méthode en 3-5 phrases. Pourquoi cette approche plutôt qu\'une autre ?',
          duration: 12,
        },
        arts_communication: {
          title: 'Test de compréhension : Message visuel',
          objective: 'Comprendre l\'impact d\'un message créatif',
          instructions: 'Analyse cette situation : une publicité utilise une image forte pour un produit banal. Le message est controversé mais mémorable.',
          deliverable: 'En 3-5 phrases, explique pourquoi cette approche fonctionne ou non. Quels sont les risques et bénéfices ?',
          duration: 8,
        },
        commerce_entrepreneuriat: {
          title: 'Test de compréhension : Défi commercial',
          objective: 'Comprendre une situation business réelle',
          instructions: 'Une startup lance un produit innovant mais le marché est saturé. Les premiers clients sont difficiles à trouver.',
          deliverable: 'En 3-5 phrases, explique les défis principaux et propose une approche pour les surmonter.',
          duration: 10,
        },
        sciences_humaines_sociales: {
          title: 'Test de compréhension : Situation sociale',
          objective: 'Comprendre une problématique sociale complexe',
          instructions: 'Dans un quartier, les jeunes rencontrent des difficultés d\'insertion professionnelle malgré des formations disponibles.',
          deliverable: 'En 3-5 phrases, analyse les causes possibles et propose une piste d\'action.',
          duration: 10,
        },
      };

      const scenario = scenarios[secteur] || scenarios.droit_argumentation;
      return {
        ...scenario,
        type: 'test',
        validation: 'ia',
        reward: { stars: 2, xp: 50 },
        difficulty: niveau || 1,
      };
    },
  },

  // 2. Défi de projection métier
  DEFI_PROJECTION: {
    id: 'defi_projection',
    baseType: 'defi',
    generateModule: (profile) => {
      const { metier, secteur } = profile;
      const metierName = typeof metier === 'string' ? metier : metier?.name || metier?.id || 'ce métier';
      const projections = {
        avocat: {
          title: 'Défi : Projette-toi dans ce métier',
          objective: 'Tester ta vision du métier d\'avocat',
          instructions: 'Imagine une journée type d\'un avocat débutant. Il a 3 dossiers : un client qui veut divorcer, un entrepreneur qui démarre sa boîte, et une personne accusée d\'infraction.',
          deliverable: 'Décris comment tu gérerais cette journée. Quelles priorités ? Quels défis ? (5-7 phrases)',
          duration: 15,
        },
        developpeur: {
          title: 'Défi : Projette-toi dans ce métier',
          objective: 'Tester ta vision du métier de développeur',
          instructions: 'Tu dois livrer une fonctionnalité critique dans 3 jours. Le code existant est complexe et tu découvres un bug majeur en cours de route.',
          deliverable: 'Décris ta stratégie pour gérer cette situation. Comment prioriser ? (5-7 phrases)',
          duration: 12,
        },
        graphiste: {
          title: 'Défi : Projette-toi dans ce métier',
          objective: 'Tester ta vision du métier de graphiste',
          instructions: 'Un client te demande un logo "moderne et professionnel" mais sans autre indication. Il rejette tes 3 premières propositions sans explication claire.',
          deliverable: 'Comment approches-tu ce type de situation ? Quelle méthode utilises-tu ? (5-7 phrases)',
          duration: 10,
        },
        commercial: {
          title: 'Défi : Projette-toi dans ce métier',
          objective: 'Tester ta vision du métier commercial',
          instructions: 'Tu dois convaincre un prospect réticent d\'acheter un service coûteux. Il a déjà testé la concurrence et n\'est pas convaincu.',
          deliverable: 'Décris ta stratégie d\'approche. Comment construis-tu ta relation ? (5-7 phrases)',
          duration: 12,
        },
        psychologue: {
          title: 'Défi : Projette-toi dans ce métier',
          objective: 'Tester ta vision du métier de psychologue',
          instructions: 'Un patient arrive très anxieux. Il a du mal à s\'exprimer et semble avoir peur du jugement. Comment crées-tu un espace de confiance ?',
          deliverable: 'Décris ton approche. Quelles techniques utilises-tu ? (5-7 phrases)',
          duration: 15,
        },
      };

      const metierKey = typeof metier === 'string' ? metier : metier?.id || metier?.name || '';
      const projection = projections[metierKey] || {
        title: 'Défi : Projette-toi dans ce métier',
        objective: 'Tester ta vision du métier',
        instructions: `Imagine une journée type dans le métier de ${metierName}. Quels seraient tes défis principaux ?`,
        deliverable: 'Décris cette journée et tes méthodes de travail (5-7 phrases)',
        duration: 12,
      };

      return {
        ...projection,
        type: 'defi',
        validation: 'ia',
        reward: { stars: 3, xp: 75 },
        difficulty: profile.niveau || 1,
      };
    },
  },

  // 3. Mini-analyse de situation
  MINI_ANALYSE: {
    id: 'mini_analyse',
    baseType: 'analyse',
    generateModule: (profile) => {
      const { secteur, niveau } = profile;
      const analyses = {
        droit_argumentation: {
          title: 'Mini-analyse : Cas juridique complexe',
          objective: 'Analyser une situation juridique réelle',
          instructions: 'Un employé est licencié pour faute grave après avoir refusé d\'exécuter une tâche qu\'il juge dangereuse. Il a alerté son supérieur par écrit.',
          deliverable: 'Analyse les aspects légaux. Quels arguments pour chaque partie ? (8-10 phrases)',
          duration: 15,
        },
        sciences_technologies: {
          title: 'Mini-analyse : Problème technique',
          objective: 'Analyser un problème technique réel',
          instructions: 'Une application mobile plante régulièrement sur certains appareils. Les logs montrent des erreurs de mémoire mais seulement sur Android.',
          deliverable: 'Analyse les causes possibles. Quelle méthodologie d\'investigation ? (8-10 phrases)',
          duration: 18,
        },
        arts_communication: {
          title: 'Mini-analyse : Stratégie de communication',
          objective: 'Analyser une stratégie de communication',
          instructions: 'Une marque veut cibler les 18-25 ans mais ses campagnes actuelles ne génèrent pas d\'engagement. Les contenus sont trop institutionnels.',
          deliverable: 'Analyse les problèmes et propose une direction stratégique (8-10 phrases)',
          duration: 12,
        },
        commerce_entrepreneuriat: {
          title: 'Mini-analyse : Situation business',
          objective: 'Analyser une situation business réelle',
          instructions: 'Un produit connaît un pic de ventes mais les retours clients sont mitigés. Les ventes ralentissent rapidement après le pic.',
          deliverable: 'Analyse les causes et propose des actions correctives (8-10 phrases)',
          duration: 15,
        },
        sciences_humaines_sociales: {
          title: 'Mini-analyse : Comportement social',
          objective: 'Analyser un comportement ou phénomène social',
          instructions: 'Dans un groupe de jeunes, certains membres prennent systématiquement la parole tandis que d\'autres restent silencieux malgré leur expertise.',
          deliverable: 'Analyse les dynamiques en jeu. Quels mécanismes psychosociaux ? (8-10 phrases)',
          duration: 15,
        },
      };

      const analyse = analyses[secteur] || analyses.droit_argumentation;
      return {
        ...analyse,
        type: 'analyse',
        validation: 'ia',
        reward: { stars: 3, xp: 80 },
        difficulty: niveau || 1,
      };
    },
  },

  // 4. Choix stratégique
  CHOIX_STRATEGIQUE: {
    id: 'choix_strategique',
    baseType: 'choix',
    generateModule: (profile) => {
      const { secteur, metier } = profile;
      const metierName = typeof metier === 'string' ? metier : metier?.name || metier?.id || 'ce métier';
      return {
        title: 'Choix stratégique : Décision importante',
        objective: 'Tester ta capacité à prendre des décisions stratégiques',
        instructions: `Dans le contexte du métier de ${metierName}, tu dois faire un choix entre deux options : A) Sécuriser un client important avec un contrat à long terme mais peu rémunérateur, ou B) Prendre des risques avec un projet innovant qui peut échouer ou réussir fortement.`,
        deliverable: 'Fais ton choix et justifie-le en expliquant ta logique (6-8 phrases). Quels critères as-tu utilisés ?',
        type: 'choix',
        validation: 'ia',
        reward: { stars: 2, xp: 60 },
        duration: 10,
        difficulty: profile.niveau || 1,
      };
    },
  },

  // 5. Test de motivation
  TEST_MOTIVATION: {
    id: 'test_motivation',
    baseType: 'test',
    generateModule: (profile) => {
      const { secteur, metier } = profile;
      const metierName = typeof metier === 'string' ? metier : metier?.name || metier?.id || 'ce métier';
      return {
        title: 'Test de motivation : Pourquoi ce métier ?',
        objective: 'Tester ta motivation réelle pour ce métier',
        instructions: `Réponds sincèrement : Pourquoi le métier de ${metierName} t'attire ? Qu'est-ce qui te motive vraiment ? Qu'est-ce qui t'inquiète ?`,
        deliverable: 'Exprime ta motivation et tes doutes de manière sincère (7-10 phrases).',
        type: 'test',
        validation: 'ia',
        reward: { stars: 4, xp: 70 },
        duration: 12,
        difficulty: profile.niveau || 1,
      };
    },
  },

  // 6. Mission créative
  MISSION_CREATIVE: {
    id: 'mission_creative',
    baseType: 'mission',
    generateModule: (profile) => {
      const { secteur, metier } = profile;
      const missions = {
        arts_communication: {
          title: 'Mission créative : Créer un concept',
          objective: 'Tester ta créativité',
          instructions: 'Imagine une campagne publicitaire pour sensibiliser les jeunes à un enjeu qui te tient à cœur. Quel serait ton angle créatif ?',
          deliverable: 'Décris ton concept en détail. Quel message ? Quel ton ? Quel support ? (8-10 phrases)',
          duration: 15,
        },
        sciences_technologies: {
          title: 'Mission créative : Solution innovante',
          objective: 'Tester ta créativité technique',
          instructions: 'Propose une solution créative à un problème du quotidien en utilisant la technologie de manière simple et accessible.',
          deliverable: 'Décris ta solution. Comment fonctionne-t-elle ? Pourquoi est-elle créative ? (8-10 phrases)',
          duration: 18,
        },
        default: {
          title: 'Mission créative : Projet personnel',
          objective: 'Tester ta créativité',
          instructions: `Dans le contexte du métier, imagine un projet créatif qui te permettrait de t'exprimer tout en étant utile.`,
          deliverable: 'Décris ton projet en détail (8-10 phrases).',
          duration: 15,
        },
      };

      const mission = missions[secteur] || missions.default;
      return {
        ...mission,
        type: 'mission',
        validation: 'ia',
        reward: { stars: 3, xp: 85 },
        duration: mission.duration,
        difficulty: profile.niveau || 1,
      };
    },
  },

  // 7. Défi de logique
  DEFI_LOGIQUE: {
    id: 'defi_logique',
    baseType: 'defi',
    generateModule: (profile) => {
      const { secteur, niveau } = profile;
      const defis = {
        droit_argumentation: {
          title: 'Défi logique : Construction d\'argument',
          objective: 'Tester ta logique argumentative',
          instructions: 'Tu dois défendre une position que tu ne partages pas forcément. Construis un argument solide et structuré pour : "Les réseaux sociaux doivent être interdits aux moins de 16 ans".',
          deliverable: 'Construis un argument logique en 3 points (6-8 phrases).',
          duration: 12,
        },
        sciences_technologies: {
          title: 'Défi logique : Résolution de problème',
          objective: 'Tester ta logique algorithmique',
          instructions: 'Un système doit vérifier si 3 personnes peuvent se rencontrer dans une semaine. Chacune a des contraintes horaires différentes. Quelle approche logique utiliserais-tu ?',
          deliverable: 'Décris ta méthode logique étape par étape (6-8 phrases).',
          duration: 15,
        },
        default: {
          title: 'Défi logique : Raisonnement structuré',
          objective: 'Tester ta logique',
          instructions: 'Un problème complexe nécessite une approche méthodique. Décris comment tu structures ta réflexion pour résoudre un problème non familier.',
          deliverable: 'Explique ta méthode de raisonnement (6-8 phrases).',
          duration: 12,
        },
      };

      const defi = defis[secteur] || defis.default;
      return {
        ...defi,
        type: 'defi',
        validation: 'ia',
        reward: { stars: 2, xp: 65 },
        duration: defi.duration,
        difficulty: niveau || 1,
      };
    },
  },

  // 8. Défi de rapidité
  DEFI_RAPIDITE: {
    id: 'defi_rapidite',
    baseType: 'defi',
    generateModule: (profile) => {
      const { secteur, metier } = profile;
      const metierName = typeof metier === 'string' ? metier : (typeof metier === 'object' && metier?.name) || (typeof metier === 'object' && metier?.id) || 'ce métier';
      return {
        title: 'Défi de rapidité : Réaction sous contrainte',
        objective: 'Tester ta réactivité',
        instructions: `Imagine que tu es ${metierName} et qu'un client/projet urgent arrive. Tu as 5 minutes pour donner une première réponse professionnelle. Que fais-tu en priorité ?`,
        deliverable: 'Décris ton plan d\'action immédiat en 3 étapes claires (5-7 phrases).',
        type: 'defi',
        validation: 'ia',
        reward: { stars: 2, xp: 55 },
        duration: 8,
        difficulty: profile.niveau || 1,
      };
    },
  },

  // 9. Mini-projet personnel
  MINI_PROJET: {
    id: 'mini_projet',
    baseType: 'projet',
    generateModule: (profile) => {
      const { secteur, metier } = profile;
      const metierName = typeof metier === 'string' ? metier : metier?.name || metier?.id || 'ce métier';
      return {
        title: 'Mini-projet : Projet personnel réaliste',
        objective: 'Tester ta capacité à structurer un projet',
        instructions: `Imagine un petit projet personnel lié au métier de ${metierName} que tu aimerais réaliser. Il doit être concret et faisable en quelques semaines.`,
        deliverable: 'Décris ton projet : objectif, étapes principales, difficultés attendues (10-12 phrases).',
        type: 'projet',
        validation: 'ia',
        reward: { stars: 4, xp: 90 },
        duration: 20,
        difficulty: profile.niveau || 1,
      };
    },
  },

  // 10. Test de constance (sur plusieurs jours)
  TEST_CONSTANCE: {
    id: 'test_constance',
    baseType: 'test',
    generateModule: (profile) => {
      const { secteur, metier } = profile;
      const metierName = typeof metier === 'string' ? metier : metier?.name || metier?.id || 'ce métier';
      return {
        title: 'Test de constance : Engagement sur 3 jours',
        objective: 'Tester ta constance et ta motivation',
        instructions: `Pendant 3 jours, tu vas te documenter sur le métier de ${metierName}. Chaque jour, note ce que tu apprends et tes réflexions (minimum 3 phrases par jour).`,
        deliverable: 'Jour 1 : Complète ton premier jour d\'observation (3-5 phrases). Les jours 2 et 3 seront débloqués progressivement.',
        type: 'test',
        validation: 'ia',
        reward: { stars: 5, xp: 100 },
        duration: 15, // par jour
        difficulty: profile.niveau || 1,
        multiDay: true,
      };
    },
  },
};

/**
 * Liste des IDs de templates pour sélection aléatoire
 */
export const TEMPLATE_IDS = Object.keys(MODULE_TEMPLATES);







