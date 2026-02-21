/**
 * Mapping du contexte secteur (quiz secteur / extractedAI) vers un vecteur 8 axes.
 * Utilisé pour mélanger le profil métier (quiz métier) avec le profil secteur.
 */

import type { JobVector } from './jobAxes';
import { JOB_AXES, ZERO_JOB_VECTOR } from './jobAxes';

/** Contexte extrait par l'IA secteur (debug.extractedAI). */
export interface SectorContext {
  styleCognitif?: string;
  finaliteDominante?: string;
  contexteDomaine?: string;
  signauxTechExplicites?: boolean;
}

const CLAMP_MIN = 0;
const CLAMP_MAX = 10;

function clamp(v: number): number {
  return Math.max(CLAMP_MIN, Math.min(CLAMP_MAX, v));
}

/**
 * Construit un JobVector à partir du contexte secteur.
 * Règles (valeurs 0..10, additions puis clamp) :
 * - styleCognitif: analytique_structuré -> STRUCTURE+2, ANALYSE+2; creatif_intuitif -> CREATIVITE+3
 * - finaliteDominante: systeme_objet -> ANALYSE+1, STRUCTURE+1; humain -> CONTACT_HUMAIN+3, LEADERSHIP+1; performance -> ACTION+2, RISK_TOLERANCE+1
 * - contexteDomaine: mecanismes_objet -> ANALYSE+2; texte_norme -> STRUCTURE+2, STABILITE+1; terrain_urgence -> ACTION+2, RISK_TOLERANCE+2
 */
export function sectorContextToJobVector(ctx: SectorContext | null | undefined): JobVector {
  const v: JobVector = { ...ZERO_JOB_VECTOR };
  if (!ctx) return v;

  const style = (ctx.styleCognitif ?? '').toLowerCase().trim();
  const finalite = (ctx.finaliteDominante ?? '').toLowerCase().trim();
  const domaine = (ctx.contexteDomaine ?? '').toLowerCase().trim();

  // styleCognitif
  if (style === 'analytique_structuré') {
    v.STRUCTURE = (v.STRUCTURE ?? 0) + 2;
    v.ANALYSE = (v.ANALYSE ?? 0) + 2;
  } else if (style === 'creatif_intuitif') {
    v.CREATIVITE = (v.CREATIVITE ?? 0) + 3;
  }

  // finaliteDominante
  if (finalite === 'systeme_objet') {
    v.ANALYSE = (v.ANALYSE ?? 0) + 1;
    v.STRUCTURE = (v.STRUCTURE ?? 0) + 1;
  } else if (finalite === 'humain') {
    v.CONTACT_HUMAIN = (v.CONTACT_HUMAIN ?? 0) + 3;
    v.LEADERSHIP = (v.LEADERSHIP ?? 0) + 1;
  } else if (finalite === 'performance') {
    v.ACTION = (v.ACTION ?? 0) + 2;
    v.RISK_TOLERANCE = (v.RISK_TOLERANCE ?? 0) + 1;
  }

  // contexteDomaine
  if (domaine === 'mecanismes_objet') {
    v.ANALYSE = (v.ANALYSE ?? 0) + 2;
  } else if (domaine === 'texte_norme') {
    v.STRUCTURE = (v.STRUCTURE ?? 0) + 2;
    v.STABILITE = (v.STABILITE ?? 0) + 1;
  } else if (domaine === 'terrain_urgence') {
    v.ACTION = (v.ACTION ?? 0) + 2;
    v.RISK_TOLERANCE = (v.RISK_TOLERANCE ?? 0) + 2;
  }

  for (const axis of JOB_AXES) {
    v[axis] = clamp(v[axis] ?? 0);
  }
  return v;
}

/**
 * Mélange deux vecteurs : blended = job * wJob + ctx * wCtx, puis clamp 0..10.
 */
export function blendVectors(
  jobVector: JobVector,
  ctxVector: JobVector,
  wJob: number,
  wCtx: number
): JobVector {
  const out: JobVector = { ...ZERO_JOB_VECTOR };
  for (const axis of JOB_AXES) {
    const j = jobVector[axis] ?? 0;
    const c = ctxVector[axis] ?? 0;
    out[axis] = clamp(j * wJob + c * wCtx);
  }
  return out;
}
