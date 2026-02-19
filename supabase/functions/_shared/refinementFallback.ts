/**
 * Fallback et détection de questions génériques pour l'affinement secteur (top1 vs top2).
 * - isGenericQuestion : liste noire de patterns (fr/en) pour rejeter les sorties IA génériques.
 * - getFallbackMicroQuestions : banque par paires (sport/santé, business/création, etc.) + fallback contextualisé.
 *
 * Comment tester :
 * 1) sport vs santé : envoyer un payload avec réponses qui donnent top1=sport_evenementiel, top2=sante_bien_etre
 *    (ex. Q41–Q46 orientées mouvement/performance + Q47–Q50 vers sport). Vérifier logs EDGE_REFINEMENT_TOP2,
 *    EDGE_REFINEMENT_AI_OK ou EDGE_REFINEMENT_FALLBACK_USED, et que les questions opposent perf/terrain vs prévention/suivi.
 * 2) business vs création : top1=business_entrepreneuriat, top2=creation_design → questions monétisation/vente vs esthétique/forme.
 * 3) Générique : si l’IA renvoie les 3 questions type "cadre défini / autonomie / impact personnes" → EDGE_REFINEMENT_AI_GENERIC
 *    et fallback par paire utilisé.
 */

/** Vocabulaire attendu par secteur pour considérer une question "pair-specific" (top1 vs top2). */
const PAIR_VOCABULARY: Record<string, string[]> = {
  sport_evenementiel: ['performance', 'terrain', 'compétition', 'événement', 'sport', 'résultat mesuré', 'animation', 'préparer'],
  sante_bien_etre: ['prévention', 'bien-être', 'suivi', 'santé', 'accompagner', 'personnes', 'quotidien', 'durée'],
  business_entrepreneuriat: ['monétiser', 'vendre', 'clients', 'croissance', 'objectifs', 'piloter', 'activité', 'acquérir'],
  creation_design: ['création', 'forme', 'esthétique', 'expérience', 'visuel', 'conceptuel', 'explorer', 'pistes créatives'],
  ingenierie_tech: ['systèmes', 'logiciel', 'code', 'applications', 'infrastructure', 'développer', 'architecture'],
  data_ia: ['données', 'modèles', 'décision', 'analyse', 'prédiction', 'entraîner'],
  social_humain: ['accompagnement', 'lien', 'personnes', 'relation', 'écoute', 'soutenir', 'présent'],
  education_formation: ['transmission', 'formation', 'progression', 'pédagogique', 'apprendre', 'parcours', 'contenus'],
  environnement_agri: ['nature', 'écosystème', 'vivant', 'sols', 'transition écologique', 'ressources', 'durable', 'filière'],
  industrie_artisanat: ['fabrication', 'matière', 'geste', 'outil', 'ouvrage', 'technique', 'matériaux'],
  droit_justice_securite: ['droit', 'règle', 'justice', 'sécurité', 'cadre légal', 'ordre', 'conformité'],
  defense_securite_civile: ['défense', 'protection', 'sécurité civile', 'ordre'],
  culture_patrimoine: ['culture', 'patrimoine', 'patrimoine'],
  communication_media: ['communication', 'médias', 'média'],
  finance_assurance: ['finance', 'assurance', 'risque', 'chiffres'],
};

/**
 * Retourne true si le texte contient au moins un mot-clé lié à top1 ou top2.
 */
function containsPairVocabulary(text: string, top1Id: string, top2Id: string): boolean {
  if (!text || typeof text !== 'string') return false;
  const lower = text.toLowerCase().trim();
  const words1 = PAIR_VOCABULARY[top1Id] ?? [];
  const words2 = PAIR_VOCABULARY[top2Id] ?? [];
  const all = [...words1, ...words2];
  return all.some((w) => lower.includes(w.toLowerCase()));
}

/**
 * Si les questions ne contiennent pas de vocabulaire relié à la paire (top1/top2),
 * considère comme "generic-like" → fallback pair recommandé.
 * Retourne true si on doit utiliser le fallback (trop de questions sans vocabulaire paire).
 */
export function isGenericLikeForPair(
  questions: Array<{ question?: string; options?: string[] | Array<{ label?: string; value?: string }> }>,
  top1Id: string,
  top2Id: string
): boolean {
  if (!Array.isArray(questions) || questions.length === 0) return true;
  const withPairVocab = questions.filter((q) => {
    const questionText = (q.question ?? '').trim();
    const opts = q.options ?? [];
    const optStrings = opts.map((o) =>
      typeof o === 'string' ? o : (typeof o === 'object' && o && 'label' in o ? String((o as { label?: string }).label ?? '') : '')
    );
    const fullText = [questionText, ...optStrings].join(' ');
    return containsPairVocabulary(fullText, top1Id, top2Id);
  });
  return withPairVocab.length < 2;
}

/** Patterns génériques à rejeter (questions qui ne discriminent pas top1 vs top2). */
const GENERIC_PATTERNS = [
  'cadre défini',
  'cadre défini avec des process',
  'process',
  'autonomie',
  'peu de contraintes',
  'résoudre des problèmes concrets étape par étape',
  'imaginer des solutions nouvelles',
  'impact direct sur des personnes',
  'création ou l\'innovation',
  "création ou l'innovation",
  'équilibre entre les deux',
  'mix des deux',
  'un mix des deux',
  'les deux selon le contexte',
  'defined framework',
  'process',
  'autonomy',
  'step by step',
  'direct impact on people',
  'creation or innovation',
  'balance between',
  'both depending',
];

/**
 * Retourne true si la question matche au moins un pattern générique (insensible à la casse).
 */
export function isGenericQuestion(question: string): boolean {
  if (!question || typeof question !== 'string') return false;
  const lower = question.toLowerCase().trim();
  return GENERIC_PATTERNS.some((p) => lower.includes(p.toLowerCase()));
}

export interface MicroQuestionTemplate {
  id: string;
  question: string;
  options: [string, string, string];
}

/** Paires (top1, top2) normalisées : ordre alphabétique pour clé unique. */
function pairKey(a: string, b: string): string {
  return [a, b].sort().join('|');
}

/** Banque de 3 questions par paire connue. 3 options : A, B, "Les deux / Ça dépend". */
const PAIR_TEMPLATES: Record<string, MicroQuestionTemplate[]> = {
  [pairKey('sport_evenementiel', 'sante_bien_etre')]: [
    { id: 'ref_1', question: 'Tu te retrouves plutôt dans un contexte où :', options: ['La performance et le résultat mesuré priment', 'La prévention et le mieux-être à long terme priment', 'Les deux / Ça dépend'] },
    { id: 'ref_2', question: "Ce qui t'attire le plus :", options: ['Être sur le terrain, événements et compétition', 'Accompagner des personnes dans leur suivi au quotidien', 'Les deux / Ça dépend'] },
    { id: 'ref_3', question: 'Dans ton idéal, tu passes le plus de temps à :', options: ['Préparer ou animer des moments forts (événements, compétitions)', 'Suivre et accompagner des personnes dans la durée', 'Les deux / Ça dépend'] },
  ],
  [pairKey('business_entrepreneuriat', 'creation_design')]: [
    { id: 'ref_1', question: 'Ce qui te motive le plus :', options: ['Monétiser, vendre, développer une activité', 'Créer une forme, une esthétique, une expérience', 'Les deux / Ça dépend'] },
    { id: 'ref_2', question: "Tu te sens plus à l'aise quand :", options: ['Tu pilotes des objectifs et des résultats concrets', 'Tu explores des pistes créatives sans cadre imposé', 'Les deux / Ça dépend'] },
    { id: 'ref_3', question: "Dans ton quotidien idéal, tu préfères :", options: ['Acquérir des clients et structurer la croissance', 'Expérimenter et affiner une proposition visuelle ou conceptuelle', 'Les deux / Ça dépend'] },
  ],
  [pairKey('ingenierie_tech', 'data_ia')]: [
    { id: 'ref_1', question: "Tu es plus attiré par :", options: ['Construire des systèmes et des produits logiciels', 'Exploiter des données et des modèles pour la décision', 'Les deux / Ça dépend'] },
    { id: 'ref_2', question: "Ce qui te stimule le plus :", options: ['Architecture, code, déploiement', 'Analyse, modèles, prédiction', 'Les deux / Ça dépend'] },
    { id: 'ref_3', question: "Dans ton travail idéal, tu passes le plus de temps à :", options: ['Développer et maintenir des applications ou infrastructures', 'Préparer des données et entraîner ou utiliser des modèles', 'Les deux / Ça dépend'] },
  ],
  [pairKey('social_humain', 'education_formation')]: [
    { id: 'ref_1', question: "Tu te retrouves plutôt dans :", options: ['L\'accompagnement au quotidien et le lien avec les personnes', 'La transmission structurée et la progression pédagogique', 'Les deux / Ça dépend'] },
    { id: 'ref_2', question: "Ce qui te motive le plus :", options: ['Soutenir des personnes dans leur situation actuelle', 'Faire progresser des personnes vers des objectifs définis', 'Les deux / Ça dépend'] },
    { id: 'ref_3', question: "Dans ton idéal, tu préfères :", options: ['Être présent dans la relation et l\'écoute', 'Concevoir des parcours et des contenus pour faire apprendre', 'Les deux / Ça dépend'] },
  ],
  [pairKey('environnement_agri', 'industrie_artisanat')]: [
    { id: 'ref_1', question: "Tu es plus attiré par :", options: ['La nature, les ressources, la transition écologique', 'La fabrication, la matière, le geste technique', 'Les deux / Ça dépend'] },
    { id: 'ref_2', question: "Ce qui te stimule le plus :", options: ['Protéger ou optimiser un écosystème, une filière durable', 'Produire un objet ou un ouvrage de qualité', 'Les deux / Ça dépend'] },
    { id: 'ref_3', question: "Dans ton quotidien idéal, tu préfères :", options: ['Travailler avec le vivant, les sols, les énergies', 'Travailler avec des outils et des matériaux concrets', 'Les deux / Ça dépend'] },
  ],
};

const FALLBACK_DEFAULT: MicroQuestionTemplate[] = [
  { id: 'ref_1', question: "Dans ton quotidien tu préfères :", options: ['Être sur le terrain et dans l\'interaction', 'Analyser et faire évoluer des systèmes', 'Les deux / Ça dépend'] },
  { id: 'ref_2', question: "Ce qui te motive le plus :", options: ['La performance et le résultat visible', 'La prévention et l\'impact à long terme', 'Les deux / Ça dépend'] },
  { id: 'ref_3', question: "Tu te sens plus à l'aise quand :", options: ['Tu agis sur l\'instant et l\'événement', 'Tu construis dans la durée', 'Les deux / Ça dépend'] },
];

/**
 * Retourne 3 micro-questions pour la paire (top1Id, top2Id). Si paire inconnue, retourne le fallback par défaut (contextualisé générique).
 */
export function getFallbackMicroQuestions(top1Id: string, top2Id: string): MicroQuestionTemplate[] {
  const key = pairKey(top1Id, top2Id);
  const templates = PAIR_TEMPLATES[key];
  if (templates && templates.length >= 2) {
    return templates.slice(0, 3);
  }
  return FALLBACK_DEFAULT;
}

/**
 * Convertit les templates en format Edge (options avec label/value pour l'API).
 */
export function formatFallbackForEdge(templates: MicroQuestionTemplate[]): Array<{ id: string; question: string; options: Array<{ label: string; value: string }> }> {
  return templates.map((t, i) => ({
    id: t.id,
    question: t.question,
    options: t.options.map((opt, j) => ({ label: opt, value: ['A', 'B', 'C'][j] })),
  }));
}
