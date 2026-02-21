/**
 * Reachability communication_media et creation_design — preuve qu'ils sortent top1/top2
 * avec la pipeline PROD (base*1 + domain*2 + micro*4), sans hard rule.
 * Run: cd supabase/functions && deno test analyze-sector/reachability_comm_creation.test.ts --allow-read
 */

import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import { computeDomainScores, computeMicroDomainScores } from '../_shared/domainTags.ts';
import { SECTOR_IDS } from '../_shared/sectors.ts';

const SECTOR_IDS_LIST = SECTOR_IDS as unknown as string[];
const DEFAULT_BASE = 0.2;

/** BASE_NEUTRE : 0.2 partout */
const BASE_NEUTRE: Record<string, number> = {};
SECTOR_IDS_LIST.forEach((id) => { BASE_NEUTRE[id] = 0.2; });

/** BASE_HOSTILE : business 1.0, sante 0.9, education 0.8, reste 0.2 */
const BASE_HOSTILE: Record<string, number> = { ...BASE_NEUTRE };
BASE_HOSTILE['business_entrepreneuriat'] = 1.0;
BASE_HOSTILE['sante_bien_etre'] = 0.9;
BASE_HOSTILE['education_formation'] = 0.8;

function mulberry32(seed: number): () => number {
  return function next() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** BASE_RANDOM_STABLE : 0.2 + rand*0.4, seed 1337 */
function buildBaseRandomStable(): Record<string, number> {
  const rng = mulberry32(1337);
  const out: Record<string, number> = {};
  SECTOR_IDS_LIST.forEach((id) => {
    out[id] = 0.2 + rng() * 0.4;
  });
  return out;
}
const BASE_RANDOM_STABLE = buildBaseRandomStable();

/** Pipeline PROD : finalScore = base*1 + domain*2 + micro*4, tri décroissant, tie-break par sectorId */
function rankSectors(
  rawAnswers: Record<string, unknown>,
  baseScores: Record<string, number>
): { id: string; score: number; base: number; domain: number; micro: number }[] {
  const domainScores = computeDomainScores(rawAnswers) as unknown as Record<string, number>;
  const microScores = computeMicroDomainScores(rawAnswers) as unknown as Record<string, number>;
  const out: { id: string; score: number; base: number; domain: number; micro: number }[] = [];
  for (const id of SECTOR_IDS_LIST) {
    const base = baseScores[id] ?? DEFAULT_BASE;
    const domain = domainScores[id] ?? 0;
    const micro = microScores[id] ?? 0;
    const score = base * 1 + domain * 2 + micro * 4;
    out.push({ id, score, base, domain, micro });
  }
  out.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  return out;
}

function getTop1(rawAnswers: Record<string, unknown>, baseScores: Record<string, number>): string {
  const ranked = rankSectors(rawAnswers, baseScores);
  return ranked[0]?.id ?? '';
}

function getTop3(rawAnswers: Record<string, unknown>, baseScores: Record<string, number>) {
  const ranked = rankSectors(rawAnswers, baseScores);
  return ranked.slice(0, 3);
}

/** Réponses Q1–Q40 = B, Q41–Q50 = overrides */
function defaultRawAnswers(overrides: Record<string, string>): Record<string, unknown> {
  const raw: Record<string, unknown> = {};
  for (let i = 1; i <= 40; i++) raw[`secteur_${i}`] = { value: 'B' };
  for (let i = 41; i <= 50; i++) raw[`secteur_${i}`] = { value: 'B' };
  for (const [k, v] of Object.entries(overrides)) raw[k] = { value: v };
  return raw;
}

/** Profil fort Communication & Médias : contenu + audience + expression + diffusion */
const PROFIL_COMM_MEDIA = defaultRawAnswers({
  secteur_41: 'C', secteur_42: 'A', secteur_43: 'C', secteur_44: 'A', secteur_45: 'A', secteur_46: 'B',
  secteur_47: 'C', secteur_48: 'A', secteur_49: 'B', secteur_50: 'B',
});

/** Profil fort Création & Design : visuel + création + esthétique + conception */
const PROFIL_CREATION_DESIGN = defaultRawAnswers({
  secteur_41: 'A', secteur_42: 'C', secteur_43: 'A', secteur_44: 'C', secteur_45: 'C', secteur_46: 'A',
  secteur_47: 'B', secteur_48: 'A', secteur_49: 'B', secteur_50: 'C',
});

// --- Tests ---

Deno.test('reachability_comm_creation: communication_media top1 sur BASE_NEUTRE', () => {
  const top1 = getTop1(PROFIL_COMM_MEDIA, BASE_NEUTRE);
  if (top1 !== 'communication_media') {
    const top3 = getTop3(PROFIL_COMM_MEDIA, BASE_NEUTRE);
    console.log('TOP3 (comm, NEUTRE):', top3.map((t) => ({ id: t.id, score: t.score, domain: t.domain, micro: t.micro })));
  }
  assertEquals(top1, 'communication_media', `Expected communication_media, got ${top1}`);
});

Deno.test('reachability_comm_creation: communication_media top1 sur BASE_RANDOM_STABLE', () => {
  const top1 = getTop1(PROFIL_COMM_MEDIA, BASE_RANDOM_STABLE);
  if (top1 !== 'communication_media') {
    const top3 = getTop3(PROFIL_COMM_MEDIA, BASE_RANDOM_STABLE);
    console.log('TOP3 (comm, RANDOM):', top3.map((t) => ({ id: t.id, score: t.score, domain: t.domain, micro: t.micro })));
  }
  assertEquals(top1, 'communication_media', `Expected communication_media, got ${top1}`);
});

Deno.test('reachability_comm_creation: communication_media top1 ou top2 sur BASE_HOSTILE', () => {
  const ranked = rankSectors(PROFIL_COMM_MEDIA, BASE_HOSTILE);
  const top1 = ranked[0]?.id ?? '';
  const top2 = ranked[1]?.id ?? '';
  const ok = top1 === 'communication_media' || top2 === 'communication_media';
  if (!ok) {
    console.log('TOP3 (comm, HOSTILE):', ranked.slice(0, 3).map((t) => ({ id: t.id, score: t.score, base: t.base, domain: t.domain, micro: t.micro })));
  }
  assertEquals(ok, true, `communication_media must be top1 or top2 on HOSTILE, got top1=${top1} top2=${top2}`);
});

Deno.test('reachability_comm_creation: creation_design top1 sur BASE_NEUTRE', () => {
  const top1 = getTop1(PROFIL_CREATION_DESIGN, BASE_NEUTRE);
  if (top1 !== 'creation_design') {
    const top3 = getTop3(PROFIL_CREATION_DESIGN, BASE_NEUTRE);
    console.log('TOP3 (creation, NEUTRE):', top3.map((t) => ({ id: t.id, score: t.score, domain: t.domain, micro: t.micro })));
  }
  assertEquals(top1, 'creation_design', `Expected creation_design, got ${top1}`);
});

Deno.test('reachability_comm_creation: creation_design top1 sur BASE_RANDOM_STABLE', () => {
  const top1 = getTop1(PROFIL_CREATION_DESIGN, BASE_RANDOM_STABLE);
  if (top1 !== 'creation_design') {
    const top3 = getTop3(PROFIL_CREATION_DESIGN, BASE_RANDOM_STABLE);
    console.log('TOP3 (creation, RANDOM):', top3.map((t) => ({ id: t.id, score: t.score, domain: t.domain, micro: t.micro })));
  }
  assertEquals(top1, 'creation_design', `Expected creation_design, got ${top1}`);
});

Deno.test('reachability_comm_creation: creation_design top1 ou top2 sur BASE_HOSTILE', () => {
  const ranked = rankSectors(PROFIL_CREATION_DESIGN, BASE_HOSTILE);
  const top1 = ranked[0]?.id ?? '';
  const top2 = ranked[1]?.id ?? '';
  const ok = top1 === 'creation_design' || top2 === 'creation_design';
  if (!ok) {
    console.log('TOP3 (creation, HOSTILE):', ranked.slice(0, 3).map((t) => ({ id: t.id, score: t.score, base: t.base, domain: t.domain, micro: t.micro })));
  }
  assertEquals(ok, true, `creation_design must be top1 or top2 on HOSTILE, got top1=${top1} top2=${top2}`);
});
