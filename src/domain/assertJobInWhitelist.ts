/**
 * Garantit qu'un métier affiché/persisté est bien dans la whitelist du secteur.
 * En __DEV__ : throw si hors whitelist. Sinon : log + pas de throw.
 */

import { normalizeJobKey } from './normalizeJobKey';
import {
  getJobsForSectorNormalizedSet,
  type SectorId,
  type SectorVariantKey,
} from '../data/jobsBySector';

/**
 * Vérifie que jobTitle est dans la whitelist du secteur (après normalisation).
 * Si absent : console.error avec détails ; en __DEV__ : throw Error('INVALID_JOB_TITLE').
 */
export function assertJobInWhitelist(
  sectorId: SectorId | string,
  variant: SectorVariantKey | string,
  jobTitle: string
): void {
  if (!jobTitle || typeof jobTitle !== 'string' || !jobTitle.trim()) {
    return;
  }
  const sid = String(sectorId).trim();
  const v = (variant === 'defense_track' ? 'defense_track' : 'default') as SectorVariantKey;
  const normalized = normalizeJobKey(jobTitle);
  let allowed: Set<string>;
  try {
    allowed = getJobsForSectorNormalizedSet(sid as SectorId, v);
  } catch (e) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      throw new Error(
        `[JOB_AXES] assertJobInWhitelist: secteur inconnu — ${sid} — ${(e as Error)?.message ?? e}`
      );
    }
    console.error('[JOB_AXES] INVALID_JOB_TITLE', {
      sectorId: sid,
      variant: v,
      jobTitle: jobTitle.trim(),
      normalized,
      error: (e as Error)?.message ?? e,
    });
    return;
  }
  if (!allowed.has(normalized)) {
    const whitelistSample = Array.from(allowed).slice(0, 10);
    console.error('[JOB_AXES] INVALID_JOB_TITLE', {
      sectorId: sid,
      variant: v,
      jobTitle: jobTitle.trim(),
      normalized,
      whitelistSample,
    });
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      throw new Error('INVALID_JOB_TITLE');
    }
  }
}
