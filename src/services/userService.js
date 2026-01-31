import { supabase } from './supabase';

/**
 * Service de gestion des utilisateurs
 * Gère l'écriture et la lecture des données utilisateur dans Supabase
 */

/**
 * Crée ou met à jour un profil utilisateur
 * @param {string} userId - ID de l'utilisateur (UUID)
 * @param {object} userData - Données utilisateur { email, birthdate, school_level, professional_project, similar_apps, first_name, last_name, username, onboarding_completed }
 * @returns {Promise<{data: object, error: object}>}
 */
export async function upsertUser(userId, userData) {
  try {
    // Utiliser UPSERT au lieu de INSERT pour éviter les problèmes de duplication
    let resultData = null;
    
    // CRITICAL: Ne pas inclure les valeurs undefined pour éviter d'écraser les données existantes
    const profileData = {
      id: userId,
      updated_at: new Date().toISOString(),
    };
    
    // Ajouter created_at seulement si c'est une nouvelle entrée (sera ignoré sinon)
    profileData.created_at = new Date().toISOString();
    
    // Ajouter chaque champ UNIQUEMENT s'il est défini (non undefined)
    if (userData.email !== undefined) {
      profileData.email = userData.email;
    }
    if (userData.birthdate !== undefined) {
      profileData.birthdate = userData.birthdate;
    }
    if (userData.school_level !== undefined) {
      profileData.school_level = userData.school_level;
    }
    if (userData.onboarding_completed !== undefined) {
      profileData.onboarding_completed = userData.onboarding_completed;
    }
    if (userData.onboarding_step !== undefined) {
      profileData.onboarding_step = userData.onboarding_step;
    }
    if (userData.professional_project !== undefined) {
      profileData.professional_project = userData.professional_project;
    }
    if (userData.similar_apps !== undefined) {
      profileData.similar_apps = userData.similar_apps;
    }
    if (userData.first_name !== undefined) {
      profileData.first_name = userData.first_name;
    }
    if (userData.last_name !== undefined) {
      profileData.last_name = userData.last_name;
    }
    if (userData.username !== undefined) {
      profileData.username = userData.username;
    }
    
    console.log('[upsertUser] Données à sauvegarder:', Object.keys(profileData).filter(k => k !== 'id' && k !== 'created_at' && k !== 'updated_at'));

    // Fonction helper pour l'upsert avec retry (gère la race condition FK)
    const attemptUpsert = async () => {
      return await supabase
        .from('user_profiles')
        .upsert(profileData, {
          onConflict: 'id',
          ignoreDuplicates: false,
        })
        .select()
        .single();
    };

    // Retry avec délai progressif pour gérer la race condition FK (erreur 23503)
    // Le trigger Supabase qui crée l'entrée dans 'users' peut prendre du temps
    const MAX_RETRIES = 5;
    const INITIAL_DELAY = 300; // 300ms
    let { data: upsertData, error: upsertError } = await attemptUpsert();
    
    // Si erreur de clé étrangère, retenter avec délai progressif
    if (upsertError && upsertError.code === '23503') {
      console.log('[upsertUser] FK violation détectée, attente du trigger Supabase...');
      
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const delay = INITIAL_DELAY * Math.pow(2, attempt - 1); // 300, 600, 1200, 2400, 4800ms
        console.log(`[upsertUser] Retry ${attempt}/${MAX_RETRIES} après ${delay}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        
        const result = await attemptUpsert();
        upsertData = result.data;
        upsertError = result.error;
        
        if (!upsertError || upsertError.code !== '23503') {
          if (!upsertError) {
            console.log(`[upsertUser] ✅ Succès après ${attempt} retry(s)`);
          }
          break;
        }
      }
    }
    
    // Si l'erreur indique que les colonnes n'existent pas (PGRST204), essayer sans ces colonnes
    if (upsertError && upsertError.code === 'PGRST204') {
      console.warn('[upsertUser] Colonnes manquantes détectées, tentative sans les nouvelles colonnes');
      
      // Créer un basicProfileData avec seulement les colonnes de base (non undefined)
      const basicProfileData = {
        id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (userData.email !== undefined) basicProfileData.email = userData.email;
      if (userData.birthdate !== undefined) basicProfileData.birthdate = userData.birthdate;
      if (userData.school_level !== undefined) basicProfileData.school_level = userData.school_level;
      if (userData.onboarding_completed !== undefined) basicProfileData.onboarding_completed = userData.onboarding_completed;
      
      const { data: retryData, error: retryError } = await supabase
        .from('user_profiles')
        .upsert(basicProfileData, {
          onConflict: 'id',
          ignoreDuplicates: false,
        })
        .select()
        .single();
      
      if (!retryError) {
        upsertData = retryData;
        upsertError = null;
        console.warn('[upsertUser] Sauvegarde réussie sans les nouvelles colonnes. Veuillez exécuter la migration ADD_ONBOARDING_COLUMNS.sql pour activer toutes les fonctionnalités.');
      } else {
        upsertError = retryError;
      }
    }

    // Gérer les erreurs 406 (RLS) gracieusement
    if (upsertError) {
      if (upsertError.code === 'PGRST406' || upsertError.status === 406) {
        console.warn('[upsertUser] Erreur 406 (RLS) lors de la création du profil:', upsertError.message);
        // Essayer avec INSERT simple si UPSERT échoue à cause de RLS
        const { data: insertData, error: insertError } = await supabase
          .from('user_profiles')
          .insert(profileData)
          .select()
          .single();
        
        if (insertError && insertError.code !== '23505') {
          // Si ce n'est pas une erreur de duplication, retourner l'erreur
          throw insertError;
        }
        
        // Si insert réussit, utiliser ces données
        if (!insertError && insertData) {
          resultData = insertData;
        }
      } else if (upsertError.code === '23505') {
        // Profil existe déjà - essayer de le récupérer
        const { data: existingData, error: getError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .single();
        
        if (!getError && existingData) {
          resultData = existingData;
        } else {
          throw upsertError;
        }
      } else {
        throw upsertError;
      }
    } else {
      resultData = upsertData;
    }

    // Si l'upsert/insert réussit, créer aussi la progression
    // CRITICAL FIX: Ne pas écraser les valeurs existantes (xp, etoiles, niveau) lors de la création du profil
    // Vérifier d'abord si la progression existe déjà
    if (resultData || !upsertError || upsertError?.code === '23505') {
      // CRITICAL FIX: Ne pas créer/réinitialiser la progression lors de la création du profil
      // La progression sera créée automatiquement lors du premier appel à getUserProgress
      // Cela évite d'écraser les valeurs existantes (xp, etoiles) si l'utilisateur a déjà progressé
      // Ne rien faire ici - la progression sera créée à la demande par getUserProgress
    }

    return { data: resultData, error: null };

  } catch (error) {
    console.error('Erreur lors de la sauvegarde de l\'utilisateur:', error);
    return { data: null, error };
  }
}

/**
 * Marque l'onboarding comme complété
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<{data: object, error: object}>}
 */
export async function markOnboardingCompleted(userId) {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'onboarding:', error);
    return { data: null, error };
  }
}

/**
 * Vérifie si l'onboarding est complété
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<boolean>}
 */
export async function isOnboardingCompleted(userId) {
  try {
    const { data, error } = await getUser(userId);
    if (error || !data) {
      return false;
    }
    return data.onboarding_completed === true;
  } catch (error) {
    console.error('Erreur lors de la vérification de l\'onboarding:', error);
    return false;
  }
}

/**
 * Récupère un utilisateur par son ID
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<{data: object, error: object}>}
 */
export async function getUser(userId) {
  try {
    // Utiliser maybeSingle() au lieu de single() pour éviter les erreurs 406 quand aucune ligne n'existe
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle(); // Utilise maybeSingle() pour permettre les résultats vides

    // Gérer gracieusement les erreurs 406 (RLS) et PGRST116 (not found)
    if (error) {
      if (error.code === 'PGRST116') {
        // Profil n'existe pas encore - normal pour nouveau compte
        return { data: null, error: null };
      }
      if (error.code === 'PGRST406' || error.status === 406) {
        // Erreur RLS - profil inaccessible mais peut exister
        console.warn('[getUser] Erreur 406 (RLS) lors de la récupération du profil:', error.message);
        return { data: null, error: null };
      }
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'utilisateur:', error);
    return { data: null, error };
  }
}

/**
 * Récupère la progression de l'utilisateur depuis la DB
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<object>} - Progression de l'utilisateur
 */
export async function getUserProgressFromDB(userId) {
  try {
    // Utiliser maybeSingle() au lieu de single() pour éviter les erreurs 406 quand aucune ligne n'existe
    const { data, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('id', userId)
      .maybeSingle(); // Utilise maybeSingle() pour permettre les résultats vides

    // 🔍 LOGS DE DIAGNOSTIC
    console.log('[getUserProgressFromDB] 🔍 Récupération pour user:', userId?.substring(0, 8) + '...');
    console.log('[getUserProgressFromDB] 📦 Données brutes de Supabase:', {
      hasData: !!data,
      hasError: !!error,
      errorCode: error?.code,
      errorMessage: error?.message,
      xp: data?.xp,
      etoiles: data?.etoiles,
      niveau: data?.niveau,
      current_module_index: data?.current_module_index,
      allKeys: data ? Object.keys(data) : []
    });

    if (error) {
      // Si l'utilisateur n'a pas encore de progression, retourner null (pas un objet par défaut)
      // Cela permet à getUserProgress de détecter que la progression n'existe pas vraiment
      if (error.code === 'PGRST116') {
        console.log('[getUserProgressFromDB] ℹ️ Progression n\'existe pas encore (PGRST116)');
        return null; // CRITICAL FIX: Retourner null au lieu d'un objet par défaut
      }
      throw error;
    }

    // 🔍 VÉRIFICATION EXPLICITE DES COLONNES
    if (data) {
      console.log('[getUserProgressFromDB] ✅ Données récupérées:', {
        xp: data.xp,
        etoiles: data.etoiles,
        niveau: data.niveau,
        xpType: typeof data.xp,
        etoilesType: typeof data.etoiles,
        niveauType: typeof data.niveau,
        xpIsNull: data.xp === null,
        etoilesIsNull: data.etoiles === null,
        niveauIsNull: data.niveau === null
      });
    } else {
      console.log('[getUserProgressFromDB] ℹ️ Aucune donnée retournée (data est null/undefined)');
    }

    // CRITICAL FIX: Retourner null si data est null/undefined (progression n'existe pas)
    // Ne pas retourner un objet par défaut car cela masque l'absence de progression
    return data || null;
  } catch (error) {
    console.error('[getUserProgressFromDB] ❌ Erreur:', error);
    // En cas d'erreur, retourner null pour indiquer que la progression n'a pas pu être récupérée
    // getUserProgress gérera cela en créant la progression initiale si nécessaire
    return null;
  }
}

/**
 * Met à jour la progression de l'utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @param {object} progressData - Données de progression à mettre à jour
 * @returns {Promise<{data: object, error: object}>}
 */
export async function upsertUserProgress(userId, progressData) {
  try {
    // CRITICAL FIX: Ne pas inclure les champs de base s'ils ne sont pas dans progressData
    // Sinon, un update partiel (ex: seulement etoiles) écraserait xp et niveau avec 0
    const baseProgressData = {
      id: userId,
      updated_at: new Date().toISOString(),
    };
    
    // CRITICAL: Ne jamais inclure xp/etoiles/niveau si undefined
    // Si undefined, Supabase utilisera la valeur existante (pas d'écrasement)
    // Seulement inclure si la valeur est explicitement définie ET valide
    
    if (progressData.niveau !== undefined && typeof progressData.niveau === 'number') {
      baseProgressData.niveau = progressData.niveau;
    }
    // Si undefined, NE PAS inclure - Supabase garde la valeur existante
    
    if (progressData.xp !== undefined && typeof progressData.xp === 'number' && progressData.xp >= 0) {
      baseProgressData.xp = progressData.xp;
    }
    // Si xp est undefined, NE PAS l'inclure - Supabase garde la valeur existante
    
    if (progressData.etoiles !== undefined && typeof progressData.etoiles === 'number' && progressData.etoiles >= 0) {
      baseProgressData.etoiles = progressData.etoiles;
    }
    // Si etoiles est undefined, NE PAS l'inclure - Supabase garde la valeur existante
    
    // Colonnes optionnelles qui peuvent ne pas exister encore (à ajouter via migration)
    const optionalColumns = [
      'activeDirection', 'activeSerie', 'activeMetier', 'activeModule',
      'currentChapter', 'currentLesson', 'completedLevels',
      'quizAnswers', 'metierQuizAnswers',
      'current_module_in_chapter', 'completed_modules_in_chapter', 'chapter_history',
      'current_module_index', 'quetes_completes', 'progression_quetes'
    ];
    
    // Ajouter les colonnes optionnelles seulement si elles sont présentes dans progressData
    optionalColumns.forEach(col => {
      if (progressData[col] !== undefined) {
        baseProgressData[col] = progressData[col];
      }
    });
    
    // 🔍 LOGS AVANT L'UPSERT SUPABASE
    console.log('[upsertUserProgress] 🔍 AVANT UPSERT SUPABASE:', {
      userId: userId?.substring(0, 8) + '...',
      baseProgressDataKeys: Object.keys(baseProgressData),
      xp: baseProgressData.xp,
      etoiles: baseProgressData.etoiles,
      niveau: baseProgressData.niveau,
      allFields: baseProgressData
    });
    
    const { data, error } = await supabase
      .from('user_progress')
      .upsert(baseProgressData, {
        onConflict: 'id',
      })
      .select()
      .single();
    
    // 🔍 LOGS APRÈS L'UPSERT SUPABASE
    console.log('[upsertUserProgress] 🔍 APRÈS UPSERT SUPABASE:', {
      hasError: !!error,
      errorCode: error?.code,
      errorMessage: error?.message,
      hasData: !!data,
      dataXP: data?.xp,
      dataEtoiles: data?.etoiles,
      dataNiveau: data?.niveau,
      dataKeys: data ? Object.keys(data) : [],
      xpType: typeof data?.xp,
      etoilesType: typeof data?.etoiles,
      niveauType: typeof data?.niveau,
      baseProgressDataXP: baseProgressData.xp,
      baseProgressDataEtoiles: baseProgressData.etoiles,
      baseProgressDataNiveau: baseProgressData.niveau,
      xpMatches: baseProgressData.xp === data?.xp,
      etoilesMatches: baseProgressData.etoiles === data?.etoiles,
      niveauMatches: baseProgressData.niveau === data?.niveau
    });
    
    // 🔍 VÉRIFICATION CRITIQUE : Si on a envoyé xp/etoiles mais Supabase retourne 0, c'est un problème
    if (!error && data) {
      if (baseProgressData.xp !== undefined && baseProgressData.xp > 0 && data.xp === 0) {
        console.error('[upsertUserProgress] ❌ PROBLÈME: XP envoyé:', baseProgressData.xp, 'mais Supabase retourne:', data.xp);
      }
      if (baseProgressData.etoiles !== undefined && baseProgressData.etoiles > 0 && data.etoiles === 0) {
        console.error('[upsertUserProgress] ❌ PROBLÈME: Étoiles envoyées:', baseProgressData.etoiles, 'mais Supabase retourne:', data.etoiles);
      }
    }

    // Si l'erreur indique que les colonnes n'existent pas (PGRST204), essayer sans ces colonnes
    if (error && error.code === 'PGRST204') {
      console.warn('[upsertUserProgress] Colonnes manquantes détectées, tentative sans les colonnes optionnelles');
      
      // Créer un progressData sans les colonnes optionnelles
      // CRITICAL FIX: Ne pas inclure les champs de base s'ils ne sont pas dans progressData
      const safeProgressData = {
        id: userId,
        updated_at: new Date().toISOString(),
      };
      
      // Ajouter les colonnes de base SEULEMENT si elles sont présentes dans progressData
      if (progressData.niveau !== undefined) {
        safeProgressData.niveau = progressData.niveau;
      }
      if (progressData.xp !== undefined) {
        safeProgressData.xp = progressData.xp;
      }
      if (progressData.etoiles !== undefined) {
        safeProgressData.etoiles = progressData.etoiles;
      }
      
      const { data: retryData, error: retryError } = await supabase
        .from('user_progress')
        .upsert(safeProgressData, {
          onConflict: 'id',
        })
        .select()
        .single();
      
      if (!retryError) {
        console.warn('[upsertUserProgress] Sauvegarde réussie sans les colonnes optionnelles. Veuillez exécuter la migration ADD_USER_PROGRESS_COLUMNS.sql pour activer toutes les fonctionnalités.');
        return { data: retryData, error: null };
      } else {
        return { data: null, error: retryError };
      }
    }

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la progression:', error);
    return { data: null, error };
  }
}

/**
 * Fonction de sauvegarde DIRECTE et SIMPLE de la progression
 * 
 * PRINCIPE : Sauvegarde directement dans Supabase sans logique intermédiaire
 * - Pas de merge complexe
 * - Pas de cache intermédiaire
 * - Vérification immédiate après sauvegarde
 * - Logs détaillés pour le débogage
 * - Gestion explicite des erreurs
 * 
 * @param {string} userId - ID de l'utilisateur
 * @param {Object} progressData - Données de progression au format DB (xp, etoiles, niveau, etc.)
 * @returns {Promise<{success: boolean, error?: string, savedData?: Object, verifiedData?: Object}>}
 */
export async function saveProgressDirect(userId, progressData) {
  try {
    console.log('[saveProgressDirect] 🚀 Début de la sauvegarde directe...');
    console.log('[saveProgressDirect] 📦 Données à sauvegarder:', {
      userId: userId?.substring(0, 8) + '...',
      xp: progressData.xp,
      etoiles: progressData.etoiles,
      niveau: progressData.niveau,
      current_module_index: progressData.current_module_index,
      fieldsCount: Object.keys(progressData).length,
      allFields: Object.keys(progressData)
    });

    // 1. Préparer les données pour Supabase
    const dbData = {
      id: userId,
      updated_at: new Date().toISOString(),
    };

    // Ajouter uniquement les champs qui sont définis
    if (progressData.xp !== undefined) {
      dbData.xp = typeof progressData.xp === 'number' ? progressData.xp : 0;
    }
    if (progressData.etoiles !== undefined) {
      dbData.etoiles = typeof progressData.etoiles === 'number' ? progressData.etoiles : 0;
    }
    if (progressData.niveau !== undefined) {
      dbData.niveau = typeof progressData.niveau === 'number' ? progressData.niveau : 0;
    }
    if (progressData.current_module_index !== undefined) {
      dbData.current_module_index = typeof progressData.current_module_index === 'number' ? progressData.current_module_index : 0;
    }
    
    // Ajouter les autres champs optionnels
    const optionalFields = [
      'activeDirection', 'activeSerie', 'activeMetier', 'activeModule',
      'currentChapter', 'currentLesson', 'completedLevels',
      'quizAnswers', 'metierQuizAnswers',
      'current_module_in_chapter', 'completed_modules_in_chapter', 'chapter_history',
      'quetes_completes', 'progression_quetes'
    ];
    
    optionalFields.forEach(field => {
      if (progressData[field] !== undefined) {
        dbData[field] = progressData[field];
      }
    });

    console.log('[saveProgressDirect] 📤 Envoi à Supabase:', {
      xp: dbData.xp,
      etoiles: dbData.etoiles,
      niveau: dbData.niveau,
      fieldsCount: Object.keys(dbData).length
    });

    // 2. Sauvegarder dans Supabase avec UPSERT
    const { data: savedData, error: saveError } = await supabase
      .from('user_progress')
      .upsert(dbData, {
        onConflict: 'id',
      })
      .select()
      .single();

    if (saveError) {
      console.error('[saveProgressDirect] ❌ Erreur Supabase:', {
        code: saveError.code,
        message: saveError.message,
        details: saveError.details,
        hint: saveError.hint
      });
      return { success: false, error: saveError.message || 'Erreur inconnue' };
    }

    if (!savedData) {
      console.error('[saveProgressDirect] ❌ Aucune donnée retournée par Supabase');
      return { success: false, error: 'Aucune donnée retournée' };
    }

    console.log('[saveProgressDirect] ✅ Données sauvegardées:', {
      xp: savedData.xp,
      etoiles: savedData.etoiles,
      niveau: savedData.niveau,
      current_module_index: savedData.current_module_index
    });

    // 3. VÉRIFICATION IMMÉDIATE : Récupérer pour confirmer
    await new Promise(resolve => setTimeout(resolve, 500)); // Attendre 500ms pour PostgREST
    
    const { data: verifyData, error: verifyError } = await supabase
      .from('user_progress')
      .select('xp, etoiles, niveau, current_module_index')
      .eq('id', userId)
      .single();

    if (verifyError) {
      console.warn('[saveProgressDirect] ⚠️ Erreur lors de la vérification:', verifyError.message);
    } else {
      console.log('[saveProgressDirect] ✅ Vérification réussie:', {
        xp: verifyData.xp,
        etoiles: verifyData.etoiles,
        niveau: verifyData.niveau,
        current_module_index: verifyData.current_module_index
      });

      // Comparer les valeurs sauvegardées avec celles vérifiées
      if (dbData.xp !== undefined && verifyData.xp !== dbData.xp) {
        console.error('[saveProgressDirect] ❌ INCOHÉRENCE XP: Sauvegardé:', dbData.xp, 'Vérifié:', verifyData.xp);
      }
      if (dbData.etoiles !== undefined && verifyData.etoiles !== dbData.etoiles) {
        console.error('[saveProgressDirect] ❌ INCOHÉRENCE ÉTOILES: Sauvegardé:', dbData.etoiles, 'Vérifié:', verifyData.etoiles);
      }
      if (dbData.niveau !== undefined && verifyData.niveau !== dbData.niveau) {
        console.error('[saveProgressDirect] ❌ INCOHÉRENCE NIVEAU: Sauvegardé:', dbData.niveau, 'Vérifié:', verifyData.niveau);
      }
    }

    return { 
      success: true, 
      savedData: savedData,
      verifiedData: verifyData || null
    };
  } catch (error) {
    console.error('[saveProgressDirect] ❌ Erreur inattendue:', error);
    return { success: false, error: error.message || 'Erreur inattendue' };
  }
}

