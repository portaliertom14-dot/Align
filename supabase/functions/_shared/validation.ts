/**
 * Validation stricte des sorties IA — whitelists, longueur, format.
 * Évite 5xx : fallback déterministe ou réponse "disabled" si invalide.
 */

import { SECTOR_IDS, SECTOR_NAMES, JOB_IDS, JOB_NAMES } from './prompts.ts';

export const DESCRIPTION_MAX_LENGTH = 240;

/**
 * Garde 2 phrases complètes (max 3) tant que la longueur totale ≤ maxLen.
 * Pas de troncature au milieu d’une phrase : on n’ajoute que des phrases entières.
 * Dernier recours : une seule phrase > maxLen est tronquée à maxLen avec "…".
 */
export function trimDescription(desc: string, maxLen: number = DESCRIPTION_MAX_LENGTH): string {
  const s = String(desc ?? '').trim();
  if (!s) return '';
  const sentences = s.split(/(?<=[.!?])\s+/).map((x) => x.trim()).filter(Boolean);
  if (sentences.length === 0) return s.slice(0, maxLen);

  let out = '';
  let count = 0;
  for (const sent of sentences) {
    if (count >= 3) break;
    const next = out ? out + ' ' + sent : sent;
    if (next.length <= maxLen) {
      out = next;
      count += 1;
    } else break;
  }

  if (!out) {
    // Une seule phrase (ou texte sans ponctuation) dépasse maxLen : troncature en dernier recours
    out = s.length > maxLen ? s.slice(0, maxLen - 1).trim() + '…' : s;
    if (out.length > maxLen) out = out.slice(0, maxLen);
  }
  return out.trim();
}

/**
 * Normalise secteurId : doit être dans la whitelist.
 * Retourne null si invalide (pas de fallback tech — le client utilise wayDetermineSecteur).
 */
export function getSectorIfWhitelisted(raw: string): { validId: string; name: string } | null {
  const id = (raw ?? '').toLowerCase().replace(/\s+/g, '_');
  if (!(SECTOR_IDS as readonly string[]).includes(id)) return null;
  return { validId: id, name: SECTOR_NAMES[id] ?? id };
}

/**
 * Normalise jobId : doit être dans la whitelist.
 * Retourne null si invalide (pas de fallback developpeur — le client utilise wayProposeMetiers).
 */
export function getJobIfWhitelisted(raw: string): { validId: string; name: string } | null {
  const id = (raw ?? '').toLowerCase().replace(/\s+/g, '_');
  if (!(JOB_IDS as readonly string[]).includes(id)) return null;
  return { validId: id, name: JOB_NAMES[id] ?? id };
}

export type QuestionItem = {
  id: string;
  question: string;
  options: Array<{ label: string; value: 'A' | 'B' | 'C' }>;
};

/**
 * Valide et normalise les 20 questions (id Q1..Q20, 3 options). Si invalide, retourne null.
 */
export function validateJobQuizQuestions(questions: unknown): QuestionItem[] | null {
  if (!Array.isArray(questions) || questions.length !== 20) return null;
  const out: QuestionItem[] = [];
  for (let i = 0; i < 20; i++) {
    const q = questions[i];
    const id = `Q${i + 1}`;
    const question = (q && typeof (q as any).question === 'string' ? (q as any).question : '').trim() || `Question ${i + 1}`;
    const opts = Array.isArray((q as any)?.options) ? (q as any).options : [];
    const options = opts.slice(0, 3).map((o: any, j: number) => ({
      label: String(o?.label ?? `Option ${j + 1}`).trim(),
      value: (o?.value === 'A' || o?.value === 'B' || o?.value === 'C' ? o.value : ['A', 'B', 'C'][j]) as 'A' | 'B' | 'C',
    }));
    if (options.length < 3) {
      options.push(
        { label: 'Option A', value: 'A' as const },
        { label: 'Option B', value: 'B' as const },
        { label: 'Option C', value: 'C' as const },
      );
      options.splice(3);
    }
    out.push({ id, question, options });
  }
  return out;
}
