/**
 * Mapping réponses quiz métier V2 (metier_1..metier_30) vers les 8 axes.
 * Chaque réponse (A/B/C) ajoute des points sur 1 à 2 axes max.
 * Les valeurs brutes sont ensuite normalisées (clamp 0..10) dans computeJobProfile.
 */

import type { JobAxis, JobVector } from './jobAxes';
import { JOB_AXES, ZERO_JOB_VECTOR } from './jobAxes';

export type Choice = 'A' | 'B' | 'C';

export type QuestionAxisMapping = {
  A: Partial<JobVector>;
  B: Partial<JobVector>;
  C: Partial<JobVector>;
};

const ax = (axis: JobAxis, value: number): Partial<JobVector> => ({ [axis]: value });

/** metier_1..metier_30 → { A, B, C } avec 1 à 2 axes par choix (points 1–3). */
export const JOB_QUESTION_TO_AXES: Record<string, QuestionAxisMapping> = {
  metier_1:  { A: ax('STRUCTURE', 2),     B: ax('CREATIVITE', 2),   C: ax('ACTION', 2) },
  metier_2:  { A: ax('STABILITE', 2),     B: ax('CREATIVITE', 2),   C: ax('ACTION', 2) },
  metier_3:  { A: ax('ANALYSE', 2),       B: ax('CREATIVITE', 2),   C: ax('ACTION', 2) },
  metier_4:  { A: ax('ANALYSE', 2),       B: ax('CREATIVITE', 2),   C: ax('ACTION', 2) },
  metier_5:  { A: ax('STRUCTURE', 2),     B: ax('CREATIVITE', 1),   C: ax('ACTION', 2) },
  metier_6:  { A: ax('STABILITE', 2),     B: { RISK_TOLERANCE: 2 }, C: { RISK_TOLERANCE: 3, ACTION: 1 } },
  metier_7:  { A: ax('STRUCTURE', 2),     B: ax('CREATIVITE', 2),   C: { ACTION: 2, CONTACT_HUMAIN: 1 } },
  metier_8:  { A: ax('STRUCTURE', 2),     B: ax('CREATIVITE', 2),   C: ax('ACTION', 2) },
  metier_9:  { A: ax('ANALYSE', 2),       B: ax('CREATIVITE', 2),   C: ax('ACTION', 2) },
  metier_10: { A: ax('ANALYSE', 2),       B: ax('CREATIVITE', 2),   C: ax('ACTION', 2) },
  metier_11: { A: ax('STABILITE', 2),     B: ax('CREATIVITE', 2),   C: ax('ACTION', 2) },
  metier_12: { A: ax('ANALYSE', 2),       B: ax('CREATIVITE', 2),   C: ax('ACTION', 2) },
  metier_13: { A: ax('STRUCTURE', 2),     B: ax('CREATIVITE', 2),   C: ax('ACTION', 2) },
  metier_14: { A: ax('STRUCTURE', 2),     B: ax('CREATIVITE', 2),   C: { ACTION: 2, LEADERSHIP: 1 } },
  metier_15: { A: ax('ANALYSE', 2),       B: ax('CREATIVITE', 1),   C: ax('ACTION', 2) },
  metier_16: { A: ax('STRUCTURE', 2),     B: ax('CREATIVITE', 2),   C: ax('ACTION', 2) },
  metier_17: { A: ax('STRUCTURE', 2),     B: ax('CREATIVITE', 2),   C: ax('ACTION', 2) },
  metier_18: { A: ax('ANALYSE', 2),       B: ax('CREATIVITE', 2),   C: ax('ACTION', 2) },
  metier_19: { A: ax('ANALYSE', 2),       B: { CREATIVITE: 1, CONTACT_HUMAIN: 2 }, C: ax('ACTION', 2) },
  metier_20: { A: ax('ANALYSE', 2),       B: ax('CREATIVITE', 2),   C: ax('ACTION', 2) },
  metier_21: { A: ax('STRUCTURE', 2),     B: ax('CREATIVITE', 2),   C: ax('ACTION', 2) },
  metier_22: { A: ax('STRUCTURE', 2),     B: { CREATIVITE: 1, LEADERSHIP: 2 }, C: ax('ACTION', 2) },
  metier_23: { A: ax('STRUCTURE', 2),     B: ax('CREATIVITE', 2),   C: { ACTION: 2, LEADERSHIP: 1 } },
  metier_24: { A: ax('STRUCTURE', 1),     B: ax('CREATIVITE', 2),   C: ax('CONTACT_HUMAIN', 2) },
  metier_25: { A: ax('ANALYSE', 2),       B: ax('CREATIVITE', 2),   C: ax('ACTION', 2) },
  metier_26: { A: ax('STRUCTURE', 2),     B: ax('CREATIVITE', 2),   C: ax('ACTION', 2) },
  metier_27: { A: ax('STABILITE', 2),     B: ax('CREATIVITE', 2),   C: ax('ACTION', 2) },
  metier_28: { A: ax('ANALYSE', 2),       B: ax('CREATIVITE', 2),   C: ax('ACTION', 2) },
  metier_29: { A: ax('STRUCTURE', 2),     B: ax('CREATIVITE', 2),   C: ax('ACTION', 2) },
  metier_30: { A: ax('ANALYSE', 2),       B: ax('CREATIVITE', 2),   C: ax('ACTION', 2) },
};

/** Valeur max théorique par axe après 30 réponses (pour normalisation). */
export function getDefaultMaxPerAxis(): number {
  return 60; // 30 questions × 2 pts max par axe par réponse
}

/**
 * Clamp et normalise les sommes brutes vers 0..10 par axe.
 * Stratégie : scale linéaire (raw / maxRaw * 10) puis clamp 0..10.
 */
export function normalizeToJobVector(raw: Partial<JobVector>, maxPerAxis: number = getDefaultMaxPerAxis()): JobVector {
  const out = { ...ZERO_JOB_VECTOR };
  for (const axis of JOB_AXES) {
    const v = raw[axis] ?? 0;
    const scaled = Math.min(10, Math.max(0, (v / maxPerAxis) * 10));
    out[axis] = Math.round(scaled * 100) / 100;
  }
  return out;
}
