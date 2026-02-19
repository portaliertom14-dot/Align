/**
 * QUIZ MÉTIER V2 — 30 questions (metier_1..metier_30) pour le moteur par axes.
 * Format aligné avec quizMetierQuestions : id, question, options [{ label, value }], values A/B/C.
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
  { id: 'metier_1', question: 'Tu préfères un travail où tu :', options: [{ label: 'maîtrises des outils précis (technique)', value: 'A' }, { label: 'inventes des idées (créatif)', value: 'B' }, { label: 'agis vite sur le terrain (opérationnel)', value: 'C' }] },
  { id: 'metier_2', question: 'Ton rythme idéal au travail :', options: [{ label: 'régulier, planifié', value: 'A' }, { label: 'variable, inspirant', value: 'B' }, { label: 'intense et rythmé', value: 'C' }] },
  { id: 'metier_3', question: 'Tu veux que ton job apporte surtout :', options: [{ label: 'expertise reconnue', value: 'A' }, { label: 'liberté créative', value: 'B' }, { label: 'résultats visibles rapidement', value: 'C' }] },
  { id: 'metier_4', question: 'Dans une journée type, tu préfères :', options: [{ label: 'analyser / résoudre', value: 'A' }, { label: 'imaginer / créer', value: 'B' }, { label: 'exécuter / livrer', value: 'C' }] },
  { id: 'metier_5', question: 'Pour apprendre un métier tu préfères :', options: [{ label: 'une formation structurée', value: 'A' }, { label: 'faire des projets', value: 'B' }, { label: 'apprendre en faisant, sur le tas', value: 'C' }] },
  { id: 'metier_6', question: 'Ton niveau de tolérance au risque :', options: [{ label: 'faible — je préfère sécurité', value: 'A' }, { label: 'moyen — j\'aime tenter', value: 'B' }, { label: 'élevé — j\'adore l\'action', value: 'C' }] },
  { id: 'metier_7', question: 'Tu préfères travailler :', options: [{ label: 'seul·e ou en petit comité', value: 'A' }, { label: 'en équipe créative', value: 'B' }, { label: 'en équipe opérationnelle / mouvante', value: 'C' }] },
  { id: 'metier_8', question: 'Tu aimes les missions qui demandent :', options: [{ label: 'précision et méthode', value: 'A' }, { label: 'originalité et esthétique', value: 'B' }, { label: 'rapidité et adaptabilité', value: 'C' }] },
  { id: 'metier_9', question: 'Quand un problème arrive tu :', options: [{ label: 'fais un diagnostic complet', value: 'A' }, { label: 'trouves une solution créative', value: 'B' }, { label: 'agis tout de suite pour limiter les dégâts', value: 'C' }] },
  { id: 'metier_10', question: 'Ton plaisir principal au travail :', options: [{ label: 'résoudre un puzzle complexe', value: 'A' }, { label: 'voir une idée naître', value: 'B' }, { label: 'sentir que tu avances vite', value: 'C' }] },
  { id: 'metier_11', question: 'Tu préfères évoluer dans :', options: [{ label: 'entreprises structurées', value: 'A' }, { label: 'jeunes entreprises / projets indépendants', value: 'B' }, { label: 'terrain / travail en indépendant', value: 'C' }] },
  { id: 'metier_12', question: 'Si tu dois choisir un objectif pro maintenant, tu choisis :', options: [{ label: 'devenir spécialiste reconnu', value: 'A' }, { label: 'créer quelque chose qui te ressemble', value: 'B' }, { label: 'obtenir des résultats rapides et concrets', value: 'C' }] },
  { id: 'metier_13', question: 'Tu préfères que ton travail soit évalué sur :', options: [{ label: 'la qualité et la rigueur', value: 'A' }, { label: 'l\'originalité et l\'impact', value: 'B' }, { label: 'les délais et le rendu', value: 'C' }] },
  { id: 'metier_14', question: 'En réunion, tu es plutôt :', options: [{ label: 'celui qui structure et synthétise', value: 'A' }, { label: 'celui qui propose des idées nouvelles', value: 'B' }, { label: 'celui qui pousse à décider et agir', value: 'C' }] },
  { id: 'metier_15', question: 'Ce qui te fatigue le plus :', options: [{ label: 'l\'imprécision et le flou', value: 'A' }, { label: 'la routine et la répétition', value: 'B' }, { label: 'l\'inaction et les réunions sans suite', value: 'C' }] },
  { id: 'metier_16', question: 'Tu te décrirais comme :', options: [{ label: 'méthodique et fiable', value: 'A' }, { label: 'créatif et curieux', value: 'B' }, { label: 'pragmatique et réactif', value: 'C' }] },
  { id: 'metier_17', question: 'Pour avancer sur un dossier tu préfères :', options: [{ label: 'un cadre et des process clairs', value: 'A' }, { label: 'de l\'espace pour expérimenter', value: 'B' }, { label: 'des objectifs courts et des jalons', value: 'C' }] },
  { id: 'metier_18', question: 'Ton idéal en fin de journée :', options: [{ label: 'avoir bien compris et bien fait', value: 'A' }, { label: 'avoir créé ou amélioré quelque chose', value: 'B' }, { label: 'avoir livré et bouclé des actions', value: 'C' }] },
  { id: 'metier_19', question: 'Face à un conflit au travail tu :', options: [{ label: 'analyses les faits et les règles', value: 'A' }, { label: 'cherches une solution qui réconcilie', value: 'B' }, { label: 'agis pour débloquer vite', value: 'C' }] },
  { id: 'metier_20', question: 'Ce qui te motive à long terme :', options: [{ label: 'devenir expert dans mon domaine', value: 'A' }, { label: 'laisser une trace personnelle', value: 'B' }, { label: 'enchaîner les succès concrets', value: 'C' }] },
  { id: 'metier_21', question: 'Tu préfères un objectif :', options: [{ label: 'défini et mesurable', value: 'A' }, { label: 'ouvert à réinterpréter', value: 'B' }, { label: 'court terme et concret', value: 'C' }] },
  { id: 'metier_22', question: 'Ton rapport à l\'autorité :', options: [{ label: 'j\'aime un cadre clair', value: 'A' }, { label: 'j\'aime proposer et convaincre', value: 'B' }, { label: 'j\'aime être autonome sur le terrain', value: 'C' }] },
  { id: 'metier_23', question: 'En équipe, tu apportes surtout :', options: [{ label: 'de la rigueur et de la clarté', value: 'A' }, { label: 'des idées et de la vision', value: 'B' }, { label: 'de l\'énergie et du passage à l\'acte', value: 'C' }] },
  { id: 'metier_24', question: 'Tu préfères des contacts :', options: [{ label: 'limités et ciblés', value: 'A' }, { label: 'variés pour inspirer', value: 'B' }, { label: 'nombreux et directs', value: 'C' }] },
  { id: 'metier_25', question: 'Face à l\'incertitude tu :', options: [{ label: 'cherches des données pour décider', value: 'A' }, { label: 'proposes plusieurs pistes', value: 'B' }, { label: 'testes vite une option', value: 'C' }] },
  { id: 'metier_26', question: 'Tu te sens aligné quand :', options: [{ label: 'les process sont respectés', value: 'A' }, { label: 'le résultat est innovant', value: 'B' }, { label: 'les objectifs sont atteints à temps', value: 'C' }] },
  { id: 'metier_27', question: 'Tu préfères un poste :', options: [{ label: 'pérenne et sécurisant', value: 'A' }, { label: 'évolutif et stimulant', value: 'B' }, { label: 'dynamique et réactif', value: 'C' }] },
  { id: 'metier_28', question: 'Quand tu dois convaincre :', options: [{ label: 'tu t\'appuies sur des arguments solides', value: 'A' }, { label: 'tu racontes une histoire', value: 'B' }, { label: 'tu montres des preuves concrètes', value: 'C' }] },
  { id: 'metier_29', question: 'Ton style de travail idéal :', options: [{ label: 'méthodique et prévisible', value: 'A' }, { label: 'créatif et surprenant', value: 'B' }, { label: 'rapide et adaptatif', value: 'C' }] },
  { id: 'metier_30', question: 'Tu aimes quand on te demande :', options: [{ label: 'd\'analyser avant de proposer', value: 'A' }, { label: 'd\'imaginer de nouvelles options', value: 'B' }, { label: 'de prendre la main et d\'avancer', value: 'C' }] },
];

export const TOTAL_METIER_QUESTIONS_V2 = quizMetierQuestionsV2.length;
