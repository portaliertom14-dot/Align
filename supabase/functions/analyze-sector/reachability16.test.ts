/**
 * Reachability 16 secteurs — preuve que chaque secteur peut sortir top1
 * avec la pipeline PROD (scoring réel, pas de hard rule).
 * Critère : au moins 1 base sur 3 (NEUTRE / HOSTILE / RANDOM_STABLE).
 * Objectif produit : >= 2 bases / 3 ; à affiner via profils et bonus si besoin.
 * Pipeline : computeDomainScores + computeMicroDomainScores, formule base*1 + domain*2 + micro*4.
 *
 * Run: cd supabase/functions && deno test analyze-sector/reachability16.test.ts --allow-read
 */

import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import { computeDomainScores, computeMicroDomainScores } from '../_shared/domainTags.ts';
import { SECTOR_IDS } from '../_shared/sectors.ts';

const SECTOR_IDS_LIST = SECTOR_IDS as unknown as string[];

// --- Bases IA mock ---

const DEFAULT_BASE = 0.2;

/** 1) BASE_NEUTRE : tous les 16 secteurs à 0.2 */
const BASE_NEUTRE: Record<string, number> = {};
SECTOR_IDS_LIST.forEach((id) => { BASE_NEUTRE[id] = 0.2; });

/** 2) BASE_HOSTILE : business/santé/education dominent */
const BASE_HOSTILE: Record<string, number> = { ...BASE_NEUTRE };
BASE_HOSTILE['business_entrepreneuriat'] = 1.0;
BASE_HOSTILE['sante_bien_etre'] = 0.9;
BASE_HOSTILE['education_formation'] = 0.8;

/** Mulberry32 PRNG (seed fixe pour reproductibilité) */
function mulberry32(seed: number): () => number {
  return function next() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 3) BASE_RANDOM_STABLE : 0.2 + random()*0.4, seed 1337 */
function buildBaseRandomStable(): Record<string, number> {
  const rng = mulberry32(1337);
  const out: Record<string, number> = {};
  SECTOR_IDS_LIST.forEach((id) => {
    out[id] = 0.2 + rng() * 0.4;
  });
  return out;
}
const BASE_RANDOM_STABLE = buildBaseRandomStable();

const BASES = [BASE_NEUTRE, BASE_HOSTILE, BASE_RANDOM_STABLE] as const;
const BASE_NAMES = ['NEUTRE', 'HOSTILE', 'RANDOM_STABLE'] as const;

// --- Pipeline PROD : finalScore = base*1 + domain*2 + micro*4, tri décroissant, top1 = ranked[0].id ---

function getTop1(
  rawAnswers: Record<string, unknown>,
  baseScores: Record<string, number>
): string {
  const domainScores = computeDomainScores(rawAnswers) as unknown as Record<string, number>;
  const microScores = computeMicroDomainScores(rawAnswers) as unknown as Record<string, number>;

  const finalScores: Record<string, number> = {};
  for (const id of SECTOR_IDS_LIST) {
    const base = baseScores[id] ?? DEFAULT_BASE;
    const domain = domainScores[id] ?? 0;
    const micro = microScores[id] ?? 0;
    finalScores[id] = base * 1 + domain * 2 + micro * 4;
  }

  const ranked = SECTOR_IDS_LIST
    .map((id) => ({ id, score: finalScores[id] ?? 0 }))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  return ranked[0]?.id ?? '';
}

/** Réponses neutres par défaut (Q41–Q50 = B) + optionnel Q1–Q40 */
function defaultRawAnswers(overrides: Record<string, string>): Record<string, unknown> {
  const raw: Record<string, unknown> = {};
  for (let i = 1; i <= 40; i++) raw[`secteur_${i}`] = { value: 'B' };
  for (let i = 41; i <= 50; i++) raw[`secteur_${i}`] = { value: 'B' };
  for (const [k, v] of Object.entries(overrides)) raw[k] = { value: v };
  return raw;
}

/** Profils forts communication_media / creation_design (alignés avec reachability_comm_creation). */
const PROFIL_COMM_MEDIA = defaultRawAnswers({
  secteur_41: 'C', secteur_42: 'A', secteur_43: 'C', secteur_44: 'A', secteur_45: 'A', secteur_46: 'B',
  secteur_47: 'C', secteur_48: 'A', secteur_49: 'B', secteur_50: 'B',
});
const PROFIL_CREATION_DESIGN = defaultRawAnswers({
  secteur_41: 'A', secteur_42: 'C', secteur_43: 'A', secteur_44: 'C', secteur_45: 'C', secteur_46: 'A',
  secteur_47: 'B', secteur_48: 'A', secteur_49: 'B', secteur_50: 'C',
});

// --- Profils cohérents par secteur (Q41–Q50 + 2–5 Q1–Q40 clés) ---

const PROFILE_BY_SECTOR: Record<string, Record<string, unknown>> = {
  data_ia: defaultRawAnswers({
    secteur_41: 'B', secteur_43: 'B', secteur_44: 'B',
    secteur_48: 'C', secteur_49: 'C', secteur_50: 'C',
    secteur_3: 'A', secteur_11: 'A',
  }),
  ingenierie_tech: defaultRawAnswers({
    secteur_41: 'B', secteur_42: 'B', secteur_43: 'B', secteur_45: 'A',
    secteur_48: 'C', secteur_49: 'A', secteur_50: 'C',
    secteur_4: 'C', secteur_6: 'B',
  }),
  social_humain: defaultRawAnswers({
    secteur_41: 'C', secteur_42: 'C', secteur_43: 'A', secteur_44: 'C', secteur_45: 'C', secteur_46: 'C',
    secteur_47: 'C', secteur_48: 'A', secteur_49: 'B', secteur_50: 'A',
    secteur_18: 'C',
  }),
  education_formation: defaultRawAnswers({
    secteur_41: 'C', secteur_42: 'C', secteur_43: 'A', secteur_44: 'C', secteur_45: 'C', secteur_46: 'C',
    secteur_47: 'B', secteur_48: 'A', secteur_49: 'B', secteur_50: 'A',
    secteur_7: 'C', secteur_14: 'C',
  }),
  sante_bien_etre: defaultRawAnswers({
    secteur_41: 'A', secteur_42: 'A', secteur_43: 'A',
    secteur_44: 'C', secteur_45: 'C', secteur_46: 'C', secteur_47: 'C', secteur_48: 'A', secteur_49: 'B', secteur_50: 'A',
    secteur_18: 'C', secteur_19: 'B',
  }),
  sport_evenementiel: defaultRawAnswers({
    secteur_41: 'A', secteur_42: 'B', secteur_43: 'C', secteur_44: 'A', secteur_45: 'B', secteur_46: 'B',
    secteur_47: 'A', secteur_48: 'A', secteur_49: 'B', secteur_50: 'B',
    secteur_6: 'C', secteur_9: 'C',
  }),
  business_entrepreneuriat: defaultRawAnswers({
    secteur_43: 'C', secteur_44: 'B', secteur_45: 'B', secteur_46: 'B', secteur_47: 'B', secteur_48: 'B',
    secteur_50: 'A',
    secteur_12: 'B', secteur_17: 'B',
  }),
  creation_design: PROFIL_CREATION_DESIGN,
  culture_patrimoine: defaultRawAnswers({
    secteur_41: 'A', secteur_42: 'A', secteur_43: 'A', secteur_44: 'A', secteur_45: 'A', secteur_46: 'A',
    secteur_47: 'B', secteur_48: 'A', secteur_49: 'B', secteur_50: 'A',
    secteur_1: 'B', secteur_10: 'B',
  }),
  communication_media: PROFIL_COMM_MEDIA,
  finance_assurance: defaultRawAnswers({
    secteur_41: 'B', secteur_42: 'B', secteur_43: 'A', secteur_44: 'A', secteur_45: 'A', secteur_46: 'A',
    secteur_47: 'B', secteur_48: 'B', secteur_49: 'B', secteur_50: 'A',
    secteur_6: 'A', secteur_13: 'A',
  }),
  droit_justice_securite: defaultRawAnswers({
    secteur_41: 'A', secteur_42: 'A', secteur_43: 'B', secteur_44: 'B', secteur_45: 'B', secteur_46: 'B',
    secteur_47: 'A', secteur_48: 'B', secteur_49: 'A', secteur_50: 'A',
    secteur_9: 'A', secteur_19: 'A',
  }),
  defense_securite_civile: defaultRawAnswers({
    secteur_41: 'A', secteur_42: 'A', secteur_43: 'A', secteur_44: 'B', secteur_45: 'B', secteur_46: 'B',
    secteur_47: 'A', secteur_48: 'B', secteur_49: 'A', secteur_50: 'A',
    secteur_6: 'C', secteur_9: 'C',
  }),
  sciences_recherche: defaultRawAnswers({
    secteur_41: 'A', secteur_42: 'A', secteur_43: 'A', secteur_44: 'A', secteur_45: 'A', secteur_46: 'A',
    secteur_47: 'B', secteur_48: 'A', secteur_49: 'C', secteur_50: 'A',
    secteur_1: 'A', secteur_10: 'A',
  }),
  industrie_artisanat: defaultRawAnswers({
    secteur_41: 'A', secteur_42: 'A', secteur_43: 'A', secteur_44: 'A', secteur_45: 'B', secteur_46: 'B',
    secteur_47: 'B', secteur_48: 'A', secteur_49: 'B', secteur_50: 'A',
    secteur_1: 'A', secteur_4: 'A',
  }),
  environnement_agri: defaultRawAnswers({
    secteur_41: 'A', secteur_42: 'A', secteur_43: 'A', secteur_44: 'A', secteur_45: 'A', secteur_46: 'A',
    secteur_47: 'A', secteur_48: 'A', secteur_49: 'B', secteur_50: 'B',
    secteur_3: 'A', secteur_26: 'B',
  }),
};

// --- Test principal ---

Deno.test('reachability16: chaque secteur gagne sur au moins 1 base sur 3', () => {
  const results: { sectorId: string; wins: number; which: string[] }[] = [];
  const failures: string[] = [];

  for (const sectorId of SECTOR_IDS_LIST) {
    const rawAnswers = PROFILE_BY_SECTOR[sectorId];
    if (!rawAnswers) {
      failures.push(`${sectorId} (no profile)`);
      continue;
    }

    let wins = 0;
    const which: string[] = [];
    for (let i = 0; i < BASES.length; i++) {
      const top1 = getTop1(rawAnswers, BASES[i]);
      if (top1 === sectorId) {
        wins++;
        which.push(BASE_NAMES[i]);
      }
    }

    results.push({ sectorId, wins, which });
    if (wins < 1) {
      failures.push(`${sectorId} not reachable (wins: ${wins}/3) [${which.join(', ') || 'none'}]`);
    }
  }

  assertEquals(
    failures.length,
    0,
    `Sectors not reachable (must win on >=1/3 bases):\n${failures.join('\n')}`
  );
});

Deno.test('reachability16: les 16 secteurs ont un profil défini', () => {
  for (const sectorId of SECTOR_IDS_LIST) {
    assertEquals(PROFILE_BY_SECTOR[sectorId] != null, true, `PROFILE_BY_SECTOR[${sectorId}]`);
  }
});

/** Chaque secteur doit sortir top1 sur BASE_NEUTRE avec son profil (preuve de reachability). */
Deno.test('reachability16: chaque secteur gagne sur BASE_NEUTRE', () => {
  const failures: string[] = [];
  for (const sectorId of SECTOR_IDS_LIST) {
    const rawAnswers = PROFILE_BY_SECTOR[sectorId];
    if (!rawAnswers) {
      failures.push(`${sectorId} (no profile)`);
      continue;
    }
    const top1 = getTop1(rawAnswers, BASE_NEUTRE);
    if (top1 !== sectorId) {
      failures.push(`${sectorId} not top1 on NEUTRE (got ${top1})`);
    }
  }
  assertEquals(failures.length, 0, `On BASE_NEUTRE:\n${failures.join('\n')}`);
});
