/**
 * MODULE_WARMUP — SELECT DB + cache. Si modules manquants => seed (generate-feed-module) puis refetch.
 */

import { getModuleFromDBOrCache, seedAllModulesIfNeeded } from '../services/aiModuleService';

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
export async function preloadModules(secteurId, metierId, metierKey, level, chapterId = 1, callbacks = {}) {
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
    if (__DEV__) console.log('[MODULE_WARMUP] started secteurId=' + secteurId + ' metierId=' + (metierId || 'null') + ' metierKey=' + (metierKey || 'null'));

    callbacks.onProgress?.({ status: 'start' });

    const hasMetier = !!(metierId || (metierKey && metierKey.trim()));
    const configs = [
      hasMetier ? { chapterId, moduleIndex: 0, moduleType: 'mini_simulation_metier' } : null,
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
    const missing = 3 - count;
    if (missing > 0) {
      console.log('[MODULE_WARMUP] missing modules=' + missing + ' — Module en préparation si clic');
      const requestId = `warmup-${Date.now()}`;
      try {
        console.log('[MODULE_WARMUP] GENERATE_START requestId=' + requestId + ' missing=' + missing);
        const seedResult = await seedAllModulesIfNeeded(secteurId, metierId, metierKey || null, level || 1, 'modulePreloadCache');
        if (seedResult?.done) {
          console.log('[MODULE_WARMUP] GENERATE_OK requestId=' + requestId + ' inserted=' + (seedResult.generatedCount ?? 0));
        } else {
          console.log('[MODULE_WARMUP] GENERATE_OK requestId=' + requestId + ' reason=' + (seedResult?.reason ?? 'none'));
        }
        const refetchResults = await Promise.allSettled(
          configs.map((cfg) => (cfg ? getModuleFromDBOrCache(cfg.chapterId, cfg.moduleIndex, cfg.moduleType) : Promise.resolve(null)))
        );
        let refetchCount = 0;
        refetchResults.forEach((res, i) => {
          if (res.status === 'fulfilled' && res.value) {
            localCache[typeKeys[i]] = res.value;
            refetchCount++;
          }
        });
        console.log('[MODULE_WARMUP] REFETCH_OK requestId=' + requestId + ' count=' + refetchCount);
      } catch (genErr) {
        const status = genErr?.status ?? genErr?.context?.status;
        console.log('[MODULE_WARMUP] GENERATE_ERROR requestId=' + requestId + ' status=' + (status ?? '') + ' error=' + (genErr?.message ?? genErr));
        callbacks.onError?.(genErr);
      }
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
