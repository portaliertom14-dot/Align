/**
 * Recommandation métiers par moteur axes (8 axes).
 * Utilise computeJobProfile + rankJobsForSector (pilote = cosine, non-pilote = fallback).
 * Optionnel : sectorContext (quiz secteur / debug.extractedAI) est mélangé au vecteur métier (0.75 job, 0.25 ctx).
 * Réponses attendues : metier_1..metier_30, format { value: 'A'|'B'|'C' }.
 * Option variant : 'default' | 'defense_track' pour droit_justice_securite (sous-profil Défense & Sécurité civile).
 */

import { computeJobProfile } from '../domain/computeJobProfile';
import { rankJobsForSector, FALLBACK_SCORE } from '../domain/matchJobs';
import { assertJobInWhitelist } from '../domain/assertJobInWhitelist';
import { sectorContextToJobVector, blendVectors } from '../domain/sectorContextToJobVector';

const TOP_N = 3;
const W_JOB = 0.75;
const W_CTX = 0.25;

/** Logs debug optionnels (sectorId, userVector, top10, scoreSpread). Activer via DEBUG_JOB_DIVERSITY=true. */
const DEBUG_JOB_DIVERSITY = typeof process !== 'undefined' && process.env?.DEBUG_JOB_DIVERSITY === 'true';

/** Log [JOB_AXES] étendu : top3 (title+score), scoreSpread. Activer via DEBUG_JOB_AXES=true. */
const DEBUG_JOB_AXES = typeof process !== 'undefined' && process.env?.DEBUG_JOB_AXES === 'true';

/**
 * @param {{ sectorId: string, answers: Record<string, { value: string }>, variant?: 'default'|'defense_track', sectorContext?: { styleCognitif?: string, finaliteDominante?: string, contexteDomaine?: string, signauxTechExplicites?: boolean } | null }} input
 * @returns {{ topJobs: { title: string, score: number }[], isFallback: boolean }}
 */
export function recommendJobsByAxes({ sectorId, answers, variant = 'default', sectorContext = null }) {
  const rawAnswers = {};
  for (let i = 1; i <= 30; i++) {
    const key = `metier_${i}`;
    const a = answers[key];
    const value = a && (a.value === 'A' || a.value === 'B' || a.value === 'C') ? a.value : null;
    if (value) rawAnswers[key] = { value };
  }

  const jobVector = computeJobProfile(rawAnswers);
  const vectorForRanking =
    sectorContext && typeof sectorContext === 'object' && (sectorContext.styleCognitif ?? sectorContext.finaliteDominante ?? sectorContext.contexteDomaine)
      ? blendVectors(jobVector, sectorContextToJobVector(sectorContext), W_JOB, W_CTX)
      : jobVector;
  const topNForDebug = DEBUG_JOB_DIVERSITY ? 10 : TOP_N;
  const ranked = rankJobsForSector(sectorId, vectorForRanking, topNForDebug, variant);

  const topJobs = ranked.slice(0, TOP_N).map((r) => ({ title: r.job, score: r.score }));
  const isFallback = topJobs[0]?.score === FALLBACK_SCORE;
  const engine = isFallback ? 'fallback' : 'cosine';

  for (let i = 0; i < topJobs.length; i++) {
    const title = topJobs[i]?.title;
    if (title) assertJobInWhitelist(sectorId, variant, title);
  }

  if (typeof console !== 'undefined' && console.log) {
    const scores = ranked.map((r) => r.score);
    const logPayload = {
      sectorId,
      variant,
      engine,
      isFallback,
      topJobTitle: topJobs[0]?.title ?? null,
      topJobScore: topJobs[0]?.score ?? null,
    };
    if (DEBUG_JOB_AXES || DEBUG_JOB_DIVERSITY) {
      logPayload.top3 = topJobs.slice(0, 3).map((r) => ({ title: r.title, score: r.score }));
      logPayload.scoreSpread = {
        top1: scores[0] ?? null,
        top2: scores[1] ?? null,
        top3: scores[2] ?? null,
        gapTop1Top2: scores[0] != null && scores[1] != null ? scores[0] - scores[1] : null,
        gapTop1Top3: scores[0] != null && scores[2] != null ? scores[0] - scores[2] : null,
      };
    }
    if (DEBUG_JOB_DIVERSITY && ranked.length > 0) {
      logPayload.userVector = vectorForRanking;
      logPayload.top10 = ranked.slice(0, 10).map((r) => ({ job: r.job, score: r.score }));
      logPayload.scoreSpread = {
        ...logPayload.scoreSpread,
        top5: scores[4] ?? null,
        top10: scores[9] ?? null,
        gapTop1Top5: scores[0] != null && scores[4] != null ? scores[0] - scores[4] : null,
      };
    }
    console.log('[JOB_AXES]', logPayload);
  }

  return { topJobs, isFallback };
}
