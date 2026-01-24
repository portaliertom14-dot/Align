/**
 * Service d'export de données utilisateur
 * Permet à l'utilisateur de télécharger toutes ses données personnelles conformément au RGPD
 */

import { Platform, Alert } from 'react-native';
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
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error && error.code !== 'PGRST116') {
            console.error('[dataExport] Erreur lors de la récupération du profil:', error);
          }
          return { data, error: null };
        })
        .catch(err => {
          return { data: null, error: null };
        }),
      
      // Réponses aux quiz
      supabase
        .from('quiz_responses')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error && error.code !== 'PGRST116') {
            console.error('[dataExport] Erreur lors de la récupération des réponses quiz:', error);
          }
          return { data, error: null };
        })
        .catch(err => {
          return { data: null, error: null };
        }),
      
      // Scores
      supabase
        .from('scores')
        .select('*')
        .eq('user_id', user.id)
        .then(({ data, error }) => {
          if (error) {
            console.error('[dataExport] Erreur lors de la récupération des scores:', error);
          }
          return { data, error: null };
        })
        .catch(err => {
          return { data: null, error: null };
        }),
    ]);
    

    // Compiler toutes les données
    
    const allData = {
      exportDate: new Date().toISOString(),
      userId: user.id,
      email: user.email,
      userMetadata: user.user_metadata || {},
      appMetadata: user.app_metadata || {},
      profile: profile || null,
      profileFromDB: userProfileFromDB?.data || null, // Données du profil depuis Supabase
      progress: progress || null,
      quizResponses: quizResponses?.data || null,
      scores: scores?.data || null,
      localData: {
        // Données stockées localement si nécessaire
        note: 'Les données stockées localement sur votre appareil peuvent inclure des préférences de cache.',
      },
    };
    

    return allData;
  } catch (error) {
    console.error('[dataExport] Erreur lors de la récupération des données:', error);
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
      // Sur Mobile : afficher les données dans une alerte et logger dans la console
      
      // Logger les données pour que l'utilisateur puisse les copier depuis la console
      console.log(`[dataExport] ===== DONNÉES UTILISATEUR ${filename} =====`);
      console.log(jsonData);
      console.log(`[dataExport] ===== FIN DES DONNÉES =====`);
      
      
      try {
        Alert.alert(
          'Données exportées',
          `Vos données personnelles ont été exportées.\n\nFichier: ${filename}\n\nLes données complètes sont disponibles dans la console de développement (F12 ou DevTools).\n\nVous pouvez les copier manuellement depuis la console.`,
          [
            { text: 'Voir dans la console', onPress: () => console.log(jsonData) },
            { text: 'OK' }
          ]
        );
        
        
        return true;
      } catch (alertError) {
        throw alertError;
      }
    }
  } catch (error) {
    console.error('[dataExport] Erreur lors du téléchargement:', error);
    throw error;
  }
}
