/**
 * Guard global unique : un métier affiché/persisté doit venir de la whitelist secteur/variant.
 * - Détecte les titres hors whitelist
 * - Trace la source (stage + meta)
 * - Corrige en canonisant ou en fallback
 * - __DEV__ : throw si invalide ; prod : return null + log
 */

declare const __DEV__: boolean | undefined;

import { normalizeJobKey } from './normalizeJobKey';
import {
  getJobsForSector,
  getJobsForSectorVariant,
  type SectorId,
  type SectorVariantKey,
} from '../data/jobsBySector';

export { normalizeJobKey };

const SAMPLE_SIZE = 10;

export interface IsJobAllowedParams {
  sectorId: string;
  variant: SectorVariantKey | string;
  jobTitle: string;
}

export interface IsJobAllowedResult {
  ok: boolean;
  normalized: string;
  canonicalTitle?: string;
  sample?: string[];
}

/**
 * Vérifie si jobTitle est dans la whitelist du secteur/variant.
 * Retourne ok + canonicalTitle (titre exact whitelist) si autorisé, sinon ok=false + sample (10 titres whitelist).
 */
export function isJobAllowed({
  sectorId,
  variant,
  jobTitle,
}: IsJobAllowedParams): IsJobAllowedResult {
  const normalized = normalizeJobKey(jobTitle ?? '');
  const v: SectorVariantKey = variant === 'defense_track' ? 'defense_track' : 'default';
  let list: string[];
  try {
    const variantList = getJobsForSectorVariant(sectorId as SectorId, v);
    list = variantList ?? getJobsForSector(sectorId as SectorId);
  } catch (_) {
    return { ok: false, normalized, sample: [] };
  }
  const keyToCanonical = new Map<string, string>();
  const keySet = new Set<string>();
  for (const title of list) {
    const key = normalizeJobKey(title);
    keySet.add(key);
    if (!keyToCanonical.has(key)) keyToCanonical.set(key, title);
  }
  if (normalized && keySet.has(normalized)) {
    return {
      ok: true,
      normalized,
      canonicalTitle: keyToCanonical.get(normalized)!,
    };
  }
  const sample = list.slice(0, SAMPLE_SIZE);
  return { ok: false, normalized, sample };
}

export interface GuardJobTitleParams {
  stage: string;
  sectorId: string;
  variant: SectorVariantKey | string;
  jobTitle: string;
  meta?: Record<string, unknown>;
}

/**
 * Guard unique : si jobTitle est dans la whitelist, retourne le titre canonique.
 * Sinon : log structuré, __DEV__ throw, prod return null.
 */
export function guardJobTitle({
  stage,
  sectorId,
  variant,
  jobTitle,
  meta = {},
}: GuardJobTitleParams): string | null {
  if (!jobTitle || typeof jobTitle !== 'string' || !jobTitle.trim()) {
    return null;
  }
  const { ok, normalized, canonicalTitle, sample } = isJobAllowed({
    sectorId,
    variant,
    jobTitle,
  });
  if (ok && canonicalTitle) {
    return canonicalTitle;
  }
  console.error('[JOB_GUARD] INVALID_JOB', {
    stage,
    sectorId,
    variant,
    jobTitle: jobTitle.trim(),
    normalized,
    sample: sample ?? [],
    ...meta,
  });
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    throw new Error('INVALID_JOB_TITLE');
  }
  return null;
}

/**
 * Retourne le premier titre de la whitelist pour le secteur/variant (fallback sûr).
 */
export function getFirstWhitelistTitle(
  sectorId: string,
  variant: SectorVariantKey | string
): string | null {
  const v: SectorVariantKey = variant === 'defense_track' ? 'defense_track' : 'default';
  try {
    const variantList = getJobsForSectorVariant(sectorId as SectorId, v);
    const list = variantList ?? getJobsForSector(sectorId as SectorId);
    return list.length > 0 ? list[0]! : null;
  } catch (_) {
    return null;
  }
}

/**
 * Retourne le premier titre de la whitelist différent de excludeTitle (pour regen = toujours un autre métier).
 * Si excludeTitle est vide/null ou pas dans la whitelist, retourne le premier titre.
 * Sinon retourne le premier titre dont la clé normalisée ≠ normalizeJobKey(excludeTitle).
 */
export function getFirstWhitelistTitleDifferentFrom(
  sectorId: string,
  variant: SectorVariantKey | string,
  excludeTitle: string | null | undefined
): string | null {
  const v: SectorVariantKey = variant === 'defense_track' ? 'defense_track' : 'default';
  try {
    const variantList = getJobsForSectorVariant(sectorId as SectorId, v);
    const list = variantList ?? getJobsForSector(sectorId as SectorId);
    if (list.length === 0) return null;
    const excludeKey = excludeTitle ? normalizeJobKey(excludeTitle) : '';
    if (!excludeKey) return list[0]!;
    for (const title of list) {
      if (normalizeJobKey(title) !== excludeKey) return title;
    }
    return list[0]!;
  } catch (_) {
    return null;
  }
}
