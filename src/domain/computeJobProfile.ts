/**
 * Calcule le profil utilisateur (vecteur 8 axes) à partir des réponses au quiz métier V2.
 * Input : rawAnswers metier_1..metier_30 (format { value: 'A'|'B'|'C' } ou string).
 * Output : JobVector normalisé (0..10 par axe).
 */

import type { JobVector } from './jobAxes';
import { JOB_AXES, ZERO_JOB_VECTOR } from './jobAxes';
import { JOB_QUESTION_TO_AXES, normalizeToJobVector, type Choice } from './jobQuestionMapping';

const QUESTION_IDS = Array.from({ length: 30 }, (_, i) => `metier_${i + 1}`);

function getChoice(raw: unknown): Choice | null {
  if (raw === null || raw === undefined) return null;
  const v = (raw as { value?: string })?.value ?? raw;
  if (v === 'A' || v === 'B' || v === 'C') return v;
  if (typeof v === 'string') {
    const u = v.trim().toUpperCase();
    if (u === 'A' || u === 'B' || u === 'C') return u;
  }
  return null;
}

/**
 * Agrège les contributions de chaque réponse puis normalise en vecteur 0..10.
 */
export function computeJobProfile(rawAnswers: Record<string, unknown>): JobVector {
  const raw: Partial<JobVector> = { ...ZERO_JOB_VECTOR };

  for (const qId of QUESTION_IDS) {
    const choice = getChoice(rawAnswers[qId]);
    if (choice === null) continue;
    const mapping = JOB_QUESTION_TO_AXES[qId];
    if (!mapping) continue;
    const contribution = mapping[choice];
    if (!contribution) continue;
    for (const axis of JOB_AXES) {
      const add = contribution[axis] ?? 0;
      (raw as Record<string, number>)[axis] = ((raw[axis] ?? 0) + add) as number;
    }
  }

  return normalizeToJobVector(raw);
}
