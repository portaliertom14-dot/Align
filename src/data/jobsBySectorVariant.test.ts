/**
 * Tests : validateJobsBySectorVariant (N=30 par track, pas de doublons).
 */


import { validateJobsBySectorVariant, JOBS_PER_VARIANT_TRACK, getJobsForSectorVariant } from './jobsBySector';

describe('jobsBySectorVariant', () => {
  it('validateJobsBySectorVariant passe (N=30 par track)', () => {
    expect(() => validateJobsBySectorVariant()).not.toThrow();
  });

  it('getJobsForSectorVariant droit_justice_securite default retourne 30 métiers', () => {
    const list = getJobsForSectorVariant('droit_justice_securite', 'default');
    expect(list).not.toBeNull();
    expect(list).toHaveLength(JOBS_PER_VARIANT_TRACK);
  });

  it('getJobsForSectorVariant droit_justice_securite defense_track retourne 30 métiers', () => {
    const list = getJobsForSectorVariant('droit_justice_securite', 'defense_track');
    expect(list).not.toBeNull();
    expect(list).toHaveLength(JOBS_PER_VARIANT_TRACK);
  });

  it('getJobsForSectorVariant autre secteur retourne null', () => {
    expect(getJobsForSectorVariant('creation_design', 'default')).toBeNull();
    expect(getJobsForSectorVariant('defense_securite_civile', 'defense_track')).toBeNull();
  });
});
