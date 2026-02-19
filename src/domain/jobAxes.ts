/**
 * 8 axes validés pour le moteur métier par profils vectoriels.
 * Chaque axe est noté 0..10.
 */

export const JOB_AXES = [
  'STRUCTURE',
  'CREATIVITE',
  'ACTION',
  'CONTACT_HUMAIN',
  'ANALYSE',
  'RISK_TOLERANCE',
  'STABILITE',
  'LEADERSHIP',
] as const;

export type JobAxis = (typeof JOB_AXES)[number];

/** Vecteur de profil métier : une valeur 0..10 par axe. */
export type JobVector = Record<JobAxis, number>;

export const ZERO_JOB_VECTOR: JobVector = {
  STRUCTURE: 0,
  CREATIVITE: 0,
  ACTION: 0,
  CONTACT_HUMAIN: 0,
  ANALYSE: 0,
  RISK_TOLERANCE: 0,
  STABILITE: 0,
  LEADERSHIP: 0,
};
