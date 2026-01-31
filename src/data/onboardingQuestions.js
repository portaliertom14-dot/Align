/**
 * Données des 6 écrans de questions onboarding Align
 * Design strict : une question + texte explicatif (variant 1 ou 2) + blocs de réponses
 * explanatoryVariant: 1 ou 2 (voir specs)
 */
export const ONBOARDING_QUESTIONS = [
  {
    id: 'feelings',
    question: "QUAND TU PENSES À TON AVENIR, QU'EST CE QUE TU RESSENS ?",
    explanatoryVariant: 1,
    answers: [
      'Du stress',
      'De la peur',
      "De l'incertitude",
      "De l'indifférence",
      'De la clarté',
      "De l'enthousiasme",
    ],
  },
  {
    id: 'hear_about',
    question: "OU AS-TU ENTENDU PARLER D'ALIGN ?",
    explanatoryVariant: 2,
    answers: [
      'TikTok',
      'Instagram',
      'Facebook',
      'LinkedIn',
      'Famille/Amis',
      'TV',
      'Autre..',
    ],
  },
  {
    id: 'why_open',
    question: "QU'EST CE QUI TA DONNÉ ENVIE D'OUVRIR ALIGN AUJOURD'HUI ?",
    explanatoryVariant: 1,
    answers: [
      'Je suis perdu sur mon avenir',
      'Je veux y voir plus clair',
      'Je veux être sur de ne pas me tromper sur mon projet d\'avenir',
      "J'ai envie de savoir ce qui pourrait me correspondre",
      "Je sais pas trop, je suis curieux",
    ],
  },
  {
    id: 'school_level',
    question: 'QUEL EST TON NIVEAU SCOLAIRE ?',
    explanatoryVariant: 2,
    answers: [
      'Seconde Professionnelle',
      'Seconde Générale',
      'Première Professionnelle',
      'Première Technologique',
      'Première Générale',
      'Terminale Professionnelle',
      'Terminale Technologique',
      'Terminale Générale',
    ],
  },
  {
    id: 'professional_idea',
    question: "EST CE QUE TU AS DÉJÀ UNE OU PLUSIEURS IDÉE POUR TON AVENIR PROFESSIONEL ?",
    explanatoryVariant: 2,
    answers: [
      'Non pas du tout',
      'Oui vaguement',
      'Oui mais je ne suis pas sûr',
      'Oui plutôt clairement',
    ],
  },
  {
    id: 'clarify',
    question: "QU'EST CE QUE TU AIMERAIS CLARIFIER OU CONSTRUIRE POUR TON AVENIR ?",
    explanatoryVariant: 1,
    answers: [
      'Trouver une direction claire',
      'Identifier un métier qui me correspond vraiment',
      'Transformer une idée floue en projet réel',
      'Être sûr de ne pas me tromper',
    ],
  },
];

/** Variantes du texte explicatif (une seule par écran) */
export const EXPLANATORY_TEXTS = {
  1: "Répond simplement à l'affirmation qui te ressemble le plus. Il n'y a pas de bonne ou de mauvaise réponse.",
  2: "Répond simplement il n'y a pas de bonnes ou de mauvaises réponses.",
};

/** Nombre d'écrans de questions (sans l'interlude ni la date de naissance) */
export const TOTAL_STEPS = ONBOARDING_QUESTIONS.length;

/** Nombre total d'étapes onboarding avec barre de progression : 6 questions + 1 birthdate (l'interlude n'est pas compté) */
export const ONBOARDING_TOTAL_STEPS = 7;
