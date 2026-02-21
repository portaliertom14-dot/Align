/**
 * Whitelist titres métiers par secteur (alignée client src/data/jobsBySector.ts).
 * Résolution jobTitle / jobKey → titre canonique pour generate-dynamic-modules.
 */

import { SECTOR_IDS } from './sectors.ts';
import { normalizeJobKey } from './normalizeJobKey.ts';
import jobsBySectorTitles from './jobsBySectorTitles.json' with { type: 'json' };
const jobsBySectorTitlesMap = jobsBySectorTitles as unknown as Record<string, string[]>;

/** Pour un secteur, retourne la liste des titres canoniques (whitelist). */
export function getJobTitlesForSector(sectorId: string): string[] {
  const sid = (sectorId ?? '').trim().toLowerCase();
  const list = jobsBySectorTitlesMap[sid];
  return Array.isArray(list) ? [...list] : [];
}

/** Map normalizedKey → canonicalTitle pour un secteur (lazy build). */
const keyToCanonicalBySector = new Map<string, Map<string, string>>();

function getKeyToCanonical(sectorId: string): Map<string, string> {
  const sid = (sectorId ?? '').trim().toLowerCase();
  let map = keyToCanonicalBySector.get(sid);
  if (!map) {
    map = new Map<string, string>();
    const titles = getJobTitlesForSector(sid);
    for (const title of titles) {
      const key = normalizeJobKey(title);
      if (key) map.set(key, title);
    }
    keyToCanonicalBySector.set(sid, map);
  }
  return map;
}

export type ResolveJobResult = { canonicalTitle: string } | null;

/**
 * Résout jobTitle / jobKey vers le titre canonique de la whitelist du secteur.
 * Ordre : match exact titre → match normalisé(jobTitle) → match jobKey.
 * Retourne le titre canonique (whitelist) pour éviter modules décalés.
 */
export function resolveJobForSector(
  sectorId: string,
  receivedJobTitle?: string | null,
  receivedJobKey?: string | null
): ResolveJobResult {
  const sid = (sectorId ?? '').trim().toLowerCase();
  const titles = getJobTitlesForSector(sid);
  if (titles.length === 0) return null;

  const keyToCanonical = getKeyToCanonical(sid);

  const titleTrim = (receivedJobTitle ?? '').trim();
  if (titleTrim) {
    if (titles.includes(titleTrim)) return { canonicalTitle: titleTrim };
    const normalizedTitle = normalizeJobKey(titleTrim);
    const canonical = keyToCanonical.get(normalizedTitle);
    if (canonical) return { canonicalTitle: canonical };
  }

  const keyTrim = (receivedJobKey ?? '').trim();
  if (keyTrim) {
    const canonical = keyToCanonical.get(keyTrim);
    if (canonical) return { canonicalTitle: canonical };
    const canonicalFromNorm = keyToCanonical.get(normalizeJobKey(keyTrim));
    if (canonicalFromNorm) return { canonicalTitle: canonicalFromNorm };
  }

  return null;
}

/** Pour logs d'erreur : échantillon de la whitelist (5 titres). */
export function getWhitelistSample(sectorId: string, count = 5): string[] {
  const titles = getJobTitlesForSector(sectorId);
  return titles.slice(0, count);
}

export function isSectorKnown(sectorId: string): boolean {
  const sid = (sectorId ?? '').trim().toLowerCase();
  return (SECTOR_IDS as readonly string[]).includes(sid);
}
