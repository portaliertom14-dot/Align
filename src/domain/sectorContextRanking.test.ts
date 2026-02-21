/**
 * Tests du ranking métiers avec contexte secteur (sectorContext).
 * - Même réponses métier + ctx "humain" vs "systeme_objet" => top3 différent sur au moins un secteur (ex. sante_bien_etre).
 * - Aucun job hors whitelist (assert).
 */

import { computeJobProfile } from './computeJobProfile';
import { rankJobsForSector } from './matchJobs';
import { sectorContextToJobVector, blendVectors } from './sectorContextToJobVector';
import { getJobsForSectorNormalizedSet, type SectorId } from '../data/jobsBySector';
import { normalizeJobKey } from './normalizeJobKey';

const SECTOR_ID = 'sante_bien_etre';
const VARIANT = 'default';
const W_JOB = 0.75;
const W_CTX = 0.25;

function makeNeutralAnswers(): Record<string, { value: string }> {
  const out: Record<string, { value: string }> = {};
  for (let i = 1; i <= 30; i++) {
    out[`metier_${i}`] = { value: 'B' };
  }
  return out;
}

function assertAllJobsInWhitelist(
  sectorId: string,
  variant: 'default' | 'defense_track',
  titles: string[]
): void {
  const allowed = getJobsForSectorNormalizedSet(sectorId as 'sante_bien_etre', variant);
  for (const title of titles) {
    const normalized = normalizeJobKey(title);
    expect(allowed.has(normalized)).toBe(true);
  }
}

describe('sectorContextRanking', () => {
  it('même réponses métier, ctx humain vs systeme_objet => top3 différent sur au moins un secteur', () => {
    const answers = makeNeutralAnswers();
    const jobVector = computeJobProfile(answers);
    const ctxHumain = sectorContextToJobVector({ finaliteDominante: 'humain' });
    const ctxSysteme = sectorContextToJobVector({ finaliteDominante: 'systeme_objet' });
    const blendedHumain = blendVectors(jobVector, ctxHumain, W_JOB, W_CTX);
    const blendedSysteme = blendVectors(jobVector, ctxSysteme, W_JOB, W_CTX);
    // Vérifier que les vecteurs blendés diffèrent (effet du contexte)
    expect(JSON.stringify(blendedHumain)).not.toBe(JSON.stringify(blendedSysteme));
    // Sur au moins un secteur, le top3 doit différer
    const sectorsToTry: SectorId[] = ['sante_bien_etre', 'social_humain', 'data_ia', 'business_entrepreneuriat'];
    let atLeastOneDiffers = false;
    for (const sectorId of sectorsToTry) {
      const rankedHumain = rankJobsForSector(sectorId, blendedHumain, 3, 'default');
      const rankedSysteme = rankJobsForSector(sectorId, blendedSysteme, 3, 'default');
      const top3H = rankedHumain.map((r) => r.job);
      const top3S = rankedSysteme.map((r) => r.job);
      if (top3H[0] !== top3S[0] || top3H[1] !== top3S[1] || top3H[2] !== top3S[2]) {
        atLeastOneDiffers = true;
        break;
      }
    }
    expect(atLeastOneDiffers).toBe(true);
  });

  it('aucun job hors whitelist (sante_bien_etre, avec et sans sectorContext)', () => {
    const answers = makeNeutralAnswers();
    const jobVector = computeJobProfile(answers);
    const blendedWithCtx = blendVectors(
      jobVector,
      sectorContextToJobVector({ finaliteDominante: 'humain' }),
      W_JOB,
      W_CTX
    );
    const rankedWithCtx = rankJobsForSector(SECTOR_ID, blendedWithCtx, 3, VARIANT);
    const rankedNoCtx = rankJobsForSector(SECTOR_ID, jobVector, 3, VARIANT);
    assertAllJobsInWhitelist(
      SECTOR_ID,
      VARIANT,
      rankedWithCtx.map((r) => r.job)
    );
    assertAllJobsInWhitelist(SECTOR_ID, VARIANT, rankedNoCtx.map((r) => r.job));
  });
});
