/**
 * Questions métier — liste fixe locale (20 questions officielles Align).
 * Plus d’appel Edge Function / cache : source unique = quizMetierQuestions.
 */

import { quizMetierQuestions } from '../data/quizMetierQuestions';

const DEFAULT_QUIZ_VERSION = 'v1';

/**
 * Normalise les options au format [{ label, value: "A"|"B"|"C" }].
 */
function normalizeOptions(opts) {
  if (!Array.isArray(opts)) return [];
  return opts.slice(0, 3).map((o, i) => ({
    label: typeof o === 'string' ? o : String(o?.label ?? o ?? ''),
    value: ['A', 'B', 'C'][i],
  }));
}

/**
 * Retourne les 20 questions métier (liste fixe).
 *
 * @param {string} sectorId - ignoré, conservé pour compat API
 * @param {string} [quizVersion] - ignoré, conservé pour compat API
 * @returns {Promise<{ sectorId: string, quizVersion: string, questions: Array<{ id, question, options }> }>}
 */
export async function fetchJobQuizQuestions(sectorId, quizVersion = DEFAULT_QUIZ_VERSION) {
  const questions = quizMetierQuestions.map((q, i) => ({
    id: q.id || `Q${i + 1}`,
    question: q.question || '',
    options: normalizeOptions(q.options),
  }));

  return {
    sectorId: typeof sectorId === 'string' ? sectorId.trim() : '',
    quizVersion: (quizVersion || DEFAULT_QUIZ_VERSION).trim(),
    questions,
  };
}
