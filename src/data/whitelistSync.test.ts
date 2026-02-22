/**
 * Sync whitelist : chaque secteur a exactement 30 titres, pas de doublons (après normalizeJobKey).
 */

import { SECTOR_IDS, getJobsForSector, getJobsForSectorVariant } from './jobsBySector';
import { normalizeJobKey } from '../domain/normalizeJobKey';
import type { SectorId } from './jobsBySector';

const EXPECTED_COUNT = 30;

describe('whitelistSync', () => {
  it('chaque secteur renvoie exactement 30 titres (default)', () => {
    for (const sectorId of SECTOR_IDS) {
      const list = getJobsForSector(sectorId);
      expect(list).toHaveLength(EXPECTED_COUNT);
    }
  });

  it('aucun doublon après normalizeJobKey par secteur', () => {
    for (const sectorId of SECTOR_IDS) {
      const list = getJobsForSector(sectorId);
      const normalized = list.map((t) => normalizeJobKey(t));
      const set = new Set(normalized);
      expect(set.size).toBe(list.length);
    }
  });

  it('getJobsForSectorVariant (default) cohérent avec getJobsForSector quand défini', () => {
    for (const sectorId of SECTOR_IDS) {
      const fromVariant = getJobsForSectorVariant(sectorId, 'default');
      const fromSector = getJobsForSector(sectorId);
      if (fromVariant) {
        expect(fromVariant).toHaveLength(EXPECTED_COUNT);
        expect(fromVariant).toEqual(fromSector);
      } else {
        expect(fromSector).toHaveLength(EXPECTED_COUNT);
      }
    }
  });
});
