/**
 * Tests pour la source de vérité JOBS_BY_SECTOR.
 * Exécution : npx jest src/data/jobsBySector.test.ts (ou npm test)
 */

import {
  SECTOR_IDS,
  JOBS_BY_SECTOR,
  validateJobsBySector,
  getJobsForSector,
  getJobsForSectorNormalizedSet,
  type SectorId,
} from './jobsBySector';
import { normalizeJobKey } from '../domain/normalizeJobKey';

describe('jobsBySector', () => {
  test('validateJobsBySector() ne lève pas d\'erreur', () => {
    expect(() => validateJobsBySector()).not.toThrow();
  });

  test('chaque secteur a exactement 30 métiers (via getJobsForSector)', () => {
    for (const sectorId of SECTOR_IDS) {
      const list = getJobsForSector(sectorId);
      expect(list).toBeDefined();
      expect(Array.isArray(list)).toBe(true);
      expect(list).toHaveLength(30);
    }
  });

  test('getJobsForSector retourne une copie (même longueur, pas la même référence)', () => {
    const sectorId = 'business_entrepreneuriat' as SectorId;
    const copy = getJobsForSector(sectorId);
    const original = JOBS_BY_SECTOR[sectorId];
    expect(copy).toHaveLength(original.length);
    expect(copy).not.toBe(original);
    expect(copy).toEqual(original);
  });

  test('getJobsForSector lève pour secteur inconnu', () => {
    expect(() => getJobsForSector('secteur_inconnu' as SectorId)).toThrow();
  });

  test('pas de doublon à l\'intérieur d\'un même secteur', () => {
    for (const sectorId of SECTOR_IDS) {
      const list = getJobsForSector(sectorId);
      const normalized = list.map((t) => t.trim().toLowerCase());
      const seen = new Set<string>();
      for (const t of normalized) {
        expect(seen.has(t)).toBe(false);
        seen.add(t);
      }
    }
  });

  describe('getJobsForSectorNormalizedSet', () => {
    test('communication_media : normalizeJobKey("Producteur") est dans le Set normalisé', () => {
      const sectorId = 'communication_media' as SectorId;
      const set = getJobsForSectorNormalizedSet(sectorId, 'default');
      const key = normalizeJobKey('Producteur');
      expect(set.has(key)).toBe(true);
      expect(key).toBe('producteur');
    });

    test('chaque secteur a un Set de 30 clés normalisées', () => {
      for (const sectorId of SECTOR_IDS) {
        const set = getJobsForSectorNormalizedSet(sectorId, 'default');
        expect(set.size).toBe(30);
      }
    });
  });
});
