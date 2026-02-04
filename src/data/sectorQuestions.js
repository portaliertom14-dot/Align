/**
 * Questions de test de connaissance pour chaque secteur
 * Ces questions servent à tester la familiarité avec le secteur déterminé
 */

export const sectorQuestions = {
  droit_argumentation: [
    {
      id: 1,
      question: 'Qu\'est-ce qu\'un contrat de travail à durée indéterminée ?',
      options: [
        'Un contrat qui peut être rompu à tout moment',
        'Un contrat sans date de fin, rompu uniquement en cas de démission, licenciement ou rupture conventionnelle',
        'Un contrat qui dure un an maximum',
        'Un contrat exclusif au secteur public',
      ],
      correctAnswer: 1,
    },
    {
      id: 2,
      question: 'Qu\'est-ce que le principe de la présomption d\'innocence ?',
      options: [
        'Toute personne est considérée coupable jusqu\'à preuve du contraire',
        'Toute personne accusée est considérée innocente jusqu\'à ce que sa culpabilité soit établie par un tribunal',
        'Les avocats doivent toujours défendre leurs clients',
        'Le juge doit toujours croire l\'accusation',
      ],
      correctAnswer: 1,
    },
    {
      id: 3,
      question: 'Qu\'est-ce qu\'une loi ?',
      options: [
        'Une suggestion du gouvernement',
        'Une règle écrite votée par le Parlement et promulguée par le Président',
        'Une coutume ancienne',
        'Un avis juridique',
      ],
      correctAnswer: 1,
    },
  ],
  arts_communication: [
    {
      id: 1,
      question: 'Qu\'est-ce que l\'art de raconter une histoire pour transmettre un message ?',
      options: [
        'Une technique de vente uniquement',
        'Raconter une histoire pour transmettre un message ou une émotion',
        'Un type de roman',
        'Une méthode de communication écrite',
      ],
      correctAnswer: 1,
    },
    {
      id: 2,
      question: 'Qu\'est-ce qu\'une charte graphique ?',
      options: [
        'Un document qui définit les règles visuelles d\'une marque (couleurs, polices, logos)',
        'Un graphique statistique',
        'Un tableau de bord',
        'Un document juridique',
      ],
      correctAnswer: 0,
    },
    {
      id: 3,
      question: 'Qu\'est-ce que l\'animation des réseaux sociaux pour une marque ?',
      options: [
        'La gestion d\'une communauté de développeurs',
        'Animer et gérer les communautés sur les réseaux sociaux pour une marque',
        'La gestion d\'une association',
        'Un type de marketing téléphonique',
      ],
      correctAnswer: 1,
    },
  ],
  commerce_entrepreneuriat: [
    {
      id: 1,
      question: 'Qu\'est-ce qu\'un modèle économique ?',
      options: [
        'Un modèle de commerce en ligne uniquement',
        'La façon dont une entreprise crée, livre et gagne de la valeur',
        'Un modèle d\'affaires uniquement pour les startups',
        'Un document comptable',
      ],
      correctAnswer: 1,
    },
    {
      id: 2,
      question: 'Qu\'est-ce qu\'une présentation courte d\'un projet ?',
      options: [
        'Un document long et détaillé',
        'Une présentation courte et percutante d\'une idée, d\'un projet ou d\'une entreprise',
        'Un type de publicité',
        'Une réunion d\'équipe',
      ],
      correctAnswer: 1,
    },
    {
      id: 3,
      question: 'Qu\'est-ce que le coût d\'acquisition d\'un client ?',
      options: [
        'Le coût de fabrication d\'un produit',
        'Le coût total pour obtenir un nouveau client',
        'Le coût de gestion d\'une entreprise',
        'Le coût de publicité mensuel',
      ],
      correctAnswer: 1,
    },
  ],
  sciences_technologies: [
    {
      id: 1,
      question: 'Qu\'est-ce que l\'intelligence artificielle (IA) ?',
      options: [
        'Un robot humanoïde',
        'Des systèmes informatiques capables de simuler certaines capacités cognitives humaines',
        'Un langage de programmation',
        'Un type d\'ordinateur',
      ],
      correctAnswer: 1,
    },
    {
      id: 2,
      question: 'Qu\'est-ce que l\'apprentissage automatique ?',
      options: [
        'Apprendre un langage de programmation',
        'Une méthode où un système apprend à partir de données sans tout coder à la main',
        'La réparation d\'ordinateurs',
        'La création de machines physiques',
      ],
      correctAnswer: 1,
    },
    {
      id: 3,
      question: 'Qu\'est-ce qu\'une interface entre logiciels ?',
      options: [
        'Une application mobile',
        'Un moyen pour différents logiciels d\'échanger des données entre eux',
        'Un type de base de données',
        'Un système d\'exploitation',
      ],
      correctAnswer: 1,
    },
  ],
  sciences_humaines_sociales: [
    {
      id: 1,
      question: 'Qu\'est-ce que la psychologie sociale ?',
      options: [
        'L\'étude des comportements individuels uniquement',
        'L\'étude de la façon dont les pensées, sentiments et comportements sont influencés par la présence réelle ou imaginaire d\'autrui',
        'L\'étude de la société moderne',
        'Une méthode thérapeutique',
      ],
      correctAnswer: 1,
    },
    {
      id: 2,
      question: 'Qu\'est-ce qu\'une étude sociologique ?',
      options: [
        'Une enquête d\'opinion',
        'Une recherche scientifique sur les comportements et structures sociales',
        'Un sondage politique',
        'Une analyse historique',
      ],
      correctAnswer: 1,
    },
    {
      id: 3,
      question: 'Qu\'est-ce que la communication non verbale ?',
      options: [
        'Les gestes uniquement',
        'Tous les échanges qui ne passent pas par les mots (gestes, expressions, posture, ton)',
        'La communication écrite',
        'Le langage des signes uniquement',
      ],
      correctAnswer: 1,
    ],
  ],
};

/**
 * Récupère les questions pour un secteur donné
 */
export function getSectorQuestions(serieId) {
  return sectorQuestions[serieId] || [];
}

/**
 * Calcule le score de familiarité (pourcentage)
 */
export function calculateFamiliarityScore(answers, serieId) {
  const questions = getSectorQuestions(serieId);
  if (questions.length === 0) return 0;

  let correctAnswers = 0;
  questions.forEach((question, index) => {
    if (answers[index] === question.correctAnswer) {
      correctAnswers++;
    }
  });

  return Math.round((correctAnswers / questions.length) * 100);
}
