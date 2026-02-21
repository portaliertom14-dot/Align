/**
 * Scoring secteur 100% déterministe — profil 6 axes depuis 40 réponses quiz secteur.
 * Pas de keyword scoring. Choix secteur par score uniquement ; confiance => undetermined si faible.
 */

import type { ProfileAxes } from './scoring.ts';
import { AXES_KEYS, ZERO_PROFILE, normalizeProfile } from './scoring.ts';
import { SECTOR_IDS } from './sectors.ts';

export type SectorScore = { secteurId: string; score: number };

const AXES_KEYS_SECTOR = AXES_KEYS as (keyof ProfileAxes)[];

/** Deltas par question secteur (secteur_1..secteur_40), 3 options chacune. Option 0 = axe A, 1 = B, 2 = C. */
function buildSecteurAxisDeltas(): Record<string, [Partial<ProfileAxes>, Partial<ProfileAxes>, Partial<ProfileAxes>]> {
  const out: Record<string, [Partial<ProfileAxes>, Partial<ProfileAxes>, Partial<ProfileAxes>]> = {};
  // Domaine (1-24): répartis pour discriminer secteurs. Option 0 souvent analytic/structure, 1 creative, 2 operational/social/risk
  const domainTemplates: [Partial<ProfileAxes>, Partial<ProfileAxes>, Partial<ProfileAxes>][] = [
    [{ analytic: 2, structure: 1 }, { creative: 2 }, { operational: 2, social: 1 }],
    [{ analytic: 2 }, { creative: 2, risk: 0.5 }, { operational: 2, risk: 1 }],
    [{ structure: 2, analytic: 1 }, { creative: 2.5 }, { operational: 1.5, social: 1 }],
    [{ analytic: 2.5 }, { creative: 1.5 }, { operational: 2, risk: 0.5 }],
    [{ analytic: 2, structure: 1.5 }, { creative: 2 }, { social: 2, operational: 1 }],
    [{ analytic: 2 }, { creative: 2.5, structure: -0.5 }, { operational: 2, risk: 1 }],
    [{ structure: 2.5, analytic: 1 }, { creative: 2 }, { operational: 1.5, social: 1.5 }],
    [{ analytic: 2, structure: 2 }, { creative: 1.5 }, { operational: 2, risk: 0.5 }],
    [{ analytic: 2.5, structure: 1 }, { creative: 2 }, { operational: 1.5, social: 2 }],
    [{ structure: 2 }, { creative: 2.5 }, { operational: 2, risk: 1 }],
    [{ analytic: 2, structure: 1.5 }, { creative: 2, social: 1 }, { operational: 2, risk: 1 }],
    [{ analytic: 2.5 }, { creative: 2 }, { operational: 1.5, social: 1 }],
    [{ analytic: 2, structure: 2 }, { creative: 1.5, social: 1 }, { operational: 2 }],
    [{ analytic: 2.5, structure: 1 }, { creative: 2 }, { operational: 1.5, social: 1.5 }],
    [{ structure: 2 }, { creative: 2.5, social: 0.5 }, { operational: 2, risk: 1 }],
    [{ analytic: 2, structure: 1.5 }, { creative: 2, social: 1 }, { operational: 2, risk: 0.5 }],
    [{ analytic: 2.5, structure: 1 }, { creative: 2 }, { operational: 2, social: 1 }],
    [{ analytic: 2, structure: 2 }, { creative: 2 }, { operational: 1.5, social: 1 }],
    [{ analytic: 2.5 }, { creative: 2, social: 1 }, { operational: 1.5, risk: 1 }],
    [{ structure: 2, analytic: 1.5 }, { creative: 2.5 }, { operational: 2 }],
    [{ analytic: 2, structure: 1.5 }, { creative: 2 }, { operational: 2, social: 1 }],
    [{ analytic: 2.5, structure: 1 }, { creative: 2 }, { operational: 1.5, social: 1.5 }],
    [{ structure: 2, analytic: 1.5 }, { creative: 2.5 }, { operational: 1.5, risk: 1 }],
    [{ analytic: 2, structure: 2 }, { creative: 2 }, { operational: 2 }],
  ];
  for (let i = 1; i <= 24; i++) {
    out[`secteur_${i}`] = domainTemplates[(i - 1) % domainTemplates.length];
  }
  // Style (25-40): rythme, structure, social, risque
  const styleTemplates: [Partial<ProfileAxes>, Partial<ProfileAxes>, Partial<ProfileAxes>][] = [
    [{ structure: 2, analytic: 1 }, { creative: 1.5 }, { operational: 2, risk: 1 }],
    [{ analytic: 1.5, structure: 2 }, { creative: 2 }, { operational: 1.5, social: 1 }],
    [{ structure: 2 }, { creative: 1.5, social: 1 }, { operational: 2, risk: 1 }],
    [{ analytic: 2, structure: 1 }, { creative: 2 }, { operational: 1.5, social: 1.5 }],
    [{ structure: 2.5 }, { creative: 2 }, { operational: 1.5, risk: 1 }],
    [{ analytic: 2 }, { creative: 2 }, { operational: 2, social: 0.5 }],
    [{ analytic: 1.5, structure: 2 }, { creative: 2, social: 1 }, { operational: 2 }],
    [{ structure: 2 }, { creative: 2.5 }, { operational: 1.5, risk: 0.5 }],
    [{ analytic: 2, structure: 1.5 }, { creative: 2 }, { operational: 2, social: 1 }],
    [{ analytic: 2.5, structure: 1 }, { creative: 1.5, social: 2 }, { operational: 2 }],
    [{ structure: 2, analytic: 1 }, { creative: 2.5 }, { operational: 1.5, risk: 1 }],
    [{ analytic: 2, structure: 2 }, { creative: 2 }, { operational: 1.5 }],
    [{ analytic: 2, structure: 1.5 }, { creative: 2, social: 1 }, { operational: 2, risk: 0.5 }],
    [{ structure: 2 }, { creative: 2 }, { operational: 2, risk: 1 }],
    [{ analytic: 2.5 }, { creative: 1.5, social: 1 }, { operational: 2 }],
    [{ analytic: 2, structure: 2 }, { creative: 2 }, { operational: 1.5, social: 1 }],
  ];
  for (let i = 25; i <= 40; i++) {
    out[`secteur_${i}`] = styleTemplates[(i - 25) % styleTemplates.length];
  }
  return out;
}

const SECTEUR_AXIS_DELTAS = buildSecteurAxisDeltas();

/** Poids par secteur (plus c'est haut sur un axe, plus le secteur matche). */
const SECTOR_WEIGHTS: Record<string, Partial<ProfileAxes>> = {
  ingenierie_tech: { analytic: 2.5, structure: 2, creative: 0.5, operational: 1 },
  creation_design: { creative: 3, analytic: 0.5, structure: 0.5 },
  business_entrepreneuriat: { social: 2, operational: 1.5, risk: 1, structure: 1 },
  sante_bien_etre: { social: 3, operational: 1, risk: -0.5 },
  droit_justice_securite: { analytic: 1.5, structure: 2, social: 0.5 },
  defense_securite_civile: { operational: 3, risk: 2, structure: 0.5 },
  education_formation: { social: 2.5, creative: 0.5, structure: 1 },
  sciences_recherche: { analytic: 3, structure: 1.5 },
  data_ia: { analytic: 2.5, structure: 2, operational: 1 },
  industrie_artisanat: { operational: 2.5, analytic: 1.5, structure: 1.5 },
  environnement_agri: { operational: 2, risk: 0.5, structure: 1, social: 0.5 },
  communication_media: { creative: 2.5, social: 1 },
  finance_assurance: { analytic: 2, structure: 2, risk: 0.5 },
  sport_evenementiel: { operational: 2.5, risk: 1.5, social: 1 },
  social_humain: { social: 3, creative: 0.5, operational: 1 },
  culture_patrimoine: { creative: 2, structure: 1, social: 1 },
};

function getOptionIndexSector(
  questionId: string,
  answerText: string,
  questions: { id: string; question?: string; options?: unknown[] }[]
): number {
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
  return opts.length >= 1 ? 0 : 0;
}

/**
 * Construit le profil 6 axes à partir des 40 réponses du quiz secteur.
 */
export function buildSectorProfileFromSecteurAnswers(
  answers: Record<string, string>,
  questions: { id: string; question?: string; options?: unknown[] }[] = []
): ProfileAxes {
  const raw: ProfileAxes = { ...ZERO_PROFILE };
  for (const [qId, answerText] of Object.entries(answers)) {
    const deltas = SECTEUR_AXIS_DELTAS[qId];
    if (!deltas) continue;
    const optionIndex = Math.min(2, Math.max(0, getOptionIndexSector(qId, answerText, questions)));
    const d = deltas[optionIndex] ?? {};
    for (const k of AXES_KEYS_SECTOR) {
      const v = d[k];
      if (v != null) raw[k] += v;
    }
  }
  return normalizeProfile(raw);
}

/**
 * Score chaque secteur selon le profil ; retourne trié par score décroissant.
 */
export function scoreSectors(profile: ProfileAxes): SectorScore[] {
  const out: SectorScore[] = [];
  for (const sectorId of SECTOR_IDS as unknown as string[]) {
    const weights = SECTOR_WEIGHTS[sectorId] ?? {};
    let score = 0;
    for (const k of AXES_KEYS_SECTOR) {
      const w = (weights as ProfileAxes)[k] ?? 0;
      const v = profile[k];
      score += w * v;
    }
    out.push({ secteurId, score: Math.round(score * 100) / 100 });
  }
  out.sort((a, b) => b.score - a.score);
  return out;
}

/**
 * Confiance 0..1 : gap entre 1er et 2e score. Si faible => undetermined.
 */
export function sectorConfidence(top3: SectorScore[]): number {
  const s1 = top3[0]?.score ?? 0;
  const s2 = top3[1]?.score ?? 0;
  if (s1 <= 0) return 0;
  const gap = s1 - s2;
  const ratio = gap / Math.max(s1, 0.01);
  // Plus le ratio est élevé, plus la confiance est haute. Plage typique 0.2..1.
  const confidence = Math.min(1, Math.max(0, 0.2 + ratio * 0.8));
  return Math.round(confidence * 100) / 100;
}
