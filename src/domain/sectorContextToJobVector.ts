/**
 * Traduit le contexte secteur (extrait quiz / edge analyze-sector) en vecteur 8 axes 0..10,
 * puis fusion pondérée avec le profil métier pour rankJobsForSector.
 */

import { JOB_AXES, ZERO_JOB_VECTOR, type JobVector } from './jobAxes';

export type SectorContextInput = {
  styleCognitif?: string;
  finaliteDominante?: string;
  contexteDomaine?: string;
  signauxTechExplicites?: boolean;
};

function clampAxis(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(10, n));
}

/** humain_direct / humain → humain ; systeme_objet → systeme */
function normalizeFinalite(raw: unknown): 'humain' | 'systeme' | 'mixte' {
  const s = String(raw ?? '').toLowerCase();
  if (s.includes('humain')) return 'humain';
  if (s.includes('systeme') || s.includes('système') || s.includes('objet')) return 'systeme';
  return 'mixte';
}

/**
 * @param ctx - extrait IA (debug.extractedAI) ou équivalent ; objet vide → profil neutre centré.
 */
export function sectorContextToJobVector(ctx: SectorContextInput | null | undefined): JobVector {
  const v: JobVector = { ...ZERO_JOB_VECTOR };

  if (!ctx || typeof ctx !== 'object') {
    for (const k of JOB_AXES) v[k] = 5;
    return v;
  }

  const fd = normalizeFinalite(ctx.finaliteDominante);
  const style = String(ctx.styleCognitif ?? '').toLowerCase();
  const domain = String(ctx.contexteDomaine ?? '').toLowerCase();
  const tech = ctx.signauxTechExplicites === true;

  if (fd === 'humain') {
    v.CONTACT_HUMAIN = 9;
    v.CREATIVITE = 6;
    v.STRUCTURE = 4;
    v.ANALYSE = 4;
    v.ACTION = 5;
    v.LEADERSHIP = 6;
    v.RISK_TOLERANCE = 5;
    v.STABILITE = 5;
  } else if (fd === 'systeme') {
    v.ANALYSE = 9;
    v.STRUCTURE = 8;
    v.CONTACT_HUMAIN = 3;
    v.CREATIVITE = 4;
    v.ACTION = 6;
    v.LEADERSHIP = 5;
    v.RISK_TOLERANCE = 6;
    v.STABILITE = 6;
  } else {
    for (const k of JOB_AXES) v[k] = 5;
  }

  if (style.includes('analyt') || style.includes('logique')) {
    v.ANALYSE = clampAxis(v.ANALYSE + 2);
    v.STRUCTURE = clampAxis(v.STRUCTURE + 1);
  }
  if (style.includes('créatif') || style.includes('creatif')) {
    v.CREATIVITE = clampAxis(v.CREATIVITE + 2);
  }
  if (domain.includes('tech') || domain.includes('data') || tech) {
    v.ANALYSE = clampAxis(v.ANALYSE + 1.5);
    v.STRUCTURE = clampAxis(v.STRUCTURE + 1);
  }

  for (const k of JOB_AXES) v[k] = clampAxis(v[k]);
  return v;
}

/**
 * Combinaison convexe des deux vecteurs (poids non négatifs), puis clamp 0..10 par axe.
 */
export function blendVectors(job: JobVector, ctx: JobVector, wJob: number, wCtx: number): JobVector {
  const wSum = wJob + wCtx;
  const s = wSum > 0 ? wSum : 1;
  const out: JobVector = { ...ZERO_JOB_VECTOR };
  for (const k of JOB_AXES) {
    out[k] = clampAxis((wJob * job[k] + wCtx * ctx[k]) / s);
  }
  return out;
}
