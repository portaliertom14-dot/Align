/**
 * Pick top3 métiers via IA (edge refine-job-pick) avec exclusion du précédent top1.
 * En cas d'erreur, le caller utilisera recommendJobsByAxes.
 */

import { supabase } from './supabase';

const EDGE_NAME = 'refine-job-pick';

/**
 * @param {{ sectorId: string, variant: string, rawAnswers30: Record<string, unknown>, refineAnswers5: Record<string, 'A'|'B'|'C'>, excludeJobTitles: string[] }} opts
 * @returns {Promise<{ topJobs: { title: string, score: number }[] } | null>}
 */
export async function refineJobPick({ sectorId, variant, rawAnswers30, refineAnswers5, excludeJobTitles }) {
  try {
    const body = {
      sectorId: sectorId ?? '',
      variant: variant ?? 'default',
      rawAnswers30: rawAnswers30 && typeof rawAnswers30 === 'object' ? rawAnswers30 : {},
      refineAnswers5: refineAnswers5 && typeof refineAnswers5 === 'object' ? refineAnswers5 : {},
      excludeJobTitles: Array.isArray(excludeJobTitles) ? excludeJobTitles.filter((t) => typeof t === 'string' && t.trim()) : [],
    };
    const { data, error } = await supabase.functions.invoke(EDGE_NAME, { body });
    const status = error ? (error?.context?.status ?? 'error') : 200;
    if (typeof console !== 'undefined' && console.log) {
      console.log('[EDGE_CALL]', EDGE_NAME, status === 200 ? '200' : status);
    }
    if (error) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('[JOB_REGEN] PICK_FROM_EDGE FAIL', { error: error?.message ?? String(error), status });
      }
      return null;
    }
    const ranked = data?.ranked ?? data?.topJobs;
    if (!Array.isArray(ranked) || ranked.length === 0) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('[JOB_REGEN] PICK_FROM_EDGE FAIL', { reason: 'invalid response' });
      }
      return null;
    }
    const topJobs = ranked.slice(0, 3).map((r) => ({
      title: typeof r?.title === 'string' ? r.title : (r?.job ?? ''),
      score: typeof r?.score === 'number' ? r.score : 0.9,
    })).filter((r) => r.title);
    if (typeof console !== 'undefined' && console.log) {
      console.log('[JOB_REGEN] PICK_FROM_EDGE OK', { count: topJobs.length });
    }
    return { topJobs };
  } catch (err) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[EDGE_CALL]', EDGE_NAME, 'error', err?.message ?? String(err));
      console.warn('[JOB_REGEN] PICK_FROM_EDGE FAIL', { error: err?.message ?? String(err) });
    }
    return null;
  }
}
