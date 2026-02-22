/**
 * Récupère les 5 questions de régénération métier (IA ou mock).
 * Appelle l'edge function refine-job-questions ; en cas d'erreur, retourne null (le caller utilisera le mock).
 */

import { supabase } from './supabase';

const EDGE_NAME = 'refine-job-questions';

/**
 * @param {{ sectorId: string, variant: string, rawAnswers30: Record<string, unknown>, previousTopJobs: { title: string, score?: number }[] }} opts
 * @returns {Promise<{ id: string, title: string, choices: { A: string, B: string, C: string } }[] | null>}
 */
export async function refineJobQuestions({ sectorId, variant, rawAnswers30, previousTopJobs }) {
  try {
    const body = {
      sectorId: sectorId ?? '',
      variant: variant ?? 'default',
      rawAnswers30: rawAnswers30 && typeof rawAnswers30 === 'object' ? rawAnswers30 : {},
      previousTopJobs: Array.isArray(previousTopJobs) ? previousTopJobs.map((j) => ({ title: j?.title ?? '', score: j?.score })) : [],
    };
    const { data, error } = await supabase.functions.invoke(EDGE_NAME, { body });
    const status = error ? (error?.context?.status ?? 'error') : 200;
    if (typeof console !== 'undefined' && console.log) {
      console.log('[EDGE_CALL]', EDGE_NAME, status === 200 ? '200' : status);
    }
    if (error) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('[JOB_REGEN] QUESTIONS_FROM_EDGE FAIL', { error: error?.message ?? String(error), status });
      }
      return null;
    }
    const list = data?.questions;
    if (!Array.isArray(list) || list.length < 5) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('[JOB_REGEN] QUESTIONS_FROM_EDGE FAIL', { reason: 'invalid response', count: list?.length });
      }
      return null;
    }
    const normalized = list.slice(0, 5).map((q, i) => {
      const id = q?.id && typeof q.id === 'string' ? q.id : `refine_regen_${i + 1}`;
      const title = typeof q?.title === 'string' ? q.title : '';
      const choices = q?.choices && typeof q.choices === 'object' ? q.choices : {};
      return {
        id,
        title: title || `Question ${i + 1}`,
        choices: {
          A: typeof choices.A === 'string' ? choices.A : '',
          B: typeof choices.B === 'string' ? choices.B : '',
          C: typeof choices.C === 'string' ? choices.C : '',
        },
      };
    });
    if (typeof console !== 'undefined' && console.log) {
      console.log('[JOB_REGEN] QUESTIONS_FROM_EDGE OK', { count: normalized.length });
    }
    return normalized;
  } catch (err) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[EDGE_CALL]', EDGE_NAME, 'error', err?.message ?? String(err));
      console.warn('[JOB_REGEN] QUESTIONS_FROM_EDGE FAIL', { error: err?.message ?? String(err) });
    }
    return null;
  }
}
