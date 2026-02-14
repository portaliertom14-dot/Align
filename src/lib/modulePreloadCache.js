/**
 * Cache de préchargement des modules IA
 * Génère les 3 modules (mini_simulation_metier, apprentissage_mindset, test_secteur)
 * à l'arrivée sur l'accueil pour éviter le chargement au clic
 */

import {
  wayGenerateModuleMiniSimulationMetier,
  wayGenerateModuleApprentissage,
  wayGenerateModuleTestSecteur,
} from '../services/way';

// Cache en mémoire : { mini_simulation_metier, apprentissage_mindset, test_secteur }
const cache = {
  mini_simulation_metier: null,
  apprentissage_mindset: null,
  test_secteur: null,
};

let preloadInProgress = false;

/**
 * Récupère un module mis en cache (et le retire du cache après utilisation)
 * @param {string} moduleType - mini_simulation_metier | apprentissage_mindset | test_secteur
 * @returns {Object|null} Le module ou null
 */
export function getCachedModule(moduleType) {
  if (!cache[moduleType]) return null;
  const m = cache[moduleType];
  cache[moduleType] = null;
  return m;
}

/**
 * Place un module dans le cache
 */
export function setCachedModule(moduleType, module) {
  cache[moduleType] = module;
}

/**
 * Vérifie si un module est déjà en cache
 */
export function hasCachedModule(moduleType) {
  return !!cache[moduleType];
}

/**
 * Précharge les 3 modules en arrière-plan
 * Génère en parallèle pour réduire le temps total
 * @param {string} secteurId
 * @param {string|null} metierId
 * @param {number} level
 * @param {Object} callbacks - onComplete?, onError?, onProgress?
 */
export async function preloadModules(secteurId, metierId, level, callbacks = {}) {
  if (!secteurId) {
    callbacks.onError?.(new Error('secteurId requis'));
    return;
  }

  if (preloadInProgress) {
    return;
  }

  preloadInProgress = true;
  const levelVal = level || 1;

  try {
    callbacks.onProgress?.({ status: 'start' });

    const tasks = [
      metierId
        ? () => wayGenerateModuleMiniSimulationMetier(secteurId, metierId, levelVal)
        : null,
      () => wayGenerateModuleApprentissage(secteurId, metierId, levelVal),
      () => wayGenerateModuleTestSecteur(secteurId, levelVal),
    ];
    const typeKeys = ['mini_simulation_metier', 'apprentissage_mindset', 'test_secteur'];

    const results = await Promise.allSettled(
      tasks.map((fn) => (fn ? fn() : Promise.resolve(null)))
    );

    results.forEach((result, i) => {
      if (result.status === 'fulfilled' && result.value) {
        cache[typeKeys[i]] = result.value;
      }
    });

    callbacks.onProgress?.({ status: 'done' });
    callbacks.onComplete?.();
  } catch (err) {
    console.warn('[modulePreloadCache] Erreur préchargement:', err?.message ?? err);
    callbacks.onError?.(err);
  } finally {
    preloadInProgress = false;
  }
}
