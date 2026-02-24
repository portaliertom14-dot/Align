/**
 * Service d'export de données utilisateur
 * Permet à l'utilisateur de télécharger toutes ses données personnelles conformément au RGPD
 */

import { Platform, Alert, Share } from 'react-native';
import { getCurrentUser } from './auth';
import { getUserProfile } from '../lib/userProfile';
import { getUserProgress } from '../lib/userProgressSupabase';
import { supabase } from './supabase';

/**
 * Récupère toutes les données utilisateur depuis Supabase
 * @returns {Promise<Object|null>} Toutes les données utilisateur ou null en cas d'erreur
 */
export async function getAllUserData() {
  try {
    
    const user = await getCurrentUser();
    
    
    if (!user) {
      throw new Error('Utilisateur non connecté');
    }

    // Récupérer les données depuis différentes sources
    
    const [profile, progress, userProfileFromDB, quizResponses, scores] = await Promise.all([
      // Profil utilisateur (depuis AsyncStorage/cache)
      getUserProfile(true).then(prof => {
        return prof;
      }).catch(err => {
        return null;
      }),
      
      // Progression utilisateur
      getUserProgress().then(prog => {
        return prog;
      }).catch(err => {
        return null;
      }),
      
      // Profil utilisateur depuis Supabase (pour les données de base)
      supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error && error.code !== 'PGRST116' && __DEV__) console.error('[dataExport] Profil:', error?.message);
          return data;
        })
        .catch(() => null),
      
      // Réponses aux quiz (plusieurs lignes possibles par user)
      supabase
        .from('quiz_responses')
        .select('*')
        .eq('user_id', user.id)
        .then(({ data, error }) => {
          if (error && __DEV__) console.error('[dataExport] Quiz:', error?.message);
          return error ? null : (data || []);
        })
        .catch(() => null),
      
      // Scores
      supabase
        .from('scores')
        .select('*')
        .eq('user_id', user.id)
        .then(({ data, error }) => {
          if (error && __DEV__) console.error('[dataExport] Scores:', error?.message);
          return error ? null : (data || []);
        })
        .catch(() => null),
    ]);

    const allData = {
      exportDate: new Date().toISOString(),
      userId: user.id,
      email: user.email,
      userMetadata: user.user_metadata || {},
      appMetadata: user.app_metadata || {},
      profile: profile || null,
      profileFromDB: userProfileFromDB || null,
      progress: progress || null,
      quizResponses: quizResponses || null,
      scores: scores || null,
      localData: {
        // Données stockées localement si nécessaire
        note: 'Les données stockées localement sur votre appareil peuvent inclure des préférences de cache.',
      },
    };
    

    return allData;
  } catch (error) {
    if (__DEV__) console.error('[dataExport]', error?.message ?? error);
    throw error;
  }
}

/**
 * Télécharge les données utilisateur en fichier JSON
 * Sur Web : télécharge automatiquement un fichier JSON
 * Sur Mobile : copie dans le presse-papiers et affiche les données
 * @returns {Promise<boolean>} true si succès, false sinon
 */
export async function downloadUserData() {
  try {
    
    const userData = await getAllUserData();
    
    
    // Convertir en JSON formaté
    
    const jsonData = JSON.stringify(userData, null, 2);
    
    
    // Créer un nom de fichier avec timestamp
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const filename = `align-donnees-${timestamp}.json`;
    
    
    if (Platform.OS === 'web') {
      // Sur Web : créer un blob et télécharger
      
      try {
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        
        return true;
      } catch (webError) {
        throw webError;
      }
    } else {
      // Mobile : ne jamais logger les données sensibles. Proposer partage si disponible.
      try {
        await Share.share({
          message: jsonData,
          title: filename,
        });
      } catch (_) {
        Alert.alert(
          'Données exportées',
          'Vos données ont été préparées. Utilisez la fonction de partage pour les enregistrer ou les envoyer par email.'
        );
      }
      return true;
    }
  } catch (error) {
    if (__DEV__) console.error('[dataExport]', error?.message ?? error);
    throw error;
  }
}
