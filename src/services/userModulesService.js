/**
 * Lecture des modules V2 (user_modules) — status ready | generating | error.
 * user_modules = SEULE source de vérité pour l'ouverture des modules.
 */

import { supabase } from './supabase';
import { getCurrentUser } from './auth';
import { getUserProgress } from '../lib/userProgressSupabase';

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

/**
 * Seed user_modules via l'edge seed-modules si besoin.
 * Appelé après setActiveMetier, au login, ou au clic module quand (chapterId, moduleIndex) n'a pas de ligne.
 * @param {string} userId
 * @param {{ chapterId?: number, moduleIndex?: number }} [options] - si fourni, demande le seed pour ce chapitre/module (création ligne manquante).
 * @returns {Promise<{ triggered: boolean }>}
 */
export async function ensureSeedModules(userId, options = {}) {
  if (!userId) return { triggered: false };
  const { chapterId, moduleIndex } = options;
  const requestChapter = typeof chapterId === 'number' && chapterId >= 1;
  try {
    if (!requestChapter) {
      const [profileRes, countRes] = await Promise.all([
        supabase.from('user_profiles').select('ai_seed_completed').eq('id', userId).maybeSingle(),
        supabase.from('user_modules').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      ]);
      const profile = profileRes?.data ?? null;
      const count = countRes?.count ?? 0;
      const aiSeedCompleted = profile?.ai_seed_completed === true;
      const hasModules = count > 0;
      if (aiSeedCompleted && hasModules) {
        console.log('[SEED] skip ai_seed_completed=true and user_modules count=' + count);
        return { triggered: false };
      }
    }
    const progress = await getUserProgress(false).catch(() => null);
    const secteurId = progress?.activeDirection || 'ingenierie_tech';
    const metierKey = progress?.activeMetierKey ?? null;
    const metierTitle = progress?.activeMetier ?? null;
    console.log('[SEED] start userId=' + userId.slice(0, 8) + ' secteurId=' + secteurId + (requestChapter ? ' chapterId=' + chapterId + ' moduleIndex=' + moduleIndex : ''));
    const body = { userId, secteurId, metierKey: metierKey || null, metierTitle: metierTitle || null };
    if (requestChapter) {
      body.chapterId = chapterId;
      body.moduleIndex = typeof moduleIndex === 'number' ? moduleIndex : 0;
    }
    await supabase.functions.invoke('seed-modules', { body });
    console.log('[SEED] end (fire-and-forget)');
    return { triggered: true };
  } catch (e) {
    console.log('[SEED] error', e?.message ?? e);
    return { triggered: false };
  }
}
