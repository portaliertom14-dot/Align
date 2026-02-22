/**
 * Lecture des modules V2 (user_modules) — status ready | generating | error.
 * Retourne { status, payload, error_message } ou null si table absente / erreur.
 */

import { supabase } from './supabase';
import { getCurrentUser } from './auth';

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
