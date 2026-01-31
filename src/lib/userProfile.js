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
      return JSON.parse(profileJson);
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













