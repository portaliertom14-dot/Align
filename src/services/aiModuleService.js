/**
 * Service centralisé modules IA
 * - getModuleFromDB: READ ONLY, SELECT strict, ZÉRO invoke
 * - getModuleFromDBOrCache: cache puis getModuleFromDB, si absent return null (JAMAIS d'IA)
 * - createModuleWithAI: SEUL endroit qui appelle l'Edge Function (seed + getOrCreateModule / Regénérer)
 * - getOrCreateModule: cache / DB puis createModuleWithAI si absent
 * - seedAllModulesIfNeeded: ONE-SHOT fin onboarding, utilise createModuleWithAI si module absent
 */

import { supabase } from './supabase';
import { getCurrentUser } from './auth';
import { normalizeSecteurIdToV16 } from '../data/serieData';
import { MODULE_ORDER } from '../data/chapters';

const CACHE_KEY = (userId, chapterId, moduleIndex, moduleType) =>
  `${userId}:${chapterId}:${moduleIndex}:${moduleType}`;

const memoryCache = new Map();

/**
 * READ ONLY — SELECT strict (user_id + chapter_id + module_index + module_type).
 * ZÉRO invoke Edge Function. Retourne null si absent.
 */
export async function getModuleFromDB(chapterId, moduleIndex, moduleType) {
  if (!MODULE_ORDER.includes(moduleType)) return null;

  const user = await getCurrentUser();
  if (!user?.id) return null;

  const { data: row, error } = await supabase
    .from('ai_modules')
    .select('payload_json')
    .eq('user_id', user.id)
    .eq('chapter_id', chapterId)
    .eq('module_index', moduleIndex)
    .eq('module_type', moduleType)
    .maybeSingle();

  if (error) {
    if (__DEV__) console.warn('[AI_MODULE] getModuleFromDB error', { chapterId, moduleIndex, moduleType, error: error?.message });
    return null;
  }

  if (!row?.payload_json) return null;

  const payload = typeof row.payload_json === 'string'
    ? JSON.parse(row.payload_json)
    : row.payload_json;
  return payload;
}

/**
 * READ ONLY — cache puis getModuleFromDB. Si absent => return null.
 * NE GÉNÈRE JAMAIS. Utilisé par: MODULE_WARMUP, handleStartModule (après onboarding).
 */
export async function getModuleFromDBOrCache(chapterId, moduleIndex, moduleType) {
  if (!MODULE_ORDER.includes(moduleType)) return null;

  const user = await getCurrentUser();
  if (!user?.id) return null;

  const cacheKey = CACHE_KEY(user.id, chapterId, moduleIndex, moduleType);

  if (memoryCache.has(cacheKey)) {
    if (__DEV__) console.log('[AI_MODULE] cacheHit', { chapterId, moduleIndex, moduleType });
    return memoryCache.get(cacheKey);
  }

  const payload = await getModuleFromDB(chapterId, moduleIndex, moduleType);
  if (payload) {
    memoryCache.set(cacheKey, payload);
    if (__DEV__) console.log('[AI_MODULE] dbHit', { chapterId, moduleIndex, moduleType });
  }
  return payload ?? null;
}

/**
 * SEUL endroit qui appelle l'Edge Function (IA).
 * Log explicite AI_CALL_REASON pour tracer tout appel IA.
 */
async function createModuleWithAI(opts, reason) {
  const {
    chapterId = 1,
    moduleIndex = 0,
    moduleType,
    secteurId = 'ingenierie_tech',
    metierId = null,
    metierKey = null,
    level = 1,
    forceRegenerate = false,
  } = opts;

  const user = await getCurrentUser();
  if (!user?.id) return null;

  if (moduleType === 'mini_simulation_metier' && !hasValidMetier({ metierId, metierKey })) {
    console.log('[AI_MODULE] SKIP mini_simulation_metier (missing metierId/metierKey)', { metierId: metierId ?? 'null', metierKey: metierKey ?? 'null', fallbackType: 'apprentissage_mindset' });
    return null;
  }

  const cacheKey = CACHE_KEY(user.id, chapterId, moduleIndex, moduleType);

  if (forceRegenerate) {
    await supabase
      .from('ai_modules')
      .delete()
      .eq('user_id', user.id)
      .eq('chapter_id', chapterId)
      .eq('module_index', moduleIndex)
      .eq('module_type', moduleType);
    memoryCache.delete(cacheKey);
  }

  console.log('[AI_MODULE] AI_CALL_REASON=' + (reason || 'createModuleWithAI') + ' caller=createModuleWithAI', { chapterId, moduleIndex, moduleType });

  const sectorIdValid = normalizeSecteurIdToV16(secteurId);
  // Edge accepte metierId / metierKey / metierTitle / jobTitle / activeMetierTitle (premier non vide utilisé)
  const body = {
    moduleType,
    sectorId: sectorIdValid,
    level,
  };
  if (metierId && typeof metierId === 'string' && metierId.trim()) {
    body.metierId = metierId.trim();
    body.metierTitle = metierId.trim();
    body.activeMetierTitle = metierId.trim();
  }
  if (metierKey && typeof metierKey === 'string' && metierKey.trim()) body.metierKey = metierKey.trim();
  if (opts.metierTitle && typeof opts.metierTitle === 'string' && opts.metierTitle.trim()) body.metierTitle = opts.metierTitle.trim();
  if (opts.jobTitle && typeof opts.jobTitle === 'string' && opts.jobTitle.trim()) body.jobTitle = opts.jobTitle.trim();
  if (opts.activeMetierTitle && typeof opts.activeMetierTitle === 'string' && opts.activeMetierTitle.trim()) body.activeMetierTitle = opts.activeMetierTitle.trim();

  const { data, error } = await supabase.functions.invoke('generate-feed-module', { body });

  if (error) {
    console.error('[AI_MODULE] Edge Function error:', error?.message ?? error);
    return null;
  }

  if (!data || data.source === 'disabled' || data.source === 'invalid' || data.source === 'error') {
    console.warn('[AI_MODULE] génération échouée:', data?.error ?? data?.source);
    return null;
  }

  const payload = typeof data === 'object' && !Array.isArray(data) ? data : null;
  if (!payload || !payload.items) {
    console.warn('[AI_MODULE] payload invalide');
    return null;
  }

  const { error: insertErr } = await supabase
    .from('ai_modules')
    .upsert(
      {
        user_id: user.id,
        chapter_id: chapterId,
        module_index: moduleIndex,
        module_type: moduleType,
        payload_json: payload,
        version: 1,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: ['user_id', 'chapter_id', 'module_index', 'module_type'],
        ignoreDuplicates: false,
      }
    );

  if (insertErr) console.warn('[AI_MODULE] insert error:', insertErr?.message);

  memoryCache.set(cacheKey, payload);
  return payload;
}

/**
 * Cache / DB puis createModuleWithAI si absent.
 * Utilisé par: handleStartModule (si !hasCompletedOnboarding), bouton Regénérer.
 */
export async function getOrCreateModule(opts = {}) {
  const { forceRegenerate = false } = opts;
  const chapterId = opts.chapterId ?? 1;
  const moduleIndex = opts.moduleIndex ?? 0;
  const moduleType = opts.moduleType;

  if (!MODULE_ORDER.includes(moduleType)) {
    console.warn('[AI_MODULE] moduleType invalide:', moduleType);
    return null;
  }

  const user = await getCurrentUser();
  if (!user?.id) return null;

  const cacheKey = CACHE_KEY(user.id, chapterId, moduleIndex, moduleType);

  if (!forceRegenerate && memoryCache.has(cacheKey)) {
    if (__DEV__) console.log('[AI_MODULE] cacheHit', { chapterId, moduleIndex, moduleType });
    return memoryCache.get(cacheKey);
  }

  if (!forceRegenerate) {
    const fromDb = await getModuleFromDB(chapterId, moduleIndex, moduleType);
    if (fromDb) {
      memoryCache.set(cacheKey, fromDb);
      if (__DEV__) console.log('[AI_MODULE] dbHit', { chapterId, moduleIndex, moduleType });
      return fromDb;
    }
  }

  if (moduleType === 'mini_simulation_metier' && !hasValidMetier(opts)) {
    console.log('[AI_MODULE] SKIP mini_simulation_metier missing metierId/metierKey', { fallbackType: 'apprentissage_mindset' });
    return getOrCreateModule({
      ...opts,
      moduleType: 'apprentissage_mindset',
      moduleIndex: 1,
    });
  }

  return createModuleWithAI(opts, 'getOrCreateModule');
}

let seedInProgress = false;
let seedPromise = null;

/**
 * Seed ONE-SHOT: ch 1-10 × 3 modules. S'exécute UNIQUEMENT à la fin onboarding (markOnboardingCompleted).
 * NE JAMAIS appeler depuis login / Feed mount.
 */
export async function seedAllModulesIfNeeded(secteurId, metierId, metierKeyOrLevel, levelOrCaller = 1, callerOrUnknown = 'unknown') {
  const user = await getCurrentUser();
  if (!user?.id) return { done: false, reason: 'no_user' };

  // Signature 5 args: (secteurId, metierId, metierKey, level, caller) | 4 args: (secteurId, metierId, level, caller)
  const argc = arguments.length;
  let metierKey = null;
  let level = 1;
  let caller = 'unknown';
  if (argc >= 5) {
    metierKey = typeof metierKeyOrLevel === 'string' ? metierKeyOrLevel.trim() || null : null;
    level = typeof levelOrCaller === 'number' ? levelOrCaller : 1;
    caller = typeof callerOrUnknown === 'string' ? callerOrUnknown : 'unknown';
  } else {
    level = typeof metierKeyOrLevel === 'number' ? metierKeyOrLevel : 1;
    caller = typeof levelOrCaller === 'string' ? levelOrCaller : 'unknown';
  }

  if (seedInProgress && seedPromise) {
    console.log('[SEED] caller=' + caller + ' inProgress=true — reusing promise');
    return seedPromise;
  }

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('onboarding_completed, ai_seed_completed')
    .eq('id', user.id)
    .maybeSingle();

  const onboardingCompleted = profile?.onboarding_completed === true;
  const aiSeedCompleted = profile?.ai_seed_completed === true;

  console.log('[SEED] caller=' + caller + ' onboarding_completed=' + onboardingCompleted + ' ai_seed_completed=' + aiSeedCompleted + ' inProgress=' + seedInProgress + ' profileError=' + (profileError?.message ?? null));

  if (!onboardingCompleted) {
    console.log('[SEED] return reason=onboarding_not_completed');
    return { done: false, reason: 'onboarding_not_completed' };
  }

  if (aiSeedCompleted) {
    console.log('[SEED] return reason=already_completed');
    return { done: true, reason: 'already_completed' };
  }

  seedInProgress = true;
  seedPromise = _runSeed(secteurId, metierId, metierKey, level);
  try {
    const result = await seedPromise;
    return result;
  } finally {
    seedInProgress = false;
    seedPromise = null;
  }
}

async function _runSeed(secteurId, metierId, metierKey, level) {
  const user = await getCurrentUser();
  if (!user?.id) return { done: false, reason: 'no_user' };

  let generatedCount = 0;
  const sectorVal = secteurId || 'ingenierie_tech';
  const metierVal = metierId ?? null;
  const metierKeyVal = metierKey ?? null;
  const levelVal = level || 1;

  console.log('[SEED] started secteurId=' + sectorVal + ' metierId=' + (metierVal || 'null') + ' metierKey=' + (metierKeyVal || 'null'));

  for (let ch = 1; ch <= 10; ch++) {
    for (let idx = 0; idx < 3; idx++) {
      const moduleType = MODULE_ORDER[idx];
      if (moduleType === 'mini_simulation_metier' && !hasValidMetier({ metierId: metierVal, metierKey: metierKeyVal })) {
        console.log('[AI_MODULE] SKIP mini_simulation_metier (missing metierId/metierKey)', { fallbackType: 'apprentissage_mindset' });
        continue;
      }

      const existing = await getModuleFromDB(ch, idx, moduleType);
      if (existing) continue;

      const payload = await createModuleWithAI(
        {
          chapterId: ch,
          moduleIndex: idx,
          moduleType,
          secteurId: sectorVal,
          metierId: metierVal,
          metierKey: metierKeyVal,
          level: levelVal,
        },
        'seed'
      );
      if (payload) generatedCount++;
      if (idx < 2) await new Promise((r) => setTimeout(r, 200));
    }
  }

  const { error: updateErr } = await supabase
    .from('user_profiles')
    .update({ ai_seed_completed: true, updated_at: new Date().toISOString() })
    .eq('id', user.id);

  if (updateErr) {
    console.error('[SEED] UPDATE ai_seed_completed error:', updateErr?.message);
  } else {
    const { data: refetch } = await supabase
      .from('user_profiles')
      .select('ai_seed_completed')
      .eq('id', user.id)
      .maybeSingle();
    console.log('[SEED] after UPDATE ai_seed_completed refetch=', refetch?.ai_seed_completed);
  }

  console.log('[SEED] generatedCount=' + generatedCount);
  return { done: true, reason: 'seeded', generatedCount };
}

export function clearAiModuleCache() {
  memoryCache.clear();
  if (__DEV__) console.log('[AI_MODULE] cache cleared');
}
