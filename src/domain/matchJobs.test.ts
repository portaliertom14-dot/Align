/**
 * Tests : similarité et ranking métier (3 vecteurs mock, ranking stable) + fallback non-pilote.
 */

import type { JobVector } from './jobAxes';
import { ZERO_JOB_VECTOR } from './jobAxes';
import { JOBS_BY_SECTOR, SECTOR_IDS } from '../data/jobsBySector';
import { getVectorsForSectorAndVariant } from '../data/jobVectorsBySector';
import { cosineSimilarity, rankJobsForSector, FALLBACK_SCORE } from './matchJobs';

function vec(overrides: Partial<JobVector>): JobVector {
  return { ...ZERO_JOB_VECTOR, ...overrides };
}

describe('matchJobs', () => {
  describe('cosineSimilarity', () => {
    it('retourne 1 pour deux vecteurs identiques', () => {
      const v = vec({ STRUCTURE: 5, ACTION: 3, CREATIVITE: 7 });
      expect(cosineSimilarity(v, v)).toBeCloseTo(1, 5);
    });

    it('retourne 0 pour vecteur nul vs non nul', () => {
      const zero = vec({});
      const nonZero = vec({ ACTION: 5 });
      expect(cosineSimilarity(zero, nonZero)).toBe(0);
    });

    it('ordre de similarité stable sur 3 vecteurs mock', () => {
      const user = vec({ STRUCTURE: 8, ACTION: 2, CREATIVITE: 1 });
      const jobA = vec({ STRUCTURE: 9, ACTION: 1, CREATIVITE: 0 });
      const jobB = vec({ STRUCTURE: 5, ACTION: 5, CREATIVITE: 5 });
      const jobC = vec({ STRUCTURE: 0, ACTION: 10, CREATIVITE: 0 });

      const simA = cosineSimilarity(user, jobA);
      const simB = cosineSimilarity(user, jobB);
      const simC = cosineSimilarity(user, jobC);

      expect(simA).toBeGreaterThan(simB);
      expect(simB).toBeGreaterThan(simC);
    });
  });

  describe('rankJobsForSector', () => {
    it('secteur généré (creation_design) ne lève pas et retourne des résultats avec score cosine', () => {
      const user = vec({});
      const result = rankJobsForSector('creation_design', user, 5);
      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThanOrEqual(5);
      result.forEach((r) => {
        expect(r.job).toBeDefined();
        expect(typeof r.job).toBe('string');
        expect(r.score).toBeGreaterThanOrEqual(0);
        expect(r.score).toBeLessThanOrEqual(1);
      });
      const hasCosineScore = result.some((r) => r.score !== FALLBACK_SCORE);
      expect(hasCosineScore).toBe(true);
    });

    it('deux appels identiques (même userVector, même secteur) donnent le même ordre (déterministe)', () => {
      const user = vec({ STRUCTURE: 3, ACTION: 7 });
      const a = rankJobsForSector('culture_patrimoine', user, 5);
      const b = rankJobsForSector('culture_patrimoine', user, 5);
      expect(a.length).toBe(b.length);
      expect(a.map((x) => x.job)).toEqual(b.map((x) => x.job));
    });

    it('respecte topN demandé', () => {
      const user = vec({});
      expect(rankJobsForSector('sante_bien_etre', user, 3)).toHaveLength(3);
      expect(rankJobsForSector('sante_bien_etre', user, 10)).toHaveLength(10);
    });

    it('variant change la source des métiers pour droit_justice_securite (default vs defense_track)', () => {
      const user = vec({});
      const defaultJobs = rankJobsForSector('droit_justice_securite', user, 5, 'default').map((r) => r.job);
      const defenseJobs = rankJobsForSector('droit_justice_securite', user, 5, 'defense_track').map((r) => r.job);
      expect(defaultJobs.length).toBeGreaterThan(0);
      expect(defenseJobs.length).toBeGreaterThan(0);
      const defaultSet = new Set(defaultJobs);
      const defenseSet = new Set(defenseJobs);
      const defenseTrackTitles = ['Militaire', 'Pompier', 'Gendarme', 'Officier pompier', 'Agent de sécurité'];
      const hasDefenseTrackJob = defenseTrackTitles.some((t) => defenseSet.has(t));
      expect(hasDefenseTrackJob).toBe(true);
      const defaultTrackTitles = ['Avocat', 'Magistrat', 'Notaire'];
      const hasDefaultTrackJob = defaultTrackTitles.some((t) => defaultSet.has(t));
      expect(hasDefaultTrackJob).toBe(true);
    });

    it('droit_justice_securite default utilise cosine (scores !== 0.5)', () => {
      const user = vec({ ANALYSE: 8, STRUCTURE: 7, CONTACT_HUMAIN: 5 });
      const result = rankJobsForSector('droit_justice_securite', user, 5, 'default');
      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThanOrEqual(5);
      const scores = result.map((r) => r.score);
      const allFallback = scores.every((s) => s === FALLBACK_SCORE);
      expect(allFallback).toBe(false);
      scores.forEach((s) => {
        expect(s).toBeGreaterThanOrEqual(0);
        expect(s).toBeLessThanOrEqual(1);
      });
    });

    it('droit_justice_securite defense_track utilise cosine et retourne des jobs du track', () => {
      const user = vec({ ACTION: 8, RISK_TOLERANCE: 7, STRUCTURE: 6 });
      const result = rankJobsForSector('droit_justice_securite', user, 5, 'defense_track');
      expect(result.length).toBeGreaterThan(0);
      const scores = result.map((r) => r.score);
      const hasCosineScore = scores.some((s) => s !== FALLBACK_SCORE);
      expect(hasCosineScore).toBe(true);
      const defenseTitles = ['Militaire', 'Pompier', 'Gendarme', 'Officier des armées'];
      const jobTitles = result.map((r) => r.job);
      const hasDefenseJob = defenseTitles.some((t) => jobTitles.includes(t));
      expect(hasDefenseJob).toBe(true);
    });

    it('secteur généré (creation_design) : determinisme (même user => même ordre)', () => {
      const user = vec({ STRUCTURE: 4, ACTION: 6 });
      const result = rankJobsForSector('creation_design', user, 5);
      const result2 = rankJobsForSector('creation_design', user, 5);
      expect(result.length).toBe(result2.length);
      expect(result.map((x) => x.job)).toEqual(result2.map((x) => x.job));
      expect(result.map((x) => x.score)).toEqual(result2.map((x) => x.score));
    });

    it('finance_assurance utilise cosine (5 résultats, au moins un score !== 0.5, titres dans whitelist)', () => {
      const user = vec({ ANALYSE: 8, STRUCTURE: 7, RISK_TOLERANCE: 3, STABILITE: 8 });
      const result = rankJobsForSector('finance_assurance', user, 5, 'default');
      expect(result).toHaveLength(5);
      const scores = result.map((r) => r.score);
      const hasCosineScore = scores.some((s) => s !== FALLBACK_SCORE);
      expect(hasCosineScore).toBe(true);
      const whitelist = new Set(JOBS_BY_SECTOR['finance_assurance']);
      result.forEach((r) => {
        expect(whitelist.has(r.job)).toBe(true);
      });
    });

    it('finance_assurance : deux appels avec même userVector donnent le même ordre (déterminisme)', () => {
      const user = vec({ ANALYSE: 7, STRUCTURE: 8, CONTACT_HUMAIN: 5 });
      const a = rankJobsForSector('finance_assurance', user, 5, 'default');
      const b = rankJobsForSector('finance_assurance', user, 5, 'default');
      expect(a.length).toBe(b.length);
      expect(a.map((x) => x.job)).toEqual(b.map((x) => x.job));
      expect(a.map((x) => x.score)).toEqual(b.map((x) => x.score));
    });

    it('data_ia utilise cosine (5 résultats, au moins un score !== 0.5, titres dans whitelist)', () => {
      const user = vec({ ANALYSE: 9, STRUCTURE: 8, CREATIVITE: 5, CONTACT_HUMAIN: 3 });
      const result = rankJobsForSector('data_ia', user, 5, 'default');
      expect(result).toHaveLength(5);
      const scores = result.map((r) => r.score);
      const hasCosineScore = scores.some((s) => s !== FALLBACK_SCORE);
      expect(hasCosineScore).toBe(true);
      const whitelist = new Set(JOBS_BY_SECTOR['data_ia']);
      result.forEach((r) => {
        expect(whitelist.has(r.job)).toBe(true);
      });
    });

    it('ingenierie_tech utilise cosine (5 résultats, au moins un score !== 0.5, titres dans whitelist)', () => {
      const user = vec({ STRUCTURE: 8, ANALYSE: 7, ACTION: 7, STABILITE: 8, CONTACT_HUMAIN: 3 });
      const result = rankJobsForSector('ingenierie_tech', user, 5, 'default');
      expect(result).toHaveLength(5);
      const scores = result.map((r) => r.score);
      const hasCosineScore = scores.some((s) => s !== FALLBACK_SCORE);
      expect(hasCosineScore).toBe(true);
      const whitelist = new Set(JOBS_BY_SECTOR['ingenierie_tech']);
      result.forEach((r) => {
        expect(whitelist.has(r.job)).toBe(true);
      });
    });
  });

  describe('noFallbackAllSectors', () => {
    const userVectorDummy = vec({});

    it('every sector has vectors for default variant', () => {
      for (const sectorId of SECTOR_IDS) {
        const vectors = getVectorsForSectorAndVariant(sectorId, 'default');
        expect(vectors).not.toBeNull();
        expect(vectors).toBeDefined();
      }
    });

    it('every sector returns cosine scores (no fallback 0.5) for default variant', () => {
      for (const sectorId of SECTOR_IDS) {
        const result = rankJobsForSector(sectorId, userVectorDummy, 5, 'default');
        expect(result.length).toBeGreaterThan(0);
        const allScoresNotFallback = result.every((r) => r.score !== FALLBACK_SCORE);
        expect(allScoresNotFallback).toBe(true);
      }
    });
  });
});
