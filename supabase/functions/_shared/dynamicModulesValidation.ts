/**
 * Validation stricte du JSON généré par generate-dynamic-modules.
 * 10 chapitres, 2 modules par chapitre (simulation_metier, test_secteur), 12 questions chacun.
 */

export type ChoiceItem = { id: string; text: string };
export type DynamicQuestion = {
  id: string;
  prompt: string;
  choices: ChoiceItem[];
  correctChoiceId?: 'A' | 'B' | 'C';
  explanation?: string;
};
export type DynamicModule = {
  moduleType: string;
  questions: DynamicQuestion[];
};
export type ChapterBlock = {
  chapter: number;
  simulation: DynamicModule;
  sectorTest: DynamicModule;
};
export type DynamicModulesPayload = {
  sectorId: string;
  jobId: string;
  personaCluster: string;
  contentVersion: string;
  language: string;
  chapters: ChapterBlock[];
};

const REQUIRED_CHAPTERS = 10;
const QUESTIONS_PER_MODULE = 12;
const VALID_IDS = new Set(['A', 'B', 'C']);

/** Patterns interdits (quiz d’orientation) : rejet si trop de questions les contiennent. */
const FORBIDDEN_ORIENTATION_PATTERNS = [
  'tu préfères',
  'tu préfère ',
  'préfères-tu',
  'préfère-tu',
  'es-tu ',
  'es tu ',
  'quel est ton style',
  'quel est ta personnalité',
  'ton style ',
  'tu te sens',
  'te sens-tu',
  'ton profil',
  'ta personnalité',
  'tu te vois',
  'te vois-tu',
  'tu t\'imagines',
  'quelle est ta',
  'quel type de',
  'comment te définirais-tu',
  'tu te considères',
];

/** Nombre max de questions pouvant contenir un pattern interdit avant rejet du payload. */
const MAX_FORBIDDEN_QUESTIONS = 5;

function containsForbiddenOrientationPattern(text: string): boolean {
  const lower = (text ?? '').toLowerCase();
  return FORBIDDEN_ORIENTATION_PATTERNS.some((p) => lower.includes(p));
}

function countForbiddenQuestions(chapters: ChapterBlock[]): number {
  let count = 0;
  for (const block of chapters) {
    for (const q of block.simulation.questions) {
      if (containsForbiddenOrientationPattern(q.prompt)) count += 1;
    }
    for (const q of block.sectorTest.questions) {
      if (containsForbiddenOrientationPattern(q.prompt)) count += 1;
    }
  }
  return count;
}

function normalizeChoice(c: unknown, index: number): ChoiceItem | null {
  if (!c || typeof c !== 'object') return null;
  const o = c as Record<string, unknown>;
  const id = String(o.id ?? ['A', 'B', 'C'][index]).toUpperCase();
  const text = typeof o.text === 'string' ? o.text.trim() : '';
  if (!text || !VALID_IDS.has(id)) return null;
  return { id, text };
}

function normalizeChoiceId(v: unknown): 'A' | 'B' | 'C' | null {
  if (v == null) return null;
  const id = String(v).toUpperCase();
  return VALID_IDS.has(id) ? (id as 'A' | 'B' | 'C') : null;
}

/**
 * Valide les questions selon le type de module :
 * - test_secteur : correctChoiceId + explanation obligatoires.
 * - simulation_metier : bestChoiceId ou correctChoiceId (cohérent A|B|C) + explanation obligatoire.
 */
function validateQuestions(questions: unknown, prefix: string, moduleType: string): DynamicQuestion[] | null {
  if (!Array.isArray(questions) || questions.length !== QUESTIONS_PER_MODULE) return null;
  const isTestSecteur = moduleType === 'test_secteur';
  const seen = new Set<string>();
  const out: DynamicQuestion[] = [];
  for (let i = 0; i < QUESTIONS_PER_MODULE; i++) {
    const q = questions[i];
    if (!q || typeof q !== 'object') return null;
    const o = q as Record<string, unknown>;
    const id = String(o.id ?? `${prefix}${i + 1}`).trim();
    if (!id || seen.has(id)) return null;
    seen.add(id);
    const prompt = typeof o.prompt === 'string' ? o.prompt.trim() : '';
    if (!prompt) return null;
    const rawChoices = Array.isArray(o.choices) ? o.choices : [];
    const choices: ChoiceItem[] = [];
    for (let j = 0; j < 3; j++) {
      const ch = normalizeChoice(rawChoices[j], j);
      if (!ch) return null;
      choices.push(ch);
    }
    const rawCorrect = normalizeChoiceId(o.correctChoiceId);
    const rawBest = normalizeChoiceId(o.bestChoiceId);
    const explanation = typeof o.explanation === 'string' ? o.explanation.trim() : undefined;

    if (isTestSecteur) {
      if (!rawCorrect || !explanation) return null;
      out.push({ id, prompt, choices, correctChoiceId: rawCorrect, explanation });
    } else {
      if (!explanation) return null;
      const choiceId = rawBest ?? rawCorrect;
      if (!choiceId) return null;
      out.push({ id, prompt, choices, correctChoiceId: choiceId, explanation });
    }
  }
  return out;
}

function validateModule(mod: unknown, moduleType: string, prefix: string): DynamicModule | null {
  if (!mod || typeof mod !== 'object') return null;
  const o = mod as Record<string, unknown>;
  const type = String(o.moduleType ?? moduleType);
  const questions = validateQuestions(o.questions, prefix, type);
  if (!questions) return null;
  return { moduleType: type, questions };
}

/**
 * Valide et normalise le payload dynamique. Retourne null si invalide.
 */
export function validateDynamicModulesPayload(raw: unknown): DynamicModulesPayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const sectorId = typeof o.sectorId === 'string' ? o.sectorId.trim() : '';
  const jobId = typeof o.jobId === 'string' ? o.jobId.trim() : '';
  const personaCluster = typeof o.personaCluster === 'string' ? o.personaCluster.trim().slice(0, 8) || 'default' : 'default';
  const contentVersion = typeof o.contentVersion === 'string' ? o.contentVersion.trim() : '';
  const language = typeof o.language === 'string' ? o.language.trim() : 'fr';
  if (!sectorId || !jobId) return null;

  const chaptersRaw = Array.isArray(o.chapters) ? o.chapters : [];
  if (chaptersRaw.length !== REQUIRED_CHAPTERS) return null;

  const chapters: ChapterBlock[] = [];
  const seenChapter = new Set<number>();
  for (let c = 0; c < REQUIRED_CHAPTERS; c++) {
    const ch = chaptersRaw[c];
    const chapterNum = c + 1;
    if (!ch || typeof ch !== 'object') return null;
    const chO = ch as Record<string, unknown>;
    const chapter = Number(chO.chapter ?? chapterNum);
    if (chapter !== chapterNum || seenChapter.has(chapter)) return null;
    seenChapter.add(chapter);

    const simulation = validateModule(
      chO.simulation,
      'simulation_metier',
      `C${chapter}_SIM_Q`
    );
    const sectorTest = validateModule(
      chO.sectorTest,
      'test_secteur',
      `C${chapter}_TEST_Q`
    );
    if (!simulation || !sectorTest) return null;
    chapters.push({ chapter, simulation, sectorTest });
  }

  // Validation sémantique : rejeter si trop de questions ressemblent à un quiz d’orientation
  if (countForbiddenQuestions(chapters) > MAX_FORBIDDEN_QUESTIONS) return null;

  return {
    sectorId,
    jobId,
    personaCluster,
    contentVersion,
    language,
    chapters,
  };
}
