/**
 * Tests anti-régression : aucun titre invalide (hors whitelist) ne doit passer le guard.
 * - Chaque titre de la whitelist retourne bien le canonique via guardJobTitle.
 * - Un titre junk est rejeté (isJobAllowed ok: false).
 * - Le moteur rankJobsForSector ne retourne que des titres autorisés (isJobAllowed).
 */

import { getJobsForSector, SECTOR_IDS, type SectorId } from '../data/jobsBySector';
import { guardJobTitle, isJobAllowed } from './jobTitleGuard';
import { rankJobsForSector } from './matchJobs';
import { computeJobProfile } from './computeJobProfile';

describe('jobGuard.noInvalidTitles', () => {
  describe('canon: tout titre whitelist retourne le canonique', () => {
    it('pour chaque secteur, chaque job de getJobsForSector retourne le même titre (canonical) via guardJobTitle', () => {
      for (const sectorId of SECTOR_IDS) {
        const jobList = getJobsForSector(sectorId);
        expect(jobList).toHaveLength(30);
        for (const jobTitle of jobList) {
          const result = guardJobTitle({
            stage: 'TEST_CANON',
            sectorId,
            variant: 'default',
            jobTitle,
          });
          expect(result).toBe(jobTitle);
        }
      }
    });
  });

  describe('rejects junk', () => {
    const junkTitle = 'Invalid Job Title Not In Whitelist XYZ';
    const sectorsToTest: SectorId[] = [
      'sante_bien_etre',
      'environnement_agri',
      'finance_assurance',
      'data_ia',
      'social_humain',
    ];

    it('isJobAllowed retourne ok:false pour un titre clairement hors whitelist sur 5 secteurs', () => {
      for (const sectorId of sectorsToTest) {
        const { ok } = isJobAllowed({
          sectorId,
          variant: 'default',
          jobTitle: junkTitle,
        });
        expect(ok).toBe(false);
      }
    });

    it('guardJobTitle avec titre invalide : throw (dev) ou null (prod)', () => {
      const sectorId = 'environnement_agri';
      try {
        const result = guardJobTitle({
          stage: 'TEST_REJECT',
          sectorId,
          variant: 'default',
          jobTitle: junkTitle,
        });
        expect(result).toBeNull();
      } catch (e) {
        expect((e as Error).message).toContain('INVALID_JOB_TITLE');
      }
    });
  });

  describe('moteur: rankJobsForSector ne retourne que des titres autorisés', () => {
    const sectorsToTest: SectorId[] = [
      'sante_bien_etre',
      'social_humain',
      'data_ia',
      'business_entrepreneuriat',
      'environnement_agri',
      'communication_media',
      'finance_assurance',
      'ingenierie_tech',
    ];
    const neutralAnswers: Record<string, { value: string }> = {};
    for (let i = 1; i <= 30; i++) {
      neutralAnswers[`metier_${i}`] = { value: 'B' };
    }
    const userVector = computeJobProfile(neutralAnswers);

    it('pour 8 secteurs, chaque titre du top3 est autorisé via isJobAllowed', () => {
      for (const sectorId of sectorsToTest) {
        const ranked = rankJobsForSector(sectorId, userVector, 3, 'default');
        expect(ranked.length).toBeGreaterThanOrEqual(1);
        expect(ranked.length).toBeLessThanOrEqual(3);
        for (const r of ranked) {
          const { ok } = isJobAllowed({
            sectorId,
            variant: 'default',
            jobTitle: r.job,
          });
          expect(ok).toBe(true);
        }
      }
    });
  });
});
