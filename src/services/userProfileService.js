/**
 * Service unique pour le profil utilisateur courant (user_profiles).
 * Source de vérité : DB. Cache en mémoire pour affichage instantané (stale-while-revalidate).
 */

import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = (userId) => `@align_user_profile_${userId || 'anon'}`;

let memoryCache = null;
let memoryCacheUserId = null;

/**
 * Retourne le profil en cache (synchrone). À appeler au premier render pour éviter un flash.
 * @returns {{ firstName: string|null, birthdate: string|null }|null}
 */
export function getCachedProfile() {
  return memoryCache;
}

/**
 * Remplit le cache depuis une source déjà chargée (ex. AuthContext après fetch user_profiles).
 * À appeler dès qu'on a une ligne user_profiles pour que ModuleCompletion affiche le prénom au 1er render.
 * @param {string} userId
 * @param {{ firstName?: string|null, birthdate?: string|null }} profile
 */
export function setProfileCache(userId, profile) {
  if (!userId) return;
  memoryCacheUserId = userId;
  const firstName = (profile?.firstName ?? '')
    .toString()
    .trim() || null;
  const newSchoolLevel = profile?.school_level != null ? String(profile.school_level).trim() || null : null;
  const school_level = newSchoolLevel ?? memoryCache?.school_level ?? null;
  memoryCache = {
    firstName: firstName && firstName.toLowerCase() === 'utilisateur' ? null : firstName,
    birthdate: profile?.birthdate ?? memoryCache?.birthdate ?? null,
    email: memoryCache?.email ?? null,
    username: profile?.username ?? memoryCache?.username ?? null,
    school_level,
  };
  if (__DEV__) {
    console.log('[PROFILE_CACHE] school_level final', school_level);
    if (newSchoolLevel === undefined && memoryCache?.school_level != null) {
      console.warn('[PROFILE_CACHE] setProfileCache called without school_level; preserved previous', memoryCache.school_level);
    }
  }
}

/**
 * Récupère le profil de l'utilisateur courant depuis user_profiles.
 * @param {{ force?: boolean }} [opts] - force=true : refetch DB et met à jour le cache. force=false : retourne le cache si dispo + refresh en arrière-plan.
 * @returns {Promise<{ firstName: string|null, birthdate: string|null, ... }>}
 */
export async function getCurrentUserProfile(opts = {}) {
  const { force = false } = opts;
  const { data: { user } } = await supabase.auth.getUser();
  if (__DEV__) console.log('[PROFILE] userId', user?.id ?? null);

  if (!user?.id) {
    memoryCache = null;
    memoryCacheUserId = null;
    return { firstName: null, birthdate: null };
  }

  if (!force && memoryCache && memoryCacheUserId === user.id) {
    if (__DEV__) {
      console.log('[CACHE_HIT] profile');
      console.log('[CACHE_SKIP_FETCH] profile — using memory cache');
      console.log('[PROFILE] loaded (cache)', memoryCache);
      console.log('[TRACK] profile school_level=', memoryCache?.school_level ?? null);
    }
    _refreshProfileInBackground(user.id);
    return memoryCache;
  }

  return _fetchAndCacheProfile(user.id);
}

async function _refreshProfileInBackground(userId) {
  _fetchAndCacheProfile(userId).catch(() => {});
}

async function _fetchAndCacheProfile(userId) {
  try {
    const { data: row, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (__DEV__) {
      console.log('[PROFILE] row', row);
      console.log('[PROFILE_DB] school_level after fetch', row?.school_level ?? null);
    }

    if (error) {
      if (__DEV__) console.warn('[PROFILE] fetch error', error?.message);
      const fallback = await AsyncStorage.getItem(CACHE_KEY(userId)).catch(() => null);
      const parsed = fallback ? JSON.parse(fallback) : null;
      if (parsed) {
        memoryCache = parsed;
        memoryCacheUserId = userId;
        return parsed;
      }
      return { firstName: null, birthdate: null };
    }

    const rawFirst = row?.first_name ?? row?.prenom ?? row?.username ?? null;
    let firstName = (rawFirst != null && typeof rawFirst === 'string') ? rawFirst.trim() || null : null;
    if (firstName && firstName.toLowerCase() === 'utilisateur') {
      firstName = null;
    }
    const birthdate = row?.birthdate != null ? String(row.birthdate) : (row?.date_naissance != null ? String(row.date_naissance) : null);

    const profile = {
      firstName,
      birthdate,
      email: row?.email ?? null,
      username: (row?.username ?? '').toString().trim() || null,
      school_level: row?.school_level != null ? String(row.school_level).trim() || null : null,
    };

    if (__DEV__) {
      if (__DEV__) console.log('[PROFILE] mapped (champs non loggés en prod)');
      console.log('[PROFILE_DB] school_level after fetch', profile?.school_level ?? null);
      console.log('[PROFILE_CACHE] school_level final', profile?.school_level ?? null);
      console.log('[TRACK] profile school_level=', profile?.school_level ?? null);
    }

    memoryCache = profile;
    memoryCacheUserId = userId;
    AsyncStorage.setItem(CACHE_KEY(userId), JSON.stringify(profile)).catch(() => {});

    return profile;
  } catch (e) {
    if (__DEV__) console.warn('[PROFILE] exception', e?.message);
    const fallback = await AsyncStorage.getItem(CACHE_KEY(userId)).catch(() => null);
    const parsed = fallback ? JSON.parse(fallback) : null;
    if (parsed) {
      memoryCache = parsed;
      memoryCacheUserId = userId;
      return parsed;
    }
    return { firstName: null, birthdate: null };
  }
}
