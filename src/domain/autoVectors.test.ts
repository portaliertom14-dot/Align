/**
 * Tests vectorisation automatique (archétypes + génération déterministe).
 * A) Déterminisme | B) Non-régression secteurs manuels | C) Diversité secteur généré | D) Pas de fallback.
 */

import type { JobVector } from './jobAxes';
import { ZERO_JOB_VECTOR } from './jobAxes';
import { computeJobProfile } from './computeJobProfile';
import { rankJobsForSector, FALLBACK_SCORE } from './matchJobs';
import { JOBS_BY_SECTOR } from '../data/jobsBySector';
import { getVectorsForSectorAndVariant } from '../data/jobVectorsBySector';

const QUESTION_IDS = Array.from({ length: 30 }, (_, i) => `metier_${i + 1}`);

function makeAnswers(choices: Partial<Record<string, 'A' | 'B' | 'C'>>): Record<string, { value: string }> {
  const out: Record<string, { value: string }> = {};
  for (const id of QUESTION_IDS) {
    out[id] = { value: (choices[id] ?? 'B') as string };
  }
  return out;
}

function getTwelveProfiles(): Record<string, { value: string }>[] {
  const allA = makeAnswers(Object.fromEntries(QUESTION_IDS.map((id) => [id, 'A'])) as Record<string, 'A' | 'B' | 'C'>);
  const allB = makeAnswers(Object.fromEntries(QUESTION_IDS.map((id) => [id, 'B'])) as Record<string, 'A' | 'B' | 'C'>);
  const allC = makeAnswers(Object.fromEntries(QUESTION_IDS.map((id) => [id, 'C'])) as Record<string, 'A' | 'B' | 'C'>);
  const mixes: Record<string, { value: string }>[] = [
    makeAnswers({ ...(Object.fromEntries(QUESTION_IDS.map((id) => [id, 'A'])) as Record<string, 'A' | 'B' | 'C'>), metier_10: 'C', metier_20: 'C' }),
    makeAnswers({ ...(Object.fromEntries(QUESTION_IDS.map((id) => [id, 'C'])) as Record<string, 'A' | 'B' | 'C'>), metier_1: 'A', metier_2: 'A', metier_15: 'A' }),
    makeAnswers({ ...(Object.fromEntries(QUESTION_IDS.map((id) => [id, 'B'])) as Record<string, 'A' | 'B' | 'C'>), metier_5: 'A', metier_12: 'C', metier_24: 'C' }),
    makeAnswers(Object.fromEntries(QUESTION_IDS.map((id, i) => [id, (i % 3 === 0 ? 'A' : i % 3 === 1 ? 'B' : 'C')])) as Record<string, 'A' | 'B' | 'C'>),
    makeAnswers(Object.fromEntries(QUESTION_IDS.map((id, i) => [id, (i % 2 === 0 ? 'A' : 'C')])) as Record<string, 'A' | 'B' | 'C'>),
    makeAnswers(Object.fromEntries(QUESTION_IDS.map((id, i) => [id, (i < 10 ? 'A' : i < 20 ? 'B' : 'C')])) as Record<string, 'A' | 'B' | 'C'>),
    makeAnswers(Object.fromEntries(QUESTION_IDS.map((id, i) => [id, (i < 15 ? 'C' : 'A')])) as Record<string, 'A' | 'B' | 'C'>),
    makeAnswers(Object.fromEntries(QUESTION_IDS.map((id, i) => [id, (i % 4 === 0 ? 'A' : i % 4 === 1 ? 'B' : 'C')])) as Record<string, 'A' | 'B' | 'C'>),
    makeAnswers(Object.fromEntries(QUESTION_IDS.map((id, i) => [id, (i < 5 ? 'B' : i < 20 ? 'A' : 'C')])) as Record<string, 'A' | 'B' | 'C'>),
  ];
  return [allA, allB, allC, ...mixes];
}

function vec(overrides: Partial<JobVector>): JobVector {
  return { ...ZERO_JOB_VECTOR, ...overrides };
}

describe('autoVectors', () => {
  describe('A) Déterminisme', () => {
    it('deux appels getVectorsForSectorAndVariant(communication_media) renvoient le même contenu', () => {
      const a = getVectorsForSectorAndVariant('communication_media', 'default');
      const b = getVectorsForSectorAndVariant('communication_media', 'default');
      expect(a).not.toBeNull();
      expect(b).not.toBeNull();
      expect(Object.keys(a!).sort()).toEqual(Object.keys(b!).sort());
      for (const job of Object.keys(a!)) {
        expect(a![job]).toEqual(b![job]);
      }
    });

    it('deux jobs distincts ont des vecteurs différents', () => {
      const vectors = getVectorsForSectorAndVariant('communication_media', 'default');
      expect(vectors).not.toBeNull();
      const jobs = Object.keys(vectors!);
      expect(jobs.length).toBeGreaterThanOrEqual(2);
      const v1 = vectors![jobs[0]!]!;
      const v2 = vectors![jobs[1]!]!;
      const same = Object.keys(v1).every((axis) => v1[axis as keyof JobVector] === v2[axis as keyof JobVector]);
      expect(same).toBe(false);
    });
  });

  describe('B) Non-régression secteurs manuels', () => {
    it('business_entrepreneuriat retourne 30 vecteurs avec des clés manuelles connues', () => {
      const v = getVectorsForSectorAndVariant('business_entrepreneuriat', 'default');
      expect(v).not.toBeNull();
      expect(Object.keys(v!).length).toBe(30);
      expect('Entrepreneur' in v!).toBe(true);
      expect('CEO / Dirigeant d\'entreprise' in v!).toBe(true);
    });

    it('finance_assurance retourne 30 vecteurs (manuel)', () => {
      const v = getVectorsForSectorAndVariant('finance_assurance', 'default');
      expect(v).not.toBeNull();
      expect(Object.keys(v!).length).toBe(30);
      expect('Analyste financier' in v!).toBe(true);
    });

    it('data_ia retourne 30 vecteurs (manuel)', () => {
      const v = getVectorsForSectorAndVariant('data_ia', 'default');
      expect(v).not.toBeNull();
      expect(Object.keys(v!).length).toBe(30);
      expect('Data scientist' in v!).toBe(true);
    });

    it('ingenierie_tech retourne 30 vecteurs (manuel)', () => {
      const v = getVectorsForSectorAndVariant('ingenierie_tech', 'default');
      expect(v).not.toBeNull();
      expect(Object.keys(v!).length).toBe(30);
      expect('Ingénieur logiciel' in v!).toBe(true);
    });

    it('droit_justice_securite default et defense_track retournent des vecteurs (manuel)', () => {
      const def = getVectorsForSectorAndVariant('droit_justice_securite', 'default');
      const defTrack = getVectorsForSectorAndVariant('droit_justice_securite', 'defense_track');
      expect(def).not.toBeNull();
      expect(defTrack).not.toBeNull();
      expect(Object.keys(def!).length).toBe(30);
      expect(Object.keys(defTrack!).length).toBe(30);
      expect('Avocat' in def!).toBe(true);
      expect('Militaire' in defTrack!).toBe(true);
    });
  });

  describe('C) Diversité secteur généré (communication_media)', () => {
    const sectorId = 'communication_media';
    const whitelist = new Set(JOBS_BY_SECTOR[sectorId] ?? []);

    it('12 profils : au moins 4 top1 distincts', () => {
      const profiles = getTwelveProfiles();
      const top1Titles = new Set<string>();
      for (const answers of profiles) {
        const userVector = computeJobProfile(answers);
        const ranked = rankJobsForSector(sectorId, userVector, 5, 'default');
        expect(ranked.length).toBeGreaterThan(0);
        const top1 = ranked[0]!.job;
        expect(whitelist.has(top1)).toBe(true);
        top1Titles.add(top1);
      }
      expect(top1Titles.size).toBeGreaterThanOrEqual(4);
    });

    it('12 profils : union(top3) >= 8 métiers distincts', () => {
      const profiles = getTwelveProfiles();
      const unionTop3 = new Set<string>();
      for (const answers of profiles) {
        const userVector = computeJobProfile(answers);
        const ranked = rankJobsForSector(sectorId, userVector, 5, 'default');
        ranked.slice(0, 3).forEach((r) => unionTop3.add(r.job));
      }
      expect(unionTop3.size).toBeGreaterThanOrEqual(8);
    });
  });

  describe('D) Pas de fallback une fois généré', () => {
    it('rankJobsForSector(communication_media) utilise cosine (au moins un score !== 0.5)', () => {
      const user = vec({ CREATIVITE: 8, CONTACT_HUMAIN: 6, STRUCTURE: 5 });
      const result = rankJobsForSector('communication_media', user, 5, 'default');
      expect(result).toHaveLength(5);
      const hasCosineScore = result.some((r) => r.score !== FALLBACK_SCORE);
      expect(hasCosineScore).toBe(true);
      const whitelist = new Set(JOBS_BY_SECTOR['communication_media']);
      result.forEach((r) => expect(whitelist.has(r.job)).toBe(true));
    });
  });
});
