/**
 * Test distribution/diversité du moteur métier : top1 ne revient pas trop souvent, top3 varie.
 * Profils simulés "réalistes" (computeJobProfile), RNG seedé, pas de réponse manuelle dans l'app.
 */

import { computeJobProfile } from './computeJobProfile';
import { rankJobsForSector, FALLBACK_SCORE, stableHash, mulberry32 } from './matchJobs';
import type { JobVector } from './jobAxes';
import type { SectorId } from '../data/jobsBySector';

const SEED_BASE = 'JOB_DISTRIBUTION_V1';
const N_PROFILES = 60;
const TOP_N = 3;
const MIN_DISTINCT_TOP1 = 8;
const MIN_UNION_TOP3 = 18;
const MAX_TOP1_SHARE = 0.25; // le top1 le plus fréquent ne dépasse pas 25%

const QUESTION_IDS = Array.from({ length: 30 }, (_, i) => `metier_${i + 1}`);

/** Secteurs utilisés pour le test (au moins 6, on en prend 8). */
const DISTRIBUTION_TEST_SECTORS: SectorId[] = [
  'business_entrepreneuriat',
  'finance_assurance',
  'data_ia',
  'ingenierie_tech',
  'communication_media',
  'industrie_artisanat',
  'sante_bien_etre',
  'creation_design',
];

type Choice = 'A' | 'B' | 'C';
type PatternId = 1 | 2 | 3 | 4 | 5;

/**
 * Shuffle Fisher-Yates déterministe avec PRNG seedé.
 */
function seededShuffle<T>(arr: T[], rng: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (rng() >>> 0) % (i + 1);
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
}

/**
 * Génère 30 réponses A/B/C selon un pattern "humain" avec légère randomisation.
 * Retourne un objet { metier_1: 'A'|'B'|'C', ... } compatible avec computeJobProfile.
 */
function generateHumanAnswers(seed: string, pattern: PatternId): Record<string, Choice> {
  const h = stableHash(seed);
  const rng = mulberry32(h);

  const u = () => (rng() >>> 0) / 0x100000000;
  const randInt = (min: number, max: number) => min + Math.floor(u() * (max - min + 1));

  let nA: number;
  let nB: number;
  let nC: number;
  switch (pattern) {
    case 1:
      nA = 18 + randInt(-1, 1);
      nB = 7 + randInt(-1, 1);
      nC = 30 - nA - nB;
      break;
    case 2:
      nB = 15 + randInt(-1, 1);
      nA = 7 + randInt(-1, 1);
      nC = 30 - nA - nB;
      break;
    case 3:
      nC = 16 + randInt(-1, 1);
      nB = 9 + randInt(-1, 1);
      nA = 30 - nB - nC;
      break;
    case 4:
      nA = 10 + randInt(-1, 1);
      nB = 10 + randInt(-1, 1);
      nC = 30 - nA - nB;
      break;
    case 5:
      nA = 14 + randInt(-1, 1);
      nC = 14 + randInt(-1, 1);
      nB = 30 - nA - nC;
      break;
    default:
      nA = 10;
      nB = 10;
      nC = 10;
  }
  nA = Math.max(0, Math.min(30, nA));
  nC = Math.max(0, Math.min(30, nC));
  nB = Math.max(0, Math.min(30, 30 - nA - nC));

  const arr: Choice[] = [
    ...Array<Choice>(nA).fill('A'),
    ...Array<Choice>(nB).fill('B'),
    ...Array<Choice>(nC).fill('C'),
  ].slice(0, 30);
  while (arr.length < 30) arr.push('B');

  seededShuffle(arr, rng);

  const out: Record<string, Choice> = {};
  QUESTION_IDS.forEach((id, i) => {
    out[id] = arr[i] ?? 'B';
  });
  return out;
}

/**
 * Génère N profils (rawAnswers + userVector) variés et déterministes.
 */
function generateProfiles(n: number): { rawAnswers: Record<string, Choice>; userVector: JobVector }[] {
  const profiles: { rawAnswers: Record<string, Choice>; userVector: JobVector }[] = [];
  for (let i = 0; i < n; i++) {
    const pattern = ((i % 5) + 1) as PatternId;
    const seed = `${SEED_BASE}_${i}`;
    const rawAnswers = generateHumanAnswers(seed, pattern);
    const userVector = computeJobProfile(rawAnswers as Record<string, unknown>);
    profiles.push({ rawAnswers, userVector });
  }
  return profiles;
}

describe('jobDistribution', () => {
  const profiles = generateProfiles(N_PROFILES);

  for (const sectorId of DISTRIBUTION_TEST_SECTORS) {
    describe(`sector ${sectorId}`, () => {
      const top1Count: Record<string, number> = {};
      const allTop3Titles = new Set<string>();
      const top1ToExampleProfiles: Record<string, { rawAnswers: Record<string, Choice> }[]> = {};
      let hasFallbackScore = false;

      beforeAll(() => {
        for (const { rawAnswers, userVector } of profiles) {
          const result = rankJobsForSector(sectorId, userVector, TOP_N, 'default');
          if (result.some((r) => r.score === FALLBACK_SCORE)) hasFallbackScore = true;
          const top1 = result[0]?.job;
          const titles = result.map((r) => r.job);
          titles.forEach((t) => allTop3Titles.add(t));
          if (top1) {
            top1Count[top1] = (top1Count[top1] ?? 0) + 1;
            if (!top1ToExampleProfiles[top1]) top1ToExampleProfiles[top1] = [];
            if (top1ToExampleProfiles[top1].length < 3) {
              top1ToExampleProfiles[top1].push({ rawAnswers });
            }
          }
        }
      });

      it('aucun score fallback 0.5 dans le top3', () => {
        if (hasFallbackScore) {
          console.error(`[JOB_DISTRIBUTION] ${sectorId}: au moins un score === ${FALLBACK_SCORE} (fallback)`);
        }
        expect(hasFallbackScore).toBe(false);
      });

      it('au moins 8 top1 distincts', () => {
        const distinctTop1 = Object.keys(top1Count).length;
        if (distinctTop1 < MIN_DISTINCT_TOP1) {
          const sorted = Object.entries(top1Count).sort((a, b) => b[1] - a[1]);
          console.error(`[JOB_DISTRIBUTION] ${sectorId}: top1 distincts=${distinctTop1} (min ${MIN_DISTINCT_TOP1})`);
          console.error('[JOB_DISTRIBUTION] top1 frequency (top 5):', sorted.slice(0, 5));
          const dominant = sorted[0]?.[0];
          if (dominant && top1ToExampleProfiles[dominant]) {
            console.error('[JOB_DISTRIBUTION] exemples de profils pour top1 dominant:', JSON.stringify(top1ToExampleProfiles[dominant].slice(0, 2), null, 0));
          }
        }
        expect(distinctTop1).toBeGreaterThanOrEqual(MIN_DISTINCT_TOP1);
      });

      it('union(top3) >= 18 métiers distincts', () => {
        const unionSize = allTop3Titles.size;
        if (unionSize < MIN_UNION_TOP3) {
          console.error(`[JOB_DISTRIBUTION] ${sectorId}: union(top3)=${unionSize} (min ${MIN_UNION_TOP3})`);
        }
        expect(unionSize).toBeGreaterThanOrEqual(MIN_UNION_TOP3);
      });

      it('le top1 le plus fréquent ne dépasse pas 25% des runs', () => {
        const maxCount = Math.max(0, ...Object.values(top1Count));
        const maxAllowed = Math.ceil(N_PROFILES * MAX_TOP1_SHARE);
        if (maxCount > maxAllowed) {
          const sorted = Object.entries(top1Count).sort((a, b) => b[1] - a[1]);
          console.error(`[JOB_DISTRIBUTION] ${sectorId}: top1 max count=${maxCount} (max autorisé ${maxAllowed})`);
          console.error('[JOB_DISTRIBUTION] top1 frequency (top 5):', sorted.slice(0, 5));
          const dominant = sorted[0]?.[0];
          if (dominant && top1ToExampleProfiles[dominant]) {
            console.error('[JOB_DISTRIBUTION] exemples de profils pour top1 dominant:', JSON.stringify(top1ToExampleProfiles[dominant].slice(0, 2), null, 0));
          }
        }
        expect(maxCount).toBeLessThanOrEqual(maxAllowed);
      });
    });
  }

  it('generateHumanAnswers produit des réponses variées (déterministe)', () => {
    const a1 = generateHumanAnswers(`${SEED_BASE}_0`, 1);
    const a2 = generateHumanAnswers(`${SEED_BASE}_1`, 2);
    const a1bis = generateHumanAnswers(`${SEED_BASE}_0`, 1);
    const counts = (r: Record<string, Choice>) => ({
      A: Object.values(r).filter((c) => c === 'A').length,
      B: Object.values(r).filter((c) => c === 'B').length,
      C: Object.values(r).filter((c) => c === 'C').length,
    });
    expect(counts(a1)).toEqual(counts(a1bis));
    expect(counts(a1).A).toBeGreaterThan(counts(a1).B);
    expect(counts(a1).A).toBeGreaterThan(counts(a1).C);
    expect(counts(a2).B).toBeGreaterThanOrEqual(counts(a2).A);
    expect(Object.keys(a1).length).toBe(30);
  });
});
