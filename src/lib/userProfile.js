import AsyncStorage from '@react-native-async-storage/async-storage';

const PROFILE_STORAGE_KEY = '@align_user_profile';

/**
 * Sauvegarde le profil utilisateur Align
 * @param {Object} profile - Profil Align généré
 */
export async function saveUserProfile(profile) {
  try {
    const profileData = {
      ...profile,
      createdAt: new Date().toISOString(),
    };
    
    await AsyncStorage.setItem(
      PROFILE_STORAGE_KEY,
      JSON.stringify(profileData)
    );
    
    return true;
  } catch (error) {
    console.error('Erreur lors de la sauvegarde du profil:', error);
    return false;
  }
}

/**
 * Récupère le profil utilisateur Align
 * @returns {Object|null} Profil sauvegardé ou null
 */
export async function getUserProfile() {
  try {
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













