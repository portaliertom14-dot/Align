/**
 * Tests pour la source de vérité JOBS_BY_SECTOR.
 * Exécution : npx jest src/data/jobsBySector.test.ts (ou npm test)
 */

import {
  SECTOR_IDS,
  JOBS_BY_SECTOR,
  validateJobsBySector,
  getJobsForSector,
  type SectorId,
} from './jobsBySector';

describe('jobsBySector', () => {
  test('validateJobsBySector() ne lève pas d\'erreur', () => {
    expect(() => validateJobsBySector()).not.toThrow();
  });

  test('chaque secteur a exactement 30 métiers', () => {
    for (const sectorId of SECTOR_IDS) {
      const list = JOBS_BY_SECTOR[sectorId];
      expect(list).toBeDefined();
      expect(Array.isArray(list)).toBe(true);
      expect(list).toHaveLength(30);
    }
  });

  test('getJobsForSector retourne une copie (même longueur, pas la même référence)', () => => {
    const sectorId: SectorId = 'business_entrepreneuriat';
    const copy = getJobsForSector(sectorId);
    const original = JOBS_BY_SECTOR[sectorId];
    expect(copy).toHaveLength(original.length);
    expect(copy).not.toBe(original);
    expect(copy).toEqual(original);
  });

  test('getJobsForSector lève pour secteur inconnu', () => {
    expect(() => getJobsForSector('secteur_inconnu' as SectorId)).toThrow();
  });
});
