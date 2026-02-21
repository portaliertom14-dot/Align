/**
 * Tests diversité : des réponses différentes au quiz métier doivent changer le classement des métiers.
 * 12 profils "extrêmes" (tout A / tout B / tout C + 9 mixes) pour business_entrepreneuriat et finance_assurance.
 * Assertions : au moins 4 top1 distincts, union(top3) >= 8 métiers, réactivité à une question forte.
 */

import { computeJobProfile } from './computeJobProfile';
import { rankJobsForSector, cosineSimilarity } from './matchJobs';
import { JOBS_BY_SECTOR } from '../data/jobsBySector';
import { getVectorsForSectorAndVariant } from '../data/jobVectorsBySector';
import { assertCountPerAxisBalanced } from './jobQuestionMapping';

const QUESTION_IDS = Array.from({ length: 30 }, (_, i) => `metier_${i + 1}`);

function makeAnswers(choices: Partial<Record<string, 'A' | 'B' | 'C'>>): Record<string, { value: string }> {
  const out: Record<string, { value: string }> = {};
  for (const id of QUESTION_IDS) {
    out[id] = { value: (choices[id] ?? 'B') as string };
  }
  return out;
}

/** 12 profils : all A, all B, all C + 9 mixes pour varier les axes. */
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

describe('jobDiversity', () => {
  it('assertCountPerAxisBalanced ne lève pas (aucun axe > 2× un autre)', () => {
    expect(() => assertCountPerAxisBalanced()).not.toThrow();
  });

  /** Vecteurs pas tous identiques : similarité moyenne < 0.96 (seuil ajustable si vecteurs revus). */
  it('business_entrepreneuriat : similarité moyenne entre jobs < 0.96', () => {
    const vectors = getVectorsForSectorAndVariant('business_entrepreneuriat', 'default');
    expect(vectors).not.toBeNull();
    const jobs = Object.keys(vectors!);
    let sumSim = 0;
    let count = 0;
    for (let i = 0; i < jobs.length; i++) {
      for (let j = i + 1; j < jobs.length; j++) {
        sumSim += cosineSimilarity(vectors![jobs[i]!]!, vectors![jobs[j]!]!);
        count++;
      }
    }
    const avgSim = count > 0 ? sumSim / count : 0;
    expect(avgSim).toBeLessThan(0.96);
  });

  it('finance_assurance : similarité moyenne entre jobs < 0.96', () => {
    const vectors = getVectorsForSectorAndVariant('finance_assurance', 'default');
    expect(vectors).not.toBeNull();
    const jobs = Object.keys(vectors!);
    let sumSim = 0;
    let count = 0;
    for (let i = 0; i < jobs.length; i++) {
      for (let j = i + 1; j < jobs.length; j++) {
        sumSim += cosineSimilarity(vectors![jobs[i]!]!, vectors![jobs[j]!]!);
        count++;
      }
    }
    const avgSim = count > 0 ? sumSim / count : 0;
    expect(avgSim).toBeLessThan(0.96);
  });

  it('data_ia : similarité moyenne entre jobs < 0.96', () => {
    const vectors = getVectorsForSectorAndVariant('data_ia', 'default');
    expect(vectors).not.toBeNull();
    const jobs = Object.keys(vectors!);
    let sumSim = 0;
    let count = 0;
    for (let i = 0; i < jobs.length; i++) {
      for (let j = i + 1; j < jobs.length; j++) {
        sumSim += cosineSimilarity(vectors![jobs[i]!]!, vectors![jobs[j]!]!);
        count++;
      }
    }
    const avgSim = count > 0 ? sumSim / count : 0;
    expect(avgSim).toBeLessThan(0.96);
  });

  it('ingenierie_tech : similarité moyenne entre jobs < 0.96', () => {
    const vectors = getVectorsForSectorAndVariant('ingenierie_tech', 'default');
    expect(vectors).not.toBeNull();
    const jobs = Object.keys(vectors!);
    let sumSim = 0;
    let count = 0;
    for (let i = 0; i < jobs.length; i++) {
      for (let j = i + 1; j < jobs.length; j++) {
        sumSim += cosineSimilarity(vectors![jobs[i]!]!, vectors![jobs[j]!]!);
        count++;
      }
    }
    const avgSim = count > 0 ? sumSim / count : 0;
    expect(avgSim).toBeLessThan(0.96);
  });

  describe('business_entrepreneuriat', () => {
    const sectorId = 'business_entrepreneuriat';
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

    it('réactivité : inverser metier_10 change top1 ou ordre top3', () => {
      const base = makeAnswers(Object.fromEntries(QUESTION_IDS.map((id) => [id, 'B'])) as Record<string, 'A' | 'B' | 'C'>);
      const flipped = makeAnswers({ ...(Object.fromEntries(QUESTION_IDS.map((id) => [id, 'B'])) as Record<string, 'A' | 'B' | 'C'>), metier_10: 'A' });
      const rankBase = rankJobsForSector(sectorId, computeJobProfile(base), 3, 'default').map((r) => r.job);
      const rankFlipped = rankJobsForSector(sectorId, computeJobProfile(flipped), 3, 'default').map((r) => r.job);
      const top1Changed = rankBase[0] !== rankFlipped[0];
      const orderTop3Changed = JSON.stringify(rankBase) !== JSON.stringify(rankFlipped);
      expect(top1Changed || orderTop3Changed).toBe(true);
    });
  });

  describe('finance_assurance', () => {
    const sectorId = 'finance_assurance';
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

    it('réactivité : inverser metier_10 change top1 ou ordre top3', () => {
      const baseChoices = Object.fromEntries(QUESTION_IDS.map((id) => [id, 'B'])) as Record<string, 'A' | 'B' | 'C'>;
      const base = makeAnswers(baseChoices);
      const flipped = makeAnswers({ ...baseChoices, metier_10: 'A' });
      const rankBase = rankJobsForSector(sectorId, computeJobProfile(base), 3, 'default').map((r) => r.job);
      const rankFlipped = rankJobsForSector(sectorId, computeJobProfile(flipped), 3, 'default').map((r) => r.job);
      const top1Changed = rankBase[0] !== rankFlipped[0];
      const orderTop3Changed = JSON.stringify(rankBase) !== JSON.stringify(rankFlipped);
      expect(top1Changed || orderTop3Changed).toBe(true);
    });
  });

  describe('data_ia', () => {
    const sectorId = 'data_ia';
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

    it('réactivité : inverser metier_10 change top1 ou ordre top3', () => {
      const baseChoices = Object.fromEntries(QUESTION_IDS.map((id) => [id, 'B'])) as Record<string, 'A' | 'B' | 'C'>;
      const base = makeAnswers(baseChoices);
      const flipped = makeAnswers({ ...baseChoices, metier_10: 'A' });
      const rankBase = rankJobsForSector(sectorId, computeJobProfile(base), 3, 'default').map((r) => r.job);
      const rankFlipped = rankJobsForSector(sectorId, computeJobProfile(flipped), 3, 'default').map((r) => r.job);
      const top1Changed = rankBase[0] !== rankFlipped[0];
      const orderTop3Changed = JSON.stringify(rankBase) !== JSON.stringify(rankFlipped);
      expect(top1Changed || orderTop3Changed).toBe(true);
    });
  });

  describe('ingenierie_tech', () => {
    const sectorId = 'ingenierie_tech';
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
});
