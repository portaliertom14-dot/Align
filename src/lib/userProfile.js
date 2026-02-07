import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';
import { getCurrentUser } from '../services/auth';

const PROFILE_STORAGE_KEY = '@align_user_profile';

/**
 * Sauvegarde le profil utilisateur Align
 * Sauvegarde dans AsyncStorage ET dans Supabase pour cohérence
 * @param {Object} profile - Profil Align généré
 */
export async function saveUserProfile(profile) {
  try {
    const profileData = {
      ...profile,
      createdAt: new Date().toISOString(),
    };
    
    // 1. Sauvegarder dans AsyncStorage (cache local)
    await AsyncStorage.setItem(
      PROFILE_STORAGE_KEY,
      JSON.stringify(profileData)
    );
    
    // 2. Synchroniser avec Supabase si l'utilisateur est connecté
    try {
      const user = await getCurrentUser();
      if (user?.id) {
        // Mapper les champs vers le format Supabase user_profiles
        const supabaseData = {
          id: user.id,
          updated_at: new Date().toISOString(),
        };
        
        // Mapper les champs (support des deux formats de nommage)
        if (profile.firstName !== undefined || profile.prenom !== undefined) {
          supabaseData.first_name = profile.firstName || profile.prenom;
        }
        if (profile.lastName !== undefined || profile.nom !== undefined) {
          supabaseData.last_name = profile.lastName || profile.nom;
        }
        if (profile.username !== undefined) {
          supabaseData.username = profile.username;
        }
        if (profile.email !== undefined) {
          supabaseData.email = profile.email;
        }
        if (profile.photoURL !== undefined) {
          supabaseData.avatar_url = profile.photoURL;
        }
        // Ajouter birthdate et schoolLevel pour l'onboarding
        if (profile.birthdate !== undefined || profile.dateNaissance !== undefined) {
          supabaseData.birthdate = profile.birthdate || profile.dateNaissance;
        }
        if (profile.schoolLevel !== undefined) {
          supabaseData.school_level = profile.schoolLevel;
        }
        
        await supabase
          .from('user_profiles')
          .upsert(supabaseData, { onConflict: 'id' });
      }
    } catch (syncError) {
      console.warn('[userProfile] Erreur sync Supabase (non bloquant):', syncError);
    }
    
    return true;
  } catch (error) {
    console.error('Erreur lors de la sauvegarde du profil:', error);
    return false;
  }
}

/**
 * Récupère le profil utilisateur Align
 * Priorité : Supabase > AsyncStorage (pour avoir les données onboarding)
 * @returns {Object|null} Profil sauvegardé ou null
 */
export async function getUserProfile() {
  try {
    // 1. Essayer de récupérer depuis Supabase (source de vérité pour onboarding)
    try {
      const user = await getCurrentUser();
      if (user?.id) {
        const { data: supabaseProfile, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();
        
        if (!error && supabaseProfile) {
          // Convertir le format Supabase vers le format local
          const profile = {
            firstName: supabaseProfile.first_name || supabaseProfile.prenom,
            lastName: supabaseProfile.last_name || supabaseProfile.nom,
            prenom: supabaseProfile.first_name || supabaseProfile.prenom,
            nom: supabaseProfile.last_name || supabaseProfile.nom,
            username: supabaseProfile.username,
            nomUtilisateur: supabaseProfile.username,
            email: supabaseProfile.email,
            birthdate: supabaseProfile.birthdate,
            dateNaissance: supabaseProfile.birthdate,
            schoolLevel: supabaseProfile.school_level,
            photoURL: supabaseProfile.avatar_url,
            onboardingCompleted: supabaseProfile.onboarding_completed,
            first_name_last_changed_at: supabaseProfile.first_name_last_changed_at,
            username_last_changed_at: supabaseProfile.username_last_changed_at,
            referralCode: supabaseProfile.referral_code,
            modulesCompleted: supabaseProfile.modules_completed ?? 0,
            favoriteSector: supabaseProfile.favorite_sector,
            favoriteJob: supabaseProfile.favorite_job,
          };
          
          // Mettre à jour le cache local
          await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
          
          return profile;
        }
      }
    } catch (supabaseError) {
      console.warn('[userProfile] Erreur Supabase, fallback AsyncStorage:', supabaseError);
    }
    
    // 2. Fallback vers AsyncStorage
    const profileJson = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
    if (profileJson) {
      const cached = JSON.parse(profileJson);
      return cached;
    }
    
    return null;
  } catch (error) {
    console.error('Erreur lors de la récupération du profil:', error);
    return null;
  }
}

/**
 * Supprime le profil utilisateur
 */
export async function clearUserProfile() {
  try {
    await AsyncStorage.removeItem(PROFILE_STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Erreur lors de la suppression du profil:', error);
    return false;
  }
}

/**
 * Vérifie si un profil existe
 */
export async function hasUserProfile() {
  const profile = await getUserProfile();
  return profile !== null;
}

const COOLDOWN_DAYS = 30;

/**
 * Retourne le nombre de jours restants avant de pouvoir modifier un champ (0 = modifiable)
 * @param {string|null} lastChangedAt - ISO date string (first_name_last_changed_at ou username_last_changed_at)
 * @returns {{ daysLeft: number, modifiable: boolean }}
 */
export function getCooldownDaysLeft(lastChangedAt) {
  if (!lastChangedAt) return { daysLeft: 0, modifiable: true };
  const changed = new Date(lastChangedAt).getTime();
  const now = Date.now();
  const elapsed = (now - changed) / (1000 * 60 * 60 * 24);
  const daysLeft = Math.ceil(COOLDOWN_DAYS - elapsed);
  return { daysLeft: Math.max(0, daysLeft), modifiable: daysLeft <= 0 };
}

/**
 * Génère ou récupère le referral_code du profil (appel RPC ensure_referral_code)
 * @returns {Promise<string|null>}
 */
export async function ensureReferralCode() {
  try {
    const user = await getCurrentUser();
    if (!user?.id) return null;
    const { data, error } = await supabase.rpc('ensure_referral_code');
    if (error) {
      console.warn('[userProfile] ensure_referral_code error:', error);
      return null;
    }
    return data || null;
  } catch (e) {
    console.warn('[userProfile] ensureReferralCode:', e);
    return null;
  }
}

/**
 * S'assure qu'un profil existe avec first_name et username non vides (fallbacks).
 * À appeler au chargement de l'écran Profil si le profil est absent ou incomplet.
 * @returns {Promise<Object|null>} Profil après upsert/refetch
 */
export async function ensureProfileWithDefaults() {
  try {
    const user = await getCurrentUser();
    if (!user?.id) return null;
    const { data: existing } = await supabase
      .from('user_profiles')
      .select('id, first_name, username')
      .eq('id', user.id)
      .maybeSingle();
    const first_name = (existing?.first_name || '').trim() || 'Utilisateur';
    const username = (existing?.username || '').trim() || ('user_' + user.id.replace(/-/g, '').slice(0, 8));
    const needsUpsert = !existing || !(existing.first_name || '').trim() || !(existing.username || '').trim();
    if (needsUpsert) {
      await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          first_name,
          username,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
    }
    const profile = await getUserProfile();
    return profile;
  } catch (e) {
    console.warn('[userProfile] ensureProfileWithDefaults:', e);
    return getUserProfile();
  }
}

const MIME_TO_EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/webp': 'webp' };
const ALLOWED_EXT = new Set(['png', 'jpg', 'jpeg', 'webp']);

function getExtensionAndBlobFromUri(localUri) {
  if (typeof localUri !== 'string' || !localUri) return { ext: 'jpg', blob: null };
  if (localUri.startsWith('data:')) {
    const match = localUri.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return { ext: 'jpg', blob: null };
    const mime = (match[1] || '').toLowerCase().trim();
    const ext = MIME_TO_EXT[mime] || 'jpg';
    try {
      const binary = atob(match[2]);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: mime });
      return { ext, blob };
    } catch (e) {
      return { ext: 'jpg', blob: null };
    }
  }
  const extRaw = localUri.split('.').pop()?.toLowerCase()?.replace(/\?.*$/, '') || 'jpg';
  const ext = ALLOWED_EXT.has(extRaw) ? extRaw : 'jpg';
  return { ext, blob: null };
}

/**
 * Upload une image (uri) vers le bucket avatars et met à jour avatar_url du profil.
 * Gère les data URIs (web) et les file/asset URIs (native).
 * @param {string} localUri - URI locale (ex. asset, file, ou data:image/png;base64,...)
 * @returns {Promise<{ success: boolean, avatarUrl?: string, error?: string }>}
 */
export async function uploadAvatar(localUri) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) return { success: false, error: 'non_authentifie' };
    const { ext, blob: dataUriBlob } = getExtensionAndBlobFromUri(localUri);
    const path = `${user.id}/avatar.${ext}`;
    let blob = dataUriBlob;
    if (!blob) {
      const response = await fetch(localUri);
      if (!response.ok) return { success: false, error: 'Load failed' };
      blob = await response.blob();
    }
    if (!blob) return { success: false, error: 'Impossible de lire l’image' };
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, blob, { upsert: true, contentType: blob.type || 'image/jpeg' });
    if (uploadError) {
      console.warn('[userProfile] uploadAvatar:', uploadError);
      return { success: false, error: uploadError.message };
    }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
    const avatarUrl = urlData?.publicUrl || null;
    if (avatarUrl) {
      await supabase
        .from('user_profiles')
        .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
        .eq('id', user.id);
    }
    return { success: true, avatarUrl };
  } catch (e) {
    console.warn('[userProfile] uploadAvatar:', e);
    return { success: false, error: e?.message || 'erreur' };
  }
}

/**
 * Met à jour prénom et/ou username via RPC (cooldown 30j strict côté serveur)
 * @param {{ firstName?: string, username?: string }} payload
 * @returns {Promise<{ success: boolean, error?: string, field?: string }>}
 */
export async function updateProfileFieldsWithCooldown(payload) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) return { success: false, error: 'non_authentifie' };
    const { data, error } = await supabase.rpc('update_profile_fields', {
      p_first_name: payload.firstName ?? null,
      p_username: payload.username ?? null,
    });
    if (error) {
      console.warn('[userProfile] update_profile_fields error:', error);
      return { success: false, error: error.message };
    }
    const result = data || {};
    if (result.success === false) {
      return {
        success: false,
        error: result.error || 'erreur',
        field: result.field || null,
      };
    }
    return { success: true };
  } catch (e) {
    console.warn('[userProfile] updateProfileFieldsWithCooldown:', e);
    return { success: false, error: e?.message || 'erreur' };
  }
}













