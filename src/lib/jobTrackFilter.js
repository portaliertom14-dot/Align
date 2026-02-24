/**
 * Filtrage des métiers selon le niveau scolaire (track).
 * Règle unique : trackLevel = 0 (pro) | 1 (techno) | 2 (général) selon school_level.
 * Chaque job a un minTrack (0/1/2) via jobTrackConfig. Autorisé si minTrack <= trackLevel.
 * RÈGLE GLOBALE : job ou secteur inconnu → minTrack = 2 (général). Jamais minTrack = 0 par défaut.
 */

const { sectors } = require('../data/jobTrackConfig');

/** minTrack par défaut pour tout job/secteur inconnu : général uniquement (jamais pro/techno). */
const DEFAULT_MIN_TRACK_UNKNOWN = 2;

/** Normalise un titre pour comparaison : lower + NFD sans accents + alphanum/espaces + trim. */
function normalizeTitle(s) {
  if (s == null || typeof s !== 'string') return '';
  let t = s.trim().toLowerCase();
  t = t.normalize('NFD').replace(/\p{M}/gu, '');
  t = t.replace(/[^a-z0-9\s]/g, ' ');
  return t.replace(/\s+/g, ' ').trim();
}

let _mapBySector = null;
function getMinTrackMap() {
  if (_mapBySector) return _mapBySector;
  const map = {};
  for (const sec of sectors || []) {
    const sid = (sec.sectorId || '').trim();
    if (!sid) continue;
    map[sid] = {};
    for (const j of sec.jobs || []) {
      const title = (j.title || '').trim();
      if (title) map[sid][normalizeTitle(title)] = Math.max(0, Number(j.minTrack) || 0);
    }
  }
  _mapBySector = map;
  return map;
}

/** Retourne true si le secteur est présent dans la config. */
function isSectorInConfig(sectorId) {
  const sid = (sectorId || '').trim();
  const map = getMinTrackMap();
  return sid && map[sid] != null;
}

/**
 * Transforme le niveau scolaire en niveau track (0, 1 ou 2).
 * @param {string} [schoolLevel]
 * @returns {number} 0, 1 ou 2
 */
function getTrackLevel(schoolLevel) {
  if (schoolLevel == null || typeof schoolLevel !== 'string') return 0;
  const s = schoolLevel.trim().toLowerCase();
  if (/generale|générale/.test(s)) return 2;
  if (/technologique/.test(s)) return 1;
  if (/professionnelle|professionnel/.test(s)) return 0;
  return 0;
}

/**
 * Si le secteur n'est pas dans jobTrackConfig : bypass du filtre (minTrack=0 permissif).
 * Si le secteur est configuré mais le job inconnu : minTrack = 2 (restrictif).
 */
const MIN_TRACK_SECTOR_NOT_CONFIGURED = 0;

/**
 * Retourne le minTrack du métier pour le secteur.
 * Secteur non configuré → 0 (bypass filtre). Job inconnu dans un secteur configuré → 2.
 * @param {string} sectorId
 * @param {string} jobTitle
 * @returns {number} 0, 1 ou 2
 */
function getMinTrackForJob(sectorId, jobTitle) {
  const sid = (sectorId || '').trim();
  const map = getMinTrackMap();
  const sectorMap = map[sid];
  const key = normalizeTitle(jobTitle || '');

  if (!sectorMap) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.log('[TRACK_FALLBACK] sector_not_configured → bypass_filter', { sectorId: sid });
      console.log('[TRACK_LOOKUP]', { sectorId: sid, jobTitleNormalized: key || '(empty)', found: false, minTrackUsed: MIN_TRACK_SECTOR_NOT_CONFIGURED });
    }
    return MIN_TRACK_SECTOR_NOT_CONFIGURED;
  }

  if (!key) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.log('[TRACK_LOOKUP]', { sectorId: sid, jobTitleNormalized: '(empty)', found: false, minTrackUsed: DEFAULT_MIN_TRACK_UNKNOWN });
    }
    return DEFAULT_MIN_TRACK_UNKNOWN;
  }

  const found = sectorMap[key] !== undefined;
  const minTrackUsed = found ? sectorMap[key] : DEFAULT_MIN_TRACK_UNKNOWN;

  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.log('[TRACK_LOOKUP]', { sectorId: sid, jobTitleNormalized: key, found, minTrackUsed });
  }

  return minTrackUsed;
}

/**
 * Extrait le titre d'un item job (objet ou string).
 * @param {object|string} item
 * @returns {string}
 */
function getJobTitle(item) {
  if (item == null) return '';
  if (typeof item === 'string') return item;
  return (item.title ?? item.id ?? item.name ?? item.job ?? '').toString().trim();
}

/**
 * Retourne la liste des jobs du secteur depuis la config (pour fallback).
 * @param {string} sectorId
 * @returns {Array<{ title: string, score?: number }>}
 */
function getSectorJobsFromConfig(sectorId) {
  const sid = (sectorId || '').trim();
  const sec = (sectors || []).find((s) => (s.sectorId || '').trim() === sid);
  if (!sec?.jobs?.length) {
    if (typeof __DEV__ !== 'undefined' && __DEV__ && sid) {
      console.log('[TRACK_FALLBACK] sector_not_configured (getSectorJobsFromConfig) — no config jobs', { sectorId: sid });
    }
    return [];
  }
  return sec.jobs.map((j) => ({ title: (j.title || '').trim(), score: 0.9 }));
}

/**
 * Nombre minimum de métiers éligibles pour considérer un secteur comme "accessible" pour un track.
 */
const MIN_ELIGIBLE_JOBS_FOR_SECTOR = 3;

/** Secteurs de repli par track quand le secteur choisi n'a aucun métier éligible (pro / techno / général). */
const SAFE_FALLBACK_SECTORS_BY_TRACK = {
  0: 'industrie_artisanat',
  1: 'business_entrepreneuriat',
  2: 'communication_medias',
};

/**
 * Retourne le nombre de métiers du secteur dont minTrack <= trackLevel (éligibles pour ce track).
 * @param {string} sectorId
 * @param {number} trackLevel 0 | 1 | 2
 * @returns {number}
 */
function getEligibleJobsCount(sectorId, trackLevel) {
  const sid = (sectorId || '').trim();
  const sec = (sectors || []).find((s) => (s.sectorId || '').trim() === sid);
  if (!sec?.jobs?.length) return 0;
  let count = 0;
  for (const j of sec.jobs) {
    const minTrack = Math.max(0, Number(j.minTrack) || 0);
    if (minTrack <= trackLevel) count += 1;
  }
  return count;
}

/**
 * Trouve un secteur accessible (au moins MIN_ELIGIBLE_JOBS_FOR_SECTOR métiers éligibles) pour le track.
 * Priorité : preferredSectorId si éligible, puis rankedSectorIds, puis SAFE_FALLBACK_SECTORS_BY_TRACK.
 * @param {number} trackLevel 0 | 1 | 2
 * @param {string} [preferredSectorId] Secteur préféré (ex. secteur IA)
 * @param {string[]} [rankedSectorIds] Liste ordonnée de sectorIds (ex. ranking IA)
 * @returns {{ sectorId: string, eligibleCount: number } | null}
 */
function findFallbackSector(trackLevel, preferredSectorId, rankedSectorIds) {
  const candidates = [];
  if (preferredSectorId && (preferredSectorId || '').trim()) {
    candidates.push((preferredSectorId || '').trim());
  }
  if (Array.isArray(rankedSectorIds)) {
    for (const id of rankedSectorIds) {
      const sid = (id && typeof id === 'string' ? id : (id?.id ?? id?.sectorId ?? '')).toString().trim();
      if (sid && !candidates.includes(sid)) candidates.push(sid);
    }
  }
  const safeId = SAFE_FALLBACK_SECTORS_BY_TRACK[trackLevel];
  if (safeId && !candidates.includes(safeId)) candidates.push(safeId);

  for (const sid of candidates) {
    const count = getEligibleJobsCount(sid, trackLevel);
    if (count >= MIN_ELIGIBLE_JOBS_FOR_SECTOR) {
      return { sectorId: sid, eligibleCount: count };
    }
  }
  return null;
}

/**
 * Filtre unique : applique la règle minTrack <= trackLevel sur une liste de jobs.
 * Si le résultat est vide : retourne [] (aucun fallback "lowest minTrack jobs"). L'appelant doit gérer (redirect / message).
 *
 * @param {string} sectorId
 * @param {Array<{ title?: string, id?: string, name?: string, job?: string, [key: string]: any }|string>} jobs
 * @param {string} [schoolLevel]
 * @param {{ fallbackCount?: number }} [opts] - ignoré (conservé pour compatibilité API)
 * @returns {Array}
 */
function applyTrackFilter(sectorId, jobs, schoolLevel, { fallbackCount = 3 } = {}) {
  const sid = (sectorId || '').trim();
  const list = Array.isArray(jobs) ? jobs : [];
  const hasValidSchoolLevel = schoolLevel != null && typeof schoolLevel === 'string' && String(schoolLevel).trim().length > 0;
  if (!hasValidSchoolLevel) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.error('[TRACK] applyTrackFilter refused: school_level is null or invalid — no filtering applied to avoid wrong results. Fix profile school_level.', { schoolLevel });
    }
    return [];
  }
  const trackLevel = getTrackLevel(schoolLevel);
  const isPro = trackLevel === 0;

  const filtered = list.filter((item) => {
    const title = getJobTitle(item);
    const minTrack = getMinTrackForJob(sid, title);
    return minTrack <= trackLevel;
  });

  if (typeof __DEV__ !== 'undefined' && __DEV__ && isPro && filtered.length > 0) {
    for (const item of filtered) {
      const title = getJobTitle(item);
      const minTrack = getMinTrackForJob(sid, title);
      if (minTrack >= 1) {
        console.warn('[TRACK] Professionnelle profile but job with minTrack >= 1 passed — should not happen', { schoolLevel, jobTitle: title, minTrack });
      }
    }
  }

  if (filtered.length > 0) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      const beforeTop3 = list.map((it) => getJobTitle(it));
      const afterTop3 = filtered.map((it) => getJobTitle(it));
      const chosenJobName = getJobTitle(filtered[0]);
      console.log('[TRACK] schoolLevel=', schoolLevel, 'sectorId=', sid, 'beforeTop3=', beforeTop3, 'afterTop3=', afterTop3, 'chosenJobName=', chosenJobName);
    }
    return filtered;
  }

  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.log('[TRACK] filteredEmpty sectorId=' + sid + ' trackLevel=' + trackLevel + ' action=return_empty');
  }
  return [];
}

/**
 * Filtre les métiers (délègue à applyTrackFilter).
 * @param {string} sectorId
 * @param {Array} jobs
 * @param {string} [schoolLevel]
 * @returns {Array}
 */
function filterJobsByTrack(sectorId, jobs, schoolLevel) {
  return applyTrackFilter(sectorId, jobs, schoolLevel, { fallbackCount: 3 });
}

/** En DEV : vérifications rapides (trackLevel=0 + data_ia => vide + redirect, trackLevel=2 => inchangé). */
if (typeof __DEV__ !== 'undefined' && __DEV__ && typeof global !== 'undefined') {
  global.__runTrackFilterDEVChecks = function () {
    const emptyPro = applyTrackFilter('data_ia', [{ title: 'Data analyst' }], 'Terminale professionnelle');
    const fallback = findFallbackSector(0, 'data_ia', []);
    console.log('[TRACK_DEV] trackLevel=0 + sectorId=data_ia => top3 empty:', emptyPro.length === 0, '| fallback sector:', fallback?.sectorId ?? 'none');
    const fullGeneral = applyTrackFilter('droit_justice', [{ title: 'Juriste fiscal' }], 'Terminale générale');
    console.log('[TRACK_DEV] trackLevel=2 => has jobs:', fullGeneral.length > 0);
  };
}

module.exports = {
  getTrackLevel,
  getMinTrackForJob,
  getJobTitle,
  getSectorJobsFromConfig,
  getEligibleJobsCount,
  findFallbackSector,
  applyTrackFilter,
  filterJobsByTrack,
};
