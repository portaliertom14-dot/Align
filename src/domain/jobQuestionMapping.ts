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

/**
 * metier_1..metier_30 → { A, B, C } avec 1 axe dominant + éventuellement 1 secondaire.
 * Équilibré : chaque axe activable par 6–10 questions, aucun axe > 2× un autre (voir getCountPerAxisAudit).
 */
export const JOB_QUESTION_TO_AXES: Record<string, QuestionAxisMapping> = {
  metier_1:  { A: ax('STRUCTURE', 2),     B: ax('CREATIVITE', 2),   C: ax('ACTION', 2) },
  metier_2:  { A: ax('STABILITE', 2),     B: ax('CREATIVITE', 2),   C: ax('ACTION', 2) },
  metier_3:  { A: ax('ANALYSE', 2),       B: ax('CONTACT_HUMAIN', 2), C: ax('ACTION', 2) },
  metier_4:  { A: ax('ANALYSE', 2),       B: ax('RISK_TOLERANCE', 2), C: ax('ACTION', 2) },
  metier_5:  { A: ax('STRUCTURE', 2),     B: ax('CREATIVITE', 2),   C: ax('STABILITE', 2) },
  metier_6:  { A: ax('STABILITE', 2),     B: ax('RISK_TOLERANCE', 2), C: { RISK_TOLERANCE: 2, ACTION: 1 } },
  metier_7:  { A: ax('STRUCTURE', 2),     B: ax('CREATIVITE', 2),   C: { ACTION: 2, CONTACT_HUMAIN: 1 } },
  metier_8:  { A: ax('STRUCTURE', 2),     B: ax('LEADERSHIP', 2),   C: ax('ACTION', 2) },
  metier_9:  { A: ax('ANALYSE', 2),       B: ax('CONTACT_HUMAIN', 2), C: ax('ACTION', 2) },
  metier_10: { A: ax('ANALYSE', 2),       B: ax('CONTACT_HUMAIN', 2), C: ax('ACTION', 2) },
  metier_11: { A: ax('STABILITE', 2),     B: ax('LEADERSHIP', 2),    C: ax('LEADERSHIP', 2) },
  metier_12: { A: ax('ANALYSE', 2),       B: ax('CREATIVITE', 2),   C: ax('STABILITE', 2) },
  metier_13: { A: ax('STRUCTURE', 2),     B: ax('LEADERSHIP', 2),   C: ax('STABILITE', 2) },
  metier_14: { A: ax('STRUCTURE', 2),     B: ax('CREATIVITE', 2),   C: { ACTION: 2, LEADERSHIP: 1 } },
  metier_15: { A: ax('ANALYSE', 2),       B: ax('STABILITE', 2),    C: ax('ACTION', 2) },
  metier_16: { A: ax('STRUCTURE', 2),     B: ax('CONTACT_HUMAIN', 2), C: ax('CONTACT_HUMAIN', 2) },
  metier_17: { A: ax('STRUCTURE', 2),     B: ax('RISK_TOLERANCE', 2), C: ax('ACTION', 2) },
  metier_18: { A: ax('ANALYSE', 2),       B: ax('LEADERSHIP', 2),   C: ax('LEADERSHIP', 2) },
  metier_19: { A: ax('ANALYSE', 2),       B: { CREATIVITE: 1, CONTACT_HUMAIN: 2 }, C: ax('ACTION', 2) },
  metier_20: { A: ax('ANALYSE', 2),       B: ax('CONTACT_HUMAIN', 2), C: ax('RISK_TOLERANCE', 2) },
  metier_21: { A: ax('STRUCTURE', 2),     B: ax('LEADERSHIP', 2),   C: ax('LEADERSHIP', 2) },
  metier_22: { A: ax('STRUCTURE', 2),     B: { CREATIVITE: 1, LEADERSHIP: 2 }, C: ax('STABILITE', 2) },
  metier_23: { A: ax('STRUCTURE', 2),     B: ax('CREATIVITE', 2),   C: { ACTION: 2, LEADERSHIP: 1 } },
  metier_24: { A: ax('STRUCTURE', 2),     B: ax('CONTACT_HUMAIN', 2), C: ax('CONTACT_HUMAIN', 2) },
  metier_25: { A: ax('ANALYSE', 2),       B: ax('CONTACT_HUMAIN', 2), C: ax('RISK_TOLERANCE', 2) },
  metier_26: { A: ax('STRUCTURE', 2),     B: ax('CREATIVITE', 2),   C: ax('RISK_TOLERANCE', 2) },
  metier_27: { A: ax('STABILITE', 2),     B: ax('CREATIVITE', 2),   C: { ACTION: 1, STABILITE: 1 } },
  metier_28: { A: ax('ANALYSE', 2),       B: ax('RISK_TOLERANCE', 2), C: ax('ACTION', 2) },
  metier_29: { A: ax('STRUCTURE', 2),     B: ax('STABILITE', 2),    C: ax('LEADERSHIP', 2) },
  metier_30: { A: ax('ANALYSE', 2),       B: ax('RISK_TOLERANCE', 2), C: ax('RISK_TOLERANCE', 2) },
};

/** Valeur max théorique par axe après 30 réponses (pour rétrocompat). */
export function getDefaultMaxPerAxis(): number {
  return 60;
}

/**
 * Max théorique par axe d'après le mapping (somme sur 30 questions du max contribution par axe).
 * Utilisé pour normaliser chaque axe indépendamment et éviter qu'un axe domine (ex ACTION/CREATIVITE).
 */
export function getMaxPerAxisFromMapping(): Record<JobAxis, number> {
  const maxPerAxis = { ...ZERO_JOB_VECTOR } as Record<JobAxis, number>;
  for (const qId of Object.keys(JOB_QUESTION_TO_AXES)) {
    const mapping = JOB_QUESTION_TO_AXES[qId]!;
    for (const axis of JOB_AXES) {
      let maxVal = 0;
      for (const choice of ['A', 'B', 'C'] as const) {
        const contrib = mapping[choice]?.[axis] ?? 0;
        if (contrib > maxVal) maxVal = contrib;
      }
      // Pour chaque question, on ne compte que le max d'un seul choix (une réponse = un choix)
      maxPerAxis[axis] += maxVal;
    }
  }
  return maxPerAxis;
}

/** Audit : total des points possibles par axe (pour vérifier équilibre, aucun axe > 2× un autre). */
export function getCountPerAxisAudit(): Record<JobAxis, number> {
  return getMaxPerAxisFromMapping();
}

/** Lève si un axe a plus de 2× le total d'un autre (évite qu'un axe domine le profil). */
export function assertCountPerAxisBalanced(): void {
  const count = getCountPerAxisAudit();
  const values = JOB_AXES.map((a) => count[a]).filter((v) => v > 0);
  if (values.length === 0) return;
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  if (minVal > 0 && maxVal > 2 * minVal) {
    throw new Error(
      `[jobQuestionMapping] Déséquilibre axes: max=${maxVal} > 2×min=${minVal}. countPerAxis=${JSON.stringify(count)}`
    );
  }
}

/**
 * Normalise les sommes brutes vers 0..10 par axe.
 * Chaque axe est normalisé par son max théorique (depuis le mapping) pour que tous les axes aient le même poids.
 * valueNorm = clamp(0, 10, round((rawAxis / maxPerAxis[axis]) * 10)).
 */
export function normalizeToJobVector(
  raw: Partial<JobVector>,
  maxPerAxisOrSingle: Record<JobAxis, number> | number = getMaxPerAxisFromMapping()
): JobVector {
  const maxPerAxis: Record<JobAxis, number> =
    typeof maxPerAxisOrSingle === 'number'
      ? JOB_AXES.reduce((acc, a) => ({ ...acc, [a]: maxPerAxisOrSingle }), {} as Record<JobAxis, number>)
      : maxPerAxisOrSingle;
  const out = { ...ZERO_JOB_VECTOR };
  for (const axis of JOB_AXES) {
    const v = raw[axis] ?? 0;
    const maxVal = maxPerAxis[axis] ?? 1;
    const scaled = maxVal <= 0 ? 0 : Math.min(10, Math.max(0, (v / maxVal) * 10));
    out[axis] = Math.round(scaled * 100) / 100;
  }
  return out;
}
