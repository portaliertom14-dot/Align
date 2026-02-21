/**
 * Moteur de scoring déterministe — profil axes + clusters.
 * Sans IA : buildProfileFromMetierAnswers, scoreClusters, pickTopCandidates.
 */

import type { ClusterId } from './clusters.ts';
import { CLUSTERS, getClusterCandidates, getClustersForSector } from './clusters.ts';

export type ProfileAxes = {
  analytic: number;
  creative: number;
  operational: number;
  social: number;
  risk: number;
  structure: number;
};

export const AXES_KEYS: (keyof ProfileAxes)[] = ['analytic', 'creative', 'operational', 'social', 'risk', 'structure'];

export const ZERO_PROFILE: ProfileAxes = {
  analytic: 0,
  creative: 0,
  operational: 0,
  social: 0,
  risk: 0,
  structure: 0,
};

/** 12 questions communes métier (metier_common_1..12) → profil 6 axes. */
const METIER_COMMON_DELTAS: Record<string, [Partial<ProfileAxes>, Partial<ProfileAxes>, Partial<ProfileAxes>]> = {
  metier_common_1: [{ analytic: 2, structure: 1 }, { creative: 3 }, { operational: 3, risk: 1 }],
  metier_common_2: [{ structure: 3, risk: -1 }, { creative: 2 }, { operational: 2, risk: 1 }],
  metier_common_3: [{ analytic: 2, structure: 1 }, { creative: 3 }, { operational: 2 }],
  metier_common_4: [{ analytic: 3 }, { creative: 3 }, { operational: 3 }],
  metier_common_5: [{ structure: 3, analytic: 1 }, { creative: 2 }, { operational: 2, risk: 1 }],
  metier_common_6: [{ structure: 2, risk: -2 }, { risk: 0 }, { risk: 3, operational: 1 }],
  metier_common_7: [{ analytic: 1, social: -1 }, { creative: 1, social: 2 }, { operational: 2, social: 2 }],
  metier_common_8: [{ structure: 1 }, { creative: 1 }, { operational: 1, risk: 1 }],
  metier_common_9: [{ analytic: 2, structure: 2 }, { creative: 3 }, { operational: 2, risk: 1 }],
  metier_common_10: [{ structure: 2, risk: -1 }, { creative: 2 }, { operational: 2, risk: 2 }],
  metier_common_11: [{ analytic: 2, structure: 2 }, { creative: 2 }, { operational: 2, risk: 1 }],
  metier_common_12: [{ analytic: 3 }, { creative: 2 }, { operational: 3 }],
};

/** Pour chaque question métier (metier_1..metier_20), 3 options → deltas par axe. */
const METIER_AXIS_DELTAS: Record<string, [Partial<ProfileAxes>, Partial<ProfileAxes>, Partial<ProfileAxes>]> = {
  metier_1: [
    { analytic: 2, structure: 1 },
    { creative: 3 },
    { operational: 3, risk: 1 },
  ],
  metier_2: [
    { structure: 3, risk: -1 },
    { creative: 2 },
    { operational: 2, risk: 1 },
  ],
  metier_3: [
    { analytic: 2, structure: 1 },
    { creative: 3 },
    { operational: 2 },
  ],
  metier_4: [
    { analytic: 3 },
    { creative: 3 },
    { operational: 3 },
  ],
  metier_5: [
    { structure: 3, analytic: 1 },
    { creative: 2 },
    { operational: 2, risk: 1 },
  ],
  metier_6: [
    { structure: 2, risk: -2 },
    { risk: 0 },
    { risk: 3, operational: 1 },
  ],
  metier_7: [
    { analytic: 1, social: -1 },
    { creative: 1, social: 2 },
    { operational: 2, social: 2 },
  ],
  metier_8: [
    { structure: 1 },
    { creative: 1 },
    { operational: 1, risk: 1 },
  ],
  metier_9: [
    { analytic: 2, structure: 2 },
    { creative: 3 },
    { operational: 2, risk: 1 },
  ],
  metier_10: [
    { structure: 2, risk: -1 },
    { creative: 2 },
    { operational: 2, risk: 2 },
  ],
  metier_11: [
    { analytic: 2, structure: 2 },
    { creative: 2 },
    { operational: 2, risk: 1 },
  ],
  metier_12: [
    { analytic: 3 },
    { creative: 2 },
    { operational: 3 },
  ],
  metier_13: [
    { structure: 3, risk: -1 },
    { creative: 1 },
    { operational: 2, risk: 1 },
  ],
  metier_14: [
    { analytic: 3 },
    { creative: 3 },
    { operational: 2 },
  ],
  metier_15: [
    { analytic: 1, social: 0 },
    { creative: 1, social: 2 },
    { social: 3, operational: 1 },
  ],
  metier_16: [
    { analytic: 2, structure: 2 },
    { creative: 1 },
    { operational: 2 },
  ],
  metier_17: [
    { structure: 3 },
    { creative: 1, risk: 1 },
    { operational: 2, risk: 1 },
  ],
  metier_18: [
    { structure: 3, analytic: 1 },
    { creative: 2 },
    { operational: 2, risk: 2 },
  ],
  metier_19: [
    { analytic: 2, structure: 1 },
    { creative: 3 },
    { operational: 2 },
  ],
  metier_20: [
    { analytic: 2, structure: 1 },
    { creative: 3 },
    { operational: 2 },
  ],
};

function getOptionIndex(questionId: string, answerText: string, questions: { id: string; question?: string; options?: unknown[] }[]): number {
  const q = questions.find((qu) => qu.id === questionId);
  const opts = Array.isArray(q?.options) ? q.options : [];
  const normalizedAnswer = (answerText ?? '').trim().toLowerCase();
  for (let i = 0; i < opts.length; i++) {
    const o = opts[i];
    const label = typeof o === 'string' ? o : (o && typeof o === 'object' && 'label' in o ? String((o as { label?: string }).label ?? '') : '');
    if (label.trim().toLowerCase() === normalizedAnswer || label.trim().toLowerCase().includes(normalizedAnswer) || normalizedAnswer.includes(label.trim().toLowerCase())) {
      return i;
    }
  }
  if (opts.length >= 1) return 0;
  return 0;
}

/**
 * Construit le profil 6 axes à partir des 12 questions communes métier.
 */
export function buildProfileFromMetierCommonAnswers(
  answers: Record<string, string>,
  questions: { id: string; question?: string; options?: unknown[] }[] = []
): ProfileAxes {
  const raw: ProfileAxes = { ...ZERO_PROFILE };
  for (const [qId, answerText] of Object.entries(answers)) {
    const deltas = METIER_COMMON_DELTAS[qId];
    if (!deltas) continue;
    const optionIndex = Math.min(2, Math.max(0, getOptionIndex(qId, answerText, questions)));
    const d = deltas[optionIndex] ?? {};
    for (const k of AXES_KEYS) {
      const v = d[k];
      if (v != null) raw[k] += v;
    }
  }
  return normalizeProfile(raw);
}

/**
 * Construit le profil 6 axes à partir des réponses du quiz métier (20 questions legacy).
 */
export function buildProfileFromMetierAnswers(
  answers: Record<string, string>,
  questions: { id: string; question?: string; options?: unknown[] }[] = []
): ProfileAxes {
  const raw: ProfileAxes = { ...ZERO_PROFILE };
  for (const [qId, answerText] of Object.entries(answers)) {
    const deltas = METIER_AXIS_DELTAS[qId] ?? METIER_COMMON_DELTAS[qId];
    if (!deltas) continue;
    const optionIndex = Math.min(2, Math.max(0, getOptionIndex(qId, answerText, questions)));
    const d = deltas[optionIndex] ?? {};
    for (const k of AXES_KEYS) {
      const v = d[k];
      if (v != null) raw[k] += v;
    }
  }
  return normalizeProfile(raw);
}

/**
 * Profil partiel depuis réponses quiz secteur (pour fusion future).
 */
export function buildProfileFromSectorAnswers(_answers: Record<string, string>): Partial<ProfileAxes> {
  return {};
}

export function normalizeProfile(p: ProfileAxes): ProfileAxes {
  let min = 0;
  let max = 0;
  for (const k of AXES_KEYS) {
    const v = p[k];
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const range = max - min || 1;
  const out = { ...ZERO_PROFILE };
  for (const k of AXES_KEYS) {
    out[k] = Math.round((10 * (p[k] - min)) / range * 100) / 100;
    out[k] = Math.max(0, Math.min(10, out[k]));
  }
  return out;
}

/** Poids préférés par cluster (plus c’est haut, plus le cluster matche). */
const CLUSTER_WEIGHTS: Record<string, Partial<ProfileAxes>> = {
  builder_tech: { analytic: 2.5, structure: 2, creative: 0.5 },
  maker_engineering: { analytic: 1.5, operational: 2.5, structure: 1.5 },
  healthcare_help: { social: 3, operational: 1, risk: -0.5 },
  law_security: { analytic: 1.5, structure: 2, social: 0.5 },
  business_sales: { social: 2, operational: 1.5, risk: 1 },
  business_product: { analytic: 1.5, structure: 2, operational: 1.5 },
  creator_design: { creative: 3, analytic: 0.5 },
  creator_media: { creative: 2.5, social: 1 },
  science_research: { analytic: 3, structure: 1.5 },
  education_support: { social: 2.5, creative: 0.5, structure: 1 },
  public_service: { structure: 2, social: 1, risk: -0.5 },
  field_ops: { operational: 3, risk: 2, structure: 0.5 },
};

export interface ClusterScore {
  clusterId: string;
  score: number;
  why: string[];
}

/**
 * Score chaque cluster selon le profil ; retourne trié par score décroissant.
 */
export function scoreClusters(profile: ProfileAxes): ClusterScore[] {
  const out: ClusterScore[] = [];
  for (const cluster of CLUSTERS) {
    const weights = CLUSTER_WEIGHTS[cluster.id] ?? {};
    let score = 0;
    const why: string[] = [];
    for (const k of AXES_KEYS) {
      const w = (weights as ProfileAxes)[k] ?? 0;
      const v = profile[k];
      score += w * v;
      if (w > 0 && v >= 5) why.push(`${k}=${v.toFixed(1)}`);
    }
    out.push({ clusterId: cluster.id, score: Math.round(score * 100) / 100, why });
  }
  out.sort((a, b) => b.score - a.score);
  return out;
}

/** Jobs trop fréquents : à exclure si leur cluster n’est pas dans le top. */
const OVERUSED_JOBS: Record<string, string[]> = {
  designer: ['creator_design', 'creator_media'],
  entrepreneur: ['business_sales', 'business_product'],
  developpeur: ['builder_tech'],
};

/** Pénalités pour diversité : jobs/clusters récemment utilisés. */
const PENALTY_RECENT_JOB = 0.8;
const PENALTY_RECENT_CLUSTER = 0.4;

/**
 * Top clusters → candidats par cluster, avec anti-générique et pénalités récent (diversité).
 */
export function pickTopCandidates(
  clusterScores: ClusterScore[],
  kClusters: number = 3,
  kJobsPerCluster: number = 5,
  options?: {
    penalizeOverused?: boolean;
    recentJobIds?: string[];
    recentClusterIds?: string[];
  }
): { clusterId: string; candidates: string[] }[] {
  const topClusterIds = new Set(clusterScores.slice(0, kClusters).map((c) => c.clusterId));
  const recentJobs = new Set((options?.recentJobIds ?? []).map((id) => id.trim().toLowerCase()));
  const recentClusters = new Set((options?.recentClusterIds ?? []).map((id) => id.trim().toLowerCase()));
  const result: { clusterId: string; candidates: string[] }[] = [];
  const seenJobs = new Set<string>();

  for (let i = 0; i < Math.min(kClusters, clusterScores.length); i++) {
    const { clusterId } = clusterScores[i];
    let candidates = getClusterCandidates(clusterId).slice(0, kJobsPerCluster);

    if (options?.penalizeOverused !== false) {
      candidates = candidates.filter((jobId) => {
        const allowedClusters = OVERUSED_JOBS[jobId];
        if (!allowedClusters) return true;
        return allowedClusters.some((cid) => topClusterIds.has(cid));
      });
    }

    const deduped = candidates.filter((j) => {
      if (seenJobs.has(j)) return false;
      seenJobs.add(j);
      return true;
    });

    result.push({ clusterId, candidates: deduped });
  }

  return result;
}

/**
 * Applique des pénalités de score aux clusters/jobs récemment utilisés (pour diversité).
 * Retourne clusterScores avec scores ajustés (sans muter l'entrée).
 */
export function applyRecentPenalties(
  clusterScores: ClusterScore[],
  recentJobIds: string[] = [],
  recentClusterIds: string[] = []
): ClusterScore[] {
  if (recentJobIds.length === 0 && recentClusterIds.length === 0) return clusterScores;
  const recentJ = new Set(recentJobIds.map((id) => id.trim().toLowerCase()));
  const recentC = new Set(recentClusterIds.map((id) => id.trim().toLowerCase()));
  return clusterScores.map((c) => {
    let penalty = 0;
    if (recentC.has(c.clusterId)) penalty += PENALTY_RECENT_CLUSTER;
    const candidates = getClusterCandidates(c.clusterId);
    const recentInCluster = candidates.filter((j) => recentJ.has(j));
    if (recentInCluster.length > 0) penalty += PENALTY_RECENT_JOB * Math.min(1, recentInCluster.length / 2);
    return { ...c, score: Math.max(0, c.score - penalty) };
  }).sort((a, b) => b.score - a.score);
}

export { getClusterCandidates };

export interface JobScore {
  jobId: string;
  score: number;
}

/**
 * Score les jobs d'un secteur à partir du profil commun (6 axes).
 * Retourne les jobs du secteur triés par score décroissant.
 */
export function scoreJobsWithinSector(
  sectorId: string,
  commonProfile: ProfileAxes
): JobScore[] {
  const clusterIds = getClustersForSector(sectorId);
  const jobScores = new Map<string, number>();
  for (const cid of clusterIds) {
    const weights = CLUSTER_WEIGHTS[cid] ?? {};
    let clusterScore = 0;
    for (const k of AXES_KEYS) {
      const w = (weights as ProfileAxes)[k] ?? 0;
      clusterScore += w * commonProfile[k];
    }
    const jobs = getClusterCandidates(cid);
    for (const jobId of jobs) {
      const current = jobScores.get(jobId) ?? 0;
      jobScores.set(jobId, Math.max(current, clusterScore));
    }
  }
  const out: JobScore[] = Array.from(jobScores.entries()).map(([jobId, score]) => ({
    jobId,
    score: Math.round(score * 100) / 100,
  }));
  out.sort((a, b) => b.score - a.score);
  return out;
}
