/**
 * Scoring / matching métier : classement des métiers d'un secteur selon le profil utilisateur (vecteur 8 axes).
 * Pilote : cosine sur vecteurs. Non-pilote : fallback déterministe (shuffle seedé, score 0.5).
 */

import type { SectorId, JobTitle } from '../data/jobsBySector';
import { getJobsForSector } from '../data/jobsBySector';
import { JOB_VECTORS_BY_SECTOR, PILOT_SECTOR, validateJobVectorsForPilot } from '../data/jobVectorsBySector';
import type { JobVector } from './jobAxes';
import { JOB_AXES } from './jobAxes';

export const DEFAULT_TOP_N = 5;

/** Score utilisé pour les résultats fallback (secteur non pilote). */
export const FALLBACK_SCORE = 0.5;

/**
 * Hash stable (djb2) pour dériver un seed à partir d'une string. Sans dépendance externe.
 */
export function stableHash(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) + str.charCodeAt(i);
    h = h >>> 0;
  }
  return h >>> 0;
}

/**
 * PRNG Mulberry32 seedé. Retourne un entier 0..0xFFFFFFFF, déterministe pour un seed donné.
 */
export function mulberry32(seed: number): () => number {
  return function next() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    return ((t ^ (t >>> 14)) >>> 0);
  };
}

/**
 * Shuffle Fisher-Yates déterministe (in-place) avec PRNG seedé.
 */
function seededShuffle<T>(arr: T[], rng: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (rng() % (i + 1)) >>> 0;
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
}

/**
 * Similarité cosinus entre deux vecteurs (0..1). Même ordre d'axes.
 */
export function cosineSimilarity(a: JobVector, b: JobVector): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (const axis of JOB_AXES) {
    const x = a[axis] ?? 0;
    const y = b[axis] ?? 0;
    dot += x * y;
    normA += x * x;
    normB += y * y;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 0;
  return Math.max(0, Math.min(1, dot / denom));
}

/**
 * Classe les métiers du secteur par score de similarité (userVector vs vecteur métier).
 * Retourne les top N (défaut 5), triés par score décroissant.
 *
 * Pilote (business_entrepreneuriat) : validateJobVectorsForPilot() puis cosine ranking.
 * Non-pilote : fallback déterministe (getJobsForSector + shuffle seedé par userVector + sectorId), score 0.5.
 */
export function rankJobsForSector(
  sectorId: SectorId,
  userVector: JobVector,
  topN: number = DEFAULT_TOP_N
): { job: JobTitle; score: number }[] {
  if (sectorId === PILOT_SECTOR) {
    validateJobVectorsForPilot();
    const vectors = JOB_VECTORS_BY_SECTOR[sectorId]!;
    const jobs = getJobsForSector(sectorId);
    const withScores: { job: JobTitle; score: number }[] = jobs.map((job) => {
      const jobVec = vectors[job];
      const score = jobVec ? cosineSimilarity(userVector, jobVec) : 0;
      return { job, score };
    });
    withScores.sort((a, b) => b.score - a.score);
    return withScores.slice(0, topN);
  }

  // Fallback non-pilote : shuffle déterministe
  const jobs = getJobsForSector(sectorId);
  const canonical = JOB_AXES.map((a) => userVector[a]).join(',') + sectorId;
  const seed = stableHash(canonical);
  const rng = mulberry32(seed);
  const copy = [...jobs];
  seededShuffle(copy, rng);
  const n = Math.min(topN, copy.length);
  return copy.slice(0, n).map((job) => ({ job, score: FALLBACK_SCORE }));
}
