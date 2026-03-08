/**
 * Lecture des modules V2 (user_modules) — status ready | generating | error.
 * user_modules = SEULE source de vérité pour l'ouverture des modules.
 */

import { supabase } from './supabase';
import { getCurrentUser } from './auth';
import { getUserProgress } from '../lib/userProgressSupabase';

/**
 * Récupère les 3 modules (module_index 0, 1, 2) d'un chapitre pour l'utilisateur courant.
 * @param {number} chapterId
 * @returns {Promise<Array<{ status: string, payload: object|null, error_message: string|null }>>} tableau [index 0, 1, 2]
 */
export async function getModulesStatusForChapter(chapterId) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) return [null, null, null];

    const { data: rows, error } = await supabase
      .from('user_modules')
      .select('module_index, status, payload, error_message')
      .eq('user_id', user.id)
      .eq('chapter_id', Number(chapterId))
      .in('module_index', [0, 1, 2]);

    if (error) {
      if (__DEV__) console.warn('[user_modules] getModulesStatusForChapter error', error?.message);
      return [null, null, null];
    }

    const byIndex = {};
    (rows || []).forEach((r) => {
      byIndex[r.module_index] = {
        status: r.status ?? 'pending',
        payload: r.payload ?? null,
        error_message: r.error_message ?? null,
      };
    });
    return [
      byIndex[0] || { status: 'pending', payload: null, error_message: null },
      byIndex[1] || { status: 'pending', payload: null, error_message: null },
      byIndex[2] || { status: 'pending', payload: null, error_message: null },
    ];
  } catch (e) {
    if (__DEV__) console.warn('[user_modules] getModulesStatusForChapter exception', e?.message);
    return [null, null, null];
  }
}

/**
 * Récupère le module pour (chapterId, moduleIndex) depuis user_modules.
 * @returns { Promise<{ status: 'ready'|'generating'|'error', payload: object|null, error_message: string|null }|null> }
 */
export async function getModuleFromUserModules(chapterId, moduleIndex) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) return null;

    const { data, error } = await supabase
      .from('user_modules')
      .select('status, payload, error_message')
      .eq('user_id', user.id)
      .eq('chapter_id', Number(chapterId))
      .eq('module_index', Number(moduleIndex))
      .maybeSingle();

    if (error) {
      if (__DEV__) console.warn('[user_modules] getModuleFromUserModules error', error?.message);
      return null;
    }
    if (!data) return { status: 'generating', payload: null, error_message: null };
    return {
      status: data.status ?? 'generating',
      payload: data.payload ?? null,
      error_message: data.error_message ?? null,
    };
  } catch (e) {
    if (__DEV__) console.warn('[user_modules] getModuleFromUserModules exception', e?.message);
    return null;
  }
}

/**
 * Appelle l'edge retry-module pour regénérer un module en erreur.
 * @param { number } chapterId
 * @param { number } moduleIndex
 * @param { string } secteurId
 * @param { string|null } metierKey
 * @param { string|null } metierTitle
 */
export async function retryModuleGeneration(chapterId, moduleIndex, secteurId, metierKey, metierTitle) {
  const user = await getCurrentUser();
  if (!user?.id) return { ok: false };
  const body = {
    userId: user.id,
    chapterId: Number(chapterId),
    moduleIndex: Number(moduleIndex),
    secteurId: secteurId || 'ingenierie_tech',
    metierKey: metierKey || null,
    metierTitle: metierTitle || null,
  };
  const { data } = await supabase.functions.invoke('retry-module', { body }).catch(() => ({ data: null }));
  return data ?? { ok: false };
}

let ensureSeedInFlight = false;
let lastSeededMetierKey = null;

/**
 * Force-release du lock inflight (à appeler avant re-seed après changement de métier pour éviter SEED_SKIPPED_INFLIGHT).
 */
export function releaseSeedLock() {
  ensureSeedInFlight = false;
  if (__DEV__) console.log('[SEED] lock released');
}

/**
 * Remet en pending les lignes mini_simulation_metier (module_index 0) pour que le seed les regénère avec le nouveau métier.
 * À appeler avant ensureSeedModules après un changement de métier.
 * @param {string} userId
 * @returns {Promise<{ ok: boolean }>}
 */
export async function invalidateMetierModules(userId) {
  if (!userId) return { ok: false };
  try {
    const { error } = await supabase
      .from('user_modules')
      .update({ status: 'pending', payload: null, error_message: null })
      .eq('user_id', userId)
      .eq('module_index', 0);
    if (error) {
      if (__DEV__) console.warn('[user_modules] invalidateMetierModules error', error?.message);
      return { ok: false };
    }
    if (__DEV__) console.log('[user_modules] invalidateMetierModules done (module_index=0 → pending)');
    return { ok: true };
  } catch (e) {
    if (__DEV__) console.warn('[user_modules] invalidateMetierModules exception', e?.message ?? e);
    return { ok: false };
  }
}

/**
 * Seed user_modules via l'edge seed-modules si besoin.
 * Appelé après setActiveMetier, au login, ou au clic module quand (chapterId, moduleIndex) n'a pas de ligne.
 * @param {string} userId
 * @param {{ chapterId?: number, moduleIndex?: number, metierKey?: string|null, metierTitle?: string|null }} [options] - si fourni, demande le seed pour ce chapitre/module ; metierKey/metierTitle transmis au parcours (prioritaires sur progress).
 * @returns {Promise<{ triggered: boolean }>}
 */
function normalizeMetierKeyForCompare(v) {
  if (v == null) return null;
  const s = typeof v === 'string' ? v.trim() : String(v);
  return s.length > 0 ? s : null;
}

export async function ensureSeedModules(userId, options = {}) {
  if (!userId) return { triggered: false };
  if (ensureSeedInFlight) {
    if (__DEV__) console.log('[SEED_SKIPPED_INFLIGHT]');
    return { triggered: false };
  }
  const { chapterId, moduleIndex, metierKey: optMetierKey, metierTitle: optMetierTitle } = options;
  const requestChapter = typeof chapterId === 'number' && chapterId >= 1;
  const progress = await getUserProgress(false).catch(() => null);
  const secteurId = progress?.activeDirection || 'ingenierie_tech';
  const metierKey = optMetierKey != null ? optMetierKey : (progress?.activeMetierKey ?? null);
  const metierTitle = optMetierTitle != null ? optMetierTitle : (progress?.activeMetier ?? null);
  const metierKeyNorm = normalizeMetierKeyForCompare(metierKey);
  if (lastSeededMetierKey !== null && lastSeededMetierKey === metierKeyNorm) {
    if (__DEV__) console.log('[SEED_SKIPPED_SAME_METIER]', { metierKey: (metierKeyNorm || '').slice(0, 24) });
    return { triggered: false };
  }
  ensureSeedInFlight = true;
  try {
    if (__DEV__) console.log('[SEED_RUN_ONCE]', { userId: userId.slice(0, 8), secteurId, requestChapter: !!requestChapter, hasMetier: !!(metierKey || metierTitle) });
    console.log('[SEED] start userId=' + userId.slice(0, 8) + ' secteurId=' + secteurId + (requestChapter ? ' chapterId=' + chapterId + ' moduleIndex=' + moduleIndex : '') + (metierKey || metierTitle ? ' metier=' + (metierTitle || metierKey || '').slice(0, 30) : ''));
    const body = { userId, secteurId, metierKey: metierKey || null, metierTitle: metierTitle || null };
    if (requestChapter) {
      body.chapterId = chapterId;
      body.moduleIndex = typeof moduleIndex === 'number' ? moduleIndex : 0;
    }
    await supabase.functions.invoke('seed-modules', { body });
    lastSeededMetierKey = metierKeyNorm;
    console.log('[SEED] end');
    return { triggered: true };
  } catch (e) {
    console.log('[SEED] error', e?.message ?? e);
    return { triggered: false };
  } finally {
    ensureSeedInFlight = false;
  }
}
