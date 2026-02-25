/**
 * Service unique : logique métier hybride (cosine + rerank IA sur whitelist).
 * Input: sectorId, variant, rawAnswers30, sectorSummary?, sectorContext?
 * Output: { top3, needsRefinement, refinementQuestions } — tous les jobTitle sont dans la whitelist.
 */

import { computeJobProfile } from '../domain/computeJobProfile';
import { rankJobsForSector } from '../domain/matchJobs';
import { sectorContextToJobVector, blendVectors } from '../domain/sectorContextToJobVector';
import { shouldRerank } from '../domain/shouldRerankJobs';
import { guardJobTitle, getFirstWhitelistTitle, isJobAllowed } from '../domain/jobTitleGuard';
import { getJobsForSector, getJobsForSectorVariant } from '../data/jobsBySector';
import { supabase } from './supabase';

const W_JOB = 0.75;
const W_CTX = 0.25;
const RERANK_TIMEOUT_MS = 15000;

function buildRawAnswers30(answers) {
  const out = {};
  for (let i = 1; i <= 30; i++) {
    const key = `metier_${i}`;
    const a = answers[key];
    const value = a && (a.value === 'A' || a.value === 'B' || a.value === 'C') ? a.value : null;
    if (value) out[key] = { value };
  }
  return out;
}

function getWhitelistTitles(sectorId, variant) {
  const v = variant === 'defense_track' ? 'defense_track' : 'default';
  try {
    const list = getJobsForSectorVariant(sectorId, v) ?? getJobsForSector(sectorId);
    return list;
  } catch (_) {
    return [];
  }
}

/**
 * Valide que les 3 jobTitle du rerank sont dans la whitelist ; sinon fallback cosine.
 * @returns { top3: { title, score, why? }[], usedRerank: boolean }
 */
function validateRerankTop3(rerankTop3, whitelistTitles, sectorId, variant, cosineTop10) {
  const valid = [];
  for (const item of rerankTop3 || []) {
    const jobTitle = item?.jobTitle ?? item?.title ?? item?.job ?? '';
    const { ok, canonicalTitle } = isJobAllowed({ sectorId, variant, jobTitle });
    if (ok && canonicalTitle) valid.push({ title: canonicalTitle, score: item?.confidence ?? 0.9, why: item?.why ?? '' });
  }
  if (valid.length >= 3) return { top3: valid.slice(0, 3), usedRerank: true };

  const fallback = cosineTop10.slice(0, 3).map((r) => ({
    title: guardJobTitle({ stage: 'ANALYZE_FALLBACK', sectorId, variant, jobTitle: r.job }) ?? getFirstWhitelistTitle(sectorId, variant) ?? r.job,
    score: r.score,
    why: '',
  }));
  return { top3: fallback, usedRerank: false };
}

/**
 * @param {{ sectorId: string, variant: string, rawAnswers30: Record<string, { value: string }>, sectorSummary?: string, sectorContext?: object, refinementAnswers?: Record<string, { value: string }> }} input
 * @returns { Promise<{ top3: { title: string, score: number, why?: string }[], needsRefinement: boolean, refinementQuestions: { id: string, question: string, options: { label: string, value: string }[] }[] }> }
 */
export async function analyzeJobResult({ sectorId, variant = 'default', rawAnswers30, sectorSummary = null, sectorContext = null, refinementAnswers = null }) {
  const rawAnswers = buildRawAnswers30(rawAnswers30 || {});
  const jobVector = computeJobProfile(rawAnswers);
  const vectorForRanking =
    sectorContext && typeof sectorContext === 'object' && (sectorContext.styleCognitif ?? sectorContext.finaliteDominante ?? sectorContext.contexteDomaine)
      ? blendVectors(jobVector, sectorContextToJobVector(sectorContext), W_JOB, W_CTX)
      : jobVector;

  const top10 = rankJobsForSector(sectorId, vectorForRanking, 10, variant);
  const gapTop1Top2 = top10[0]?.score != null && top10[1]?.score != null ? top10[0].score - top10[1].score : null;

  if (!shouldRerank(top10)) {
    const fallbackTitle = getFirstWhitelistTitle(sectorId, variant);
    const top3 = top10.slice(0, 3).map((r, i) => {
      const guarded = guardJobTitle({ stage: 'ENGINE_OUT', sectorId, variant, jobTitle: r.job, meta: { rank: i + 1 } });
      return {
        title: guarded ?? fallbackTitle ?? r.job,
        score: r.score,
        why: '',
      };
    });
    if (typeof console !== 'undefined' && console.log) {
      console.log('[JOB_ANALYZE]', { sectorId, variant, gapTop1Top2, usedRerank: false, finalTop3: top3.map((t) => t.title) });
    }
    return { top3, needsRefinement: false, refinementQuestions: [] };
  }

  const whitelistTitles = getWhitelistTitles(sectorId, variant);
  if (whitelistTitles.length < 30) {
    const fallbackTitle = getFirstWhitelistTitle(sectorId, variant);
    const top3 = top10.slice(0, 3).map((r, i) => ({
      title: guardJobTitle({ stage: 'ENGINE_OUT', sectorId, variant, jobTitle: r.job }) ?? fallbackTitle ?? r.job,
      score: r.score,
      why: '',
    }));
    if (typeof console !== 'undefined' && console.log) {
      console.log('[JOB_ANALYZE]', { sectorId, variant, gapTop1Top2, usedRerank: false, reason: 'whitelist<30', finalTop3: top3.map((t) => t.title) });
    }
    return { top3, needsRefinement: false, refinementQuestions: [] };
  }

  let timeoutId;
  try {
    const invokePromise = supabase.functions.invoke('rerank-job', {
      body: {
        sectorId,
        variant,
        whitelistTitles,
        rawAnswers30: rawAnswers,
        sectorSummary: sectorSummary ?? undefined,
        top10Cosine: top10.map((r) => ({ job: r.job, score: r.score })),
        refinementAnswers: refinementAnswers ?? undefined,
      },
    });
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('rerank-job timeout')), RERANK_TIMEOUT_MS);
    });
    const result = await Promise.race([invokePromise, timeoutPromise]);
    if (timeoutId) clearTimeout(timeoutId);
    const { data, error } = result;
    if (error) throw error;
    const top3FromRerank = data?.top3 ?? [];
    const needsRefinement = Boolean(data?.needsRefinement);
    const refinementQuestions = Array.isArray(data?.refinementQuestions) ? data.refinementQuestions : [];
    const top1Description = typeof data?.top1Description === 'string' && data.top1Description.trim() ? data.top1Description.trim() : null;
    const { top3, usedRerank } = validateRerankTop3(top3FromRerank, whitelistTitles, sectorId, variant, top10);
    if (typeof console !== 'undefined' && console.log) {
      console.log('[JOB_ANALYZE]', { sectorId, variant, gapTop1Top2, usedRerank, finalTop3: top3.map((t) => t.title), needsRefinement });
    }
    return { top3, needsRefinement, refinementQuestions, top1Description };
  } catch (err) {
    const fallbackTitle = getFirstWhitelistTitle(sectorId, variant);
    const top3 = top10.slice(0, 3).map((r, i) => ({
      title: guardJobTitle({ stage: 'ENGINE_OUT', sectorId, variant, jobTitle: r.job }) ?? fallbackTitle ?? r.job,
      score: r.score,
      why: '',
    }));
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[JOB_ANALYZE] rerank failed, fallback cosine', err?.message ?? err);
      console.log('[JOB_ANALYZE]', { sectorId, variant, gapTop1Top2, usedRerank: false, finalTop3: top3.map((t) => t.title) });
    }
    return { top3, needsRefinement: false, refinementQuestions: [] };
  }
}
