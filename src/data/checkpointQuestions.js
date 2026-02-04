/**
 * Les 9 questions des checkpoints (3 par checkpoint).
 * Format : { question, options: [string, string, string] }
 * CP1 = clé motivation | CP2 = clé projection | CP3 = clé rassurance
 */
export const CHECKPOINT_1_QUESTIONS = [
  {
    question: "Qu'est-ce qui te motive le plus dans ce que tu fais ?",
    options: [
      "Voir le résultat concret de mon travail",
      "Apprendre et progresser chaque jour",
      "Le défi et l'adrénaline",
    ],
  },
  {
    question: "Qu'est-ce qui te donne envie d'avancer ?",
    options: [
      "Avoir un objectif clair à atteindre",
      "Me sentir utile aux autres",
      "La variété et la nouveauté",
    ],
  },
  {
    question: "Qu'est-ce qui te plaît instinctivement dans ce métier ?",
    options: [
      "Le côté créatif ou technique",
      "Le contact avec les autres",
      "La logique et l'organisation",
    ],
  },
];

export const CHECKPOINT_2_QUESTIONS = [
  {
    question: "Est-ce que tu te projettes facilement dans le quotidien de ce métier ?",
    options: [
      "Oui, je me vois déjà le faire",
      "Pas encore, mais j'aimerais voir concrètement",
      "Non, j'ai du mal à m'imaginer",
    ],
  },
  {
    question: "Tu te vois faire ce métier dans quelques années ?",
    options: [
      "Oui, clairement",
      "Peut-être, si ça correspond à ce que je découvre",
      "Je ne sais pas",
    ],
  },
  {
    question: "Si tu imagines une journée type dans ce métier, tu te sens plutôt :",
    options: [
      "À l'aise, ça me parle",
      "Curieux d'en savoir plus",
      "Pas à ma place",
    ],
  },
];

export const CHECKPOINT_3_QUESTIONS = [
  {
    question: "Est-ce que tu te sens légitime pour envisager ce métier ?",
    options: [
      "Oui, j'ai des atouts pour ça",
      "Pas encore, mais je peux progresser",
      "Non, ça me semble hors de portée",
    ],
  },
  {
    question: "Ta confiance pour te lancer dans cette voie a plutôt :",
    options: [
      "Augmenté au fil des questions",
      "Un peu varié, j'hésite encore",
      "Baissé, je me sens moins sûr",
    ],
  },
  {
    question: "Aujourd'hui, tu dirais plutôt :",
    options: [
      "Je peux y arriver",
      "Je veux encore vérifier si c'est pour moi",
      "Ce n'est pas pour moi",
    ],
  },
];

export const SUBTITLE = "Réponds simplement à l'affirmation qui te ressemble le plus, il n'y a pas de bonnes ou de mauvaises réponses.";
