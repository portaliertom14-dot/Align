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
      "Je me sens perdu et j'ai peur de me tromper",
      "Franchement, je m'en fiche un peu",
      'Je me sens plutôt confiant',
      "Je suis excité par l'avenir",
    ],
  },
  // COUPLAGE : cette entrée est à l’index 1 — lue comme `answers[1]` (niveau scolaire) dans
  // `OnboardingQuestionsScreen.js` → `OnboardingInterlude` / Parcoursup. Si tu réordonnes le tableau,
  // mets à jour l’index dans `OnboardingQuestionsScreen.js` (handleComplete), pas seulement dans une doc externe.
  {
    id: 'school_level',
    question: 'QUEL EST TON NIVEAU SCOLAIRE ?',
    explanatoryVariant: 3,
    answers: [
      'Seconde',
      'Première',
      'Terminale',
      'Post-bac / Autre',
    ],
  },
  {
    id: 'professional_idea',
    question: "T'AS DÉJÀ UNE IDÉE POUR TON AVENIR ?",
    explanatoryVariant: 2,
    answers: [
      'Non, aucune idée',
      'Oui, mais c’est flou',
      'Oui, j’ai une idée précise',
    ],
  },
  {
    id: 'clarify',
    question: "QU'EST-CE QUE TU VEUX VRAIMENT ?",
    explanatoryVariant: 1,
    answers: [
      'Trouver une direction générale',
      'Identifier un métier précis',
      'Transformer une idée floue en plan concret',
      'Être sûr de ne pas me tromper',
    ],
  },
  {
    id: 'hear_about',
    question: "OU AS-TU ENTENDU PARLER D'ALIGN ?",
    explanatoryVariant: 2,
    answers: [
      'TikTok',
      'Instagram',
      'Bouche à oreille',
      'YouTube',
      'Autre',
    ],
  },
  {
    id: 'why_open',
    question: "QU'EST CE QUI TA DONNÉ ENVIE D'OUVRIR ALIGN AUJOURD'HUI ?",
    explanatoryVariant: 1,
    answers: [
      "Je suis perdu et j'ai besoin de clarté",
      'Je veux confirmer ou affiner une idée',
      'Je suis juste curieux',
    ],
  },
];

/** Variantes du texte explicatif (une seule par écran) */
export const EXPLANATORY_TEXTS = {
  1: "Choisis ce qui te ressemble le plus.",
  2: "Répond simplement il n'y a pas de bonnes ou mauvaises réponses",
  3: "Répond simplement il n'y a pas de bonnes ou mauvaises réponses",
};

/** Nombre d'écrans de questions (sans l'interlude ni la date de naissance) */
export const TOTAL_STEPS = ONBOARDING_QUESTIONS.length;

/** Nombre total d'étapes onboarding avec barre de progression : 6 questions (l'interlude n'est pas compté) */
export const ONBOARDING_TOTAL_STEPS = 6;
