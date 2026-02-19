/**
 * Tests : similarité et ranking métier (3 vecteurs mock, ranking stable) + fallback non-pilote.
 */

import type { JobVector } from './jobAxes';
import { ZERO_JOB_VECTOR } from './jobAxes';
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
    it('secteur non pilote ne lève pas et retourne des résultats avec score fallback', () => {
      const user = vec({});
      const result = rankJobsForSector('ingenierie_tech', user, 5);
      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThanOrEqual(5);
      result.forEach((r) => {
        expect(r.job).toBeDefined();
        expect(typeof r.job).toBe('string');
        expect(r.score).toBe(FALLBACK_SCORE);
      });
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
  });
});
