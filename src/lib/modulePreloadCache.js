/**
 * MODULE_WARMUP — READ ONLY
 * ZÉRO appel IA. Uniquement SELECT DB + cache.
 * Les modules doivent être pré-générés par seedAllModulesIfNeeded (one-shot fin onboarding).
 */

import { getModuleFromDBOrCache } from '../services/aiModuleService';

const localCache = {
  mini_simulation_metier: null,
  apprentissage_mindset: null,
  test_secteur: null,
};

let preloadInProgress = false;
// Single-flight: if warmup in progress, return existing promise instead of starting another
let inFlightPromise = null;

export function getCachedModule(moduleType) {
  if (!localCache[moduleType]) return null;
  const m = localCache[moduleType];
  localCache[moduleType] = null;
  return m;
}

export function setCachedModule(moduleType, module) {
  localCache[moduleType] = module;
}

export function hasCachedModule(moduleType) {
  return !!localCache[moduleType];
}

/**
 * Warmup READ ONLY — SELECT DB, met en cache local.
 * Ne déclenche JAMAIS l'IA.
 */
export async function preloadModules(secteurId, metierId, level, chapterId = 1, callbacks = {}) {
  if (!secteurId) {
    callbacks.onError?.(new Error('secteurId requis'));
    return;
  }

  if (inFlightPromise) {
    if (__DEV__) console.log('[MODULE_WARMUP] skipped (single-flight, awaiting existing)');
    return inFlightPromise;
  }

  preloadInProgress = true;
  inFlightPromise = (async () => {
  try {
    if (__DEV__) console.log('[MODULE_WARMUP] started secteurId=' + secteurId + ' metierId=' + (metierId || 'null'));

    callbacks.onProgress?.({ status: 'start' });

    const configs = [
      metierId ? { chapterId, moduleIndex: 0, moduleType: 'mini_simulation_metier' } : null,
      { chapterId, moduleIndex: 1, moduleType: 'apprentissage_mindset' },
      { chapterId, moduleIndex: 2, moduleType: 'test_secteur' },
    ];
    const typeKeys = ['mini_simulation_metier', 'apprentissage_mindset', 'test_secteur'];

    const results = await Promise.allSettled(
      configs.map((cfg) => (cfg ? getModuleFromDBOrCache(cfg.chapterId, cfg.moduleIndex, cfg.moduleType) : Promise.resolve(null)))
    );

    let count = 0;
    results.forEach((result, i) => {
      if (result.status === 'fulfilled' && result.value) {
        localCache[typeKeys[i]] = result.value;
        count++;
      }
    });

    if (__DEV__) console.log('[MODULE_WARMUP] dbPrefetch count=' + count + ' (read-only, 0 IA)');
    if (count < 3) {
      console.log('[MODULE_WARMUP] missing modules=' + (3 - count) + ' — Module en préparation si clic');
    }

    callbacks.onProgress?.({ status: 'done' });
    callbacks.onComplete?.();
  } catch (err) {
    console.warn('[modulePreloadCache] Erreur warmup:', err?.message ?? err);
    if (__DEV__) console.log('[MODULE_WARMUP] dbPrefetch count=0 (error)');
    callbacks.onError?.(err);
  } finally {
    preloadInProgress = false;
    inFlightPromise = null;
  }
  })();

  return inFlightPromise;
}
