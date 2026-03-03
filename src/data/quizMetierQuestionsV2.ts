/**
 * QUIZ MÉTIER V2 — 30 questions (metier_1..metier_30) pour le moteur par axes.
 * Structure, valeurs et sens conservés, formulation simplifiée.
 */

export interface QuizMetierOption {
  label: string;
  value: 'A' | 'B' | 'C';
}

export interface QuizMetierQuestionV2 {
  id: string;
  question: string;
  options: QuizMetierOption[];
}

export const quizMetierQuestionsV2: QuizMetierQuestionV2[] = [
  {
    id: 'metier_1',
    question: 'Tu préfères un travail où tu :',
    options: [
      { label: 'utilises bien des outils précis', value: 'A' },
      { label: 'inventes des idées nouvelles', value: 'B' },
      { label: 'passes vite à l’action sur le terrain', value: 'C' },
    ],
  },
  {
    id: 'metier_2',
    question: 'Ton rythme idéal au travail :',
    options: [
      { label: 'calme et bien organisé', value: 'A' },
      { label: 'qui change selon tes envies', value: 'B' },
      { label: 'rapide et intense', value: 'C' },
    ],
  },
  {
    id: 'metier_3',
    question: 'Tu veux que ton travail apporte surtout :',
    options: [
      { label: 'une vraie compétence reconnue', value: 'A' },
      { label: 'beaucoup de liberté pour créer', value: 'B' },
      { label: 'des résultats visibles très vite', value: 'C' },
    ],
  },
  {
    id: 'metier_4',
    question: 'Dans une journée type, tu préfères :',
    options: [
      { label: 'réfléchir et résoudre des problèmes', value: 'A' },
      { label: 'imaginer et créer des choses', value: 'B' },
      { label: 'faire les tâches et les finir', value: 'C' },
    ],
  },
  {
    id: 'metier_5',
    question: 'Pour apprendre un métier tu préfères :',
    options: [
      { label: 'un cours bien organisé et clair', value: 'A' },
      { label: 'faire des projets concrets', value: 'B' },
      { label: 'apprendre surtout en faisant', value: 'C' },
    ],
  },
  {
    id: 'metier_6',
    question: 'Ton rapport au risque :',
    options: [
      { label: 'je n’aime pas trop le risque', value: 'A' },
      { label: 'j’aime essayer parfois', value: 'B' },
      { label: 'j’adore quand ça bouge et que c’est risqué', value: 'C' },
    ],
  },
  {
    id: 'metier_7',
    question: 'Tu préfères travailler :',
    options: [
      { label: 'seul·e ou avec très peu de personnes', value: 'A' },
      { label: 'avec une équipe créative', value: 'B' },
      { label: 'avec une équipe très active sur le terrain', value: 'C' },
    ],
  },
  {
    id: 'metier_8',
    question: 'Tu aimes les missions qui demandent :',
    options: [
      { label: 'beaucoup de précision et d’ordre', value: 'A' },
      { label: 'beaucoup d’originalité et de style', value: 'B' },
      { label: 'beaucoup de vitesse et d’adaptation', value: 'C' },
    ],
  },
  {
    id: 'metier_9',
    question: 'Quand un problème arrive tu :',
    options: [
      { label: 'analyses bien tout ce qui se passe', value: 'A' },
      { label: 'cherches une idée différente', value: 'B' },
      { label: 'agis tout de suite pour limiter les dégâts', value: 'C' },
    ],
  },
  {
    id: 'metier_10',
    question: 'Ce que tu préfères dans ton travail :',
    options: [
      { label: 'résoudre un problème difficile', value: 'A' },
      { label: 'voir une idée devenir réelle', value: 'B' },
      { label: 'sentir que tu avances vite', value: 'C' },
    ],
  },
  {
    id: 'metier_11',
    question: 'Tu préfères travailler dans :',
    options: [
      { label: 'des grandes structures bien organisées', value: 'A' },
      { label: 'des jeunes projets ou petits groupes', value: 'B' },
      { label: 'des activités de terrain ou en indépendant', value: 'C' },
    ],
  },
  {
    id: 'metier_12',
    question: 'Si tu dois choisir un but pro maintenant, tu veux :',
    options: [
      { label: 'devenir très spécialiste dans un domaine', value: 'A' },
      { label: 'créer quelque chose qui te ressemble', value: 'B' },
      { label: 'voir vite des résultats concrets', value: 'C' },
    ],
  },
  {
    id: 'metier_13',
    question: 'Tu préfères que ton travail soit jugé sur :',
    options: [
      { label: 'la qualité et la précision', value: 'A' },
      { label: 'l’originalité et l’impact', value: 'B' },
      { label: 'le respect des délais et le rendu', value: 'C' },
    ],
  },
  {
    id: 'metier_14',
    question: 'En réunion, tu es plutôt :',
    options: [
      { label: 'celui qui organise et résume', value: 'A' },
      { label: 'celui qui propose des idées', value: 'B' },
      { label: 'celui qui pousse à décider et agir', value: 'C' },
    ],
  },
  {
    id: 'metier_15',
    question: 'Ce qui te fatigue le plus :',
    options: [
      { label: 'quand tout est flou et pas clair', value: 'A' },
      { label: 'quand tout se répète tout le temps', value: 'B' },
      { label: 'quand il ne se passe rien et qu’on parle trop', value: 'C' },
    ],
  },
  {
    id: 'metier_16',
    question: 'Tu te décrirais comme :',
    options: [
      { label: 'méthodique et fiable', value: 'A' },
      { label: 'créatif et curieux', value: 'B' },
      { label: 'pratique et rapide', value: 'C' },
    ],
  },
  {
    id: 'metier_17',
    question: 'Pour avancer sur un dossier tu préfères :',
    options: [
      { label: 'des règles et des étapes bien claires', value: 'A' },
      { label: 'de l’espace pour essayer des choses', value: 'B' },
      { label: 'de petits buts courts et concrets', value: 'C' },
    ],
  },
  {
    id: 'metier_18',
    question: 'Ton idéal en fin de journée :',
    options: [
      { label: 'avoir bien compris et bien fait', value: 'A' },
      { label: 'avoir créé ou amélioré quelque chose', value: 'B' },
      { label: 'avoir fini et livré des actions', value: 'C' },
    ],
  },
  {
    id: 'metier_19',
    question: 'Face à un conflit au travail tu :',
    options: [
      { label: 'regardes les faits et les règles', value: 'A' },
      { label: 'cherches une solution qui calme tout le monde', value: 'B' },
      { label: 'agis pour débloquer la situation vite', value: 'C' },
    ],
  },
  {
    id: 'metier_20',
    question: 'Ce qui te motive à long terme :',
    options: [
      { label: 'devenir expert dans ton domaine', value: 'A' },
      { label: 'laisser une trace personnelle', value: 'B' },
      { label: 'enchaîner les réussites concrètes', value: 'C' },
    ],
  },
  {
    id: 'metier_21',
    question: 'Tu préfères un objectif :',
    options: [
      { label: 'bien défini et mesurable', value: 'A' },
      { label: 'ouvert, qu’on peut changer un peu', value: 'B' },
      { label: 'très concret et à court terme', value: 'C' },
    ],
  },
  {
    id: 'metier_22',
    question: 'Ton rapport à l’autorité :',
    options: [
      { label: 'j’aime quand les règles sont claires', value: 'A' },
      { label: 'j’aime proposer et convaincre', value: 'B' },
      { label: 'j’aime être libre sur le terrain', value: 'C' },
    ],
  },
  {
    id: 'metier_23',
    question: 'En équipe, tu apportes surtout :',
    options: [
      { label: 'de la rigueur et de la clarté', value: 'A' },
      { label: 'des idées et une vision', value: 'B' },
      { label: 'de l’énergie et de l’action', value: 'C' },
    ],
  },
  {
    id: 'metier_24',
    question: 'Tu préfères des contacts :',
    options: [
      { label: 'peu nombreux mais ciblés', value: 'A' },
      { label: 'très variés pour t’inspirer', value: 'B' },
      { label: 'nombreux et directs', value: 'C' },
    ],
  },
  {
    id: 'metier_25',
    question: 'Face à l’incertitude tu :',
    options: [
      { label: 'cherches des infos pour décider', value: 'A' },
      { label: 'proposes plusieurs idées possibles', value: 'B' },
      { label: 'tests vite une première option', value: 'C' },
    ],
  },
  {
    id: 'metier_26',
    question: 'Tu te sens aligné quand :',
    options: [
      { label: 'les règles sont respectées', value: 'A' },
      { label: 'le résultat est nouveau et différent', value: 'B' },
      { label: 'les buts sont atteints à temps', value: 'C' },
    ],
  },
  {
    id: 'metier_27',
    question: 'Tu préfères un poste :',
    options: [
      { label: 'qui dure et rassure', value: 'A' },
      { label: 'qui change et stimule', value: 'B' },
      { label: 'très vivant et réactif', value: 'C' },
    ],
  },
  {
    id: 'metier_28',
    question: 'Quand tu dois convaincre :',
    options: [
      { label: 'tu utilises des arguments solides', value: 'A' },
      { label: 'tu racontes une histoire', value: 'B' },
      { label: 'tu montres des preuves concrètes', value: 'C' },
    ],
  },
  {
    id: 'metier_29',
    question: 'Ton style de travail idéal :',
    options: [
      { label: 'méthodique et prévisible', value: 'A' },
      { label: 'créatif et surprenant', value: 'B' },
      { label: 'rapide et adaptable', value: 'C' },
    ],
  },
  {
    id: 'metier_30',
    question: 'Tu aimes quand on te demande :',
    options: [
      { label: 'd’analyser avant de proposer', value: 'A' },
      { label: 'd’imaginer de nouvelles idées', value: 'B' },
      { label: 'de prendre la main et d’avancer', value: 'C' },
    ],
  },
];

export const TOTAL_METIER_QUESTIONS_V2 = quizMetierQuestionsV2.length;
