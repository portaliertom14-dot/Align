/**
 * Génération déterministe de 30 vecteurs métier par secteur à partir d'un archétype.
 * Aucun Math.random() : hash(sectorId + jobTitle) + PRNG seedé pour offsets et nudge.
 * Helpers dupliqués ici pour éviter dépendance circulaire avec matchJobs.
 */

import type { JobVector, JobAxis } from './jobAxes';
import { JOB_AXES } from './jobAxes';

function stableHash(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) + h + str.charCodeAt(i);
    h = h >>> 0;
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  return function next() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    return (t ^ (t >>> 14)) >>> 0;
  };
}

function cosineSimilarity(a: JobVector, b: JobVector): number {
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

const U32 = 0x100000000;

/** Retourne un entier [0, max) de façon déterministe. */
function randInt(rng: () => number, max: number): number {
  return (rng() >>> 0) % max;
}

/** Retourne un float [0, 1) de façon déterministe. */
function randFloat(rng: () => number): number {
  return (rng() >>> 0) / U32;
}

const NUM_OFFSET_AXES = 6;

/**
 * Génère un vecteur par job : archétype + offsets sur 5–6 axes (déterministe à partir de sectorId + jobTitle).
 * Offsets dans [-3..+3], clamp 0..10, arrondi entier. Meilleure répartition pour diversité.
 */
export function generateVectorsForSector(
  sectorId: string,
  archetype: JobVector,
  jobTitles: string[]
): Record<string, JobVector> {
  const axes = JOB_AXES as readonly JobAxis[];
  const result: Record<string, JobVector> = {};
  const deltaChoices = [-3, -2, -1, 1, 2, 3];

  for (const jobTitle of jobTitles) {
    const seed = stableHash(sectorId + '|' + jobTitle);
    const rng = mulberry32(seed);

    const delta: Partial<Record<JobAxis, number>> = {};
    const indices: number[] = [];
    while (indices.length < NUM_OFFSET_AXES) {
      const idx = randInt(rng, axes.length);
      if (!indices.includes(idx)) indices.push(idx);
    }
    for (const idx of indices) {
      const axis = axes[idx]!;
      delta[axis] = deltaChoices[randInt(rng, deltaChoices.length)]!;
    }
    const vec: JobVector = { ...archetype };
    for (const axis of axes) {
      const d = delta[axis] ?? 0;
      const v = Math.max(0, Math.min(10, Math.round(archetype[axis] + d)));
      vec[axis] = v;
    }
    result[jobTitle] = vec;
  }

  return enforceDiversity(sectorId, result);
}

const SIMILARITY_THRESHOLD = 0.97;
const NUDGE_MAX_ITER = 12;
const MIN_DISTINCT_PER_AXIS = 6;

/**
 * Réduit les collisions : cosine pairwise max 0.975, et spread minimal (au moins 6 valeurs distinctes par axe sur les 30 jobs).
 */
function enforceDiversity(
  sectorId: string,
  vectorsByJob: Record<string, JobVector>
): Record<string, JobVector> {
  const jobs = Object.keys(vectorsByJob);
  const axes = JOB_AXES as readonly JobAxis[];
  const out: Record<string, JobVector> = {};
  for (const j of jobs) out[j] = { ...vectorsByJob[j]! };

  for (let i = 0; i < jobs.length; i++) {
    const jobA = jobs[i]!;
    const vecA = out[jobA]!;
    for (let j = i + 1; j < jobs.length; j++) {
      const jobB = jobs[j]!;
      let vecB = out[jobB]!;
      let iter = 0;
      while (iter < NUDGE_MAX_ITER && cosineSimilarity(vecA, vecB) >= SIMILARITY_THRESHOLD) {
        const seed2 = stableHash('NUDGE|' + sectorId + '|' + jobB);
        const rng2 = mulberry32(seed2 + iter * 12345);
        const idx = randInt(rng2, axes.length);
        const axis = axes[idx]!;
        const delta = randFloat(rng2) < 0.5 ? -1 : 1;
        vecB = { ...vecB, [axis]: Math.max(0, Math.min(10, Math.round(vecB[axis] + delta))) };
        out[jobB] = vecB;
        iter++;
      }
    }
  }

  for (const axis of axes) {
    const values = new Set(jobs.map((j) => out[j]![axis]));
    if (values.size >= MIN_DISTINCT_PER_AXIS) continue;
    const jobOrder = [...jobs];
    const rngSpread = mulberry32(stableHash('SPREAD|' + sectorId + '|' + axis));
    for (let k = 0; k < jobOrder.length && values.size < MIN_DISTINCT_PER_AXIS; k++) {
      const j = jobOrder[k]!;
      const current = out[j]![axis] ?? 0;
      const deltas = [-2, -1, 1, 2];
      for (const d of deltas) {
        const cand = Math.max(0, Math.min(10, Math.round(current + d)));
        if (cand !== current && !values.has(cand)) {
          out[j] = { ...out[j]!, [axis]: cand };
          values.add(cand);
          break;
        }
      }
    }
  }

  return out;
}
