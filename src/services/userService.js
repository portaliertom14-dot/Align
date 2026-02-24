import { supabase } from './supabase';
import { sanitizeOnboardingStep, ONBOARDING_MAX_STEP } from '../lib/onboardingSteps';
import { setProfileCache } from './userProfileService';

const USERNAME_MIN_LEN = 2;
const USERNAME_MAX_LEN = 50;

/**
 * Normalise le pseudo côté client : trim, espaces → underscore, caractères invalides retirés, longueur min/max.
 * @param {string} raw
 * @returns {string}
 */
export function normaliseUsername(raw) {
  if (raw == null || typeof raw !== 'string') return '';
  let s = raw.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
  if (s.length < USERNAME_MIN_LEN) return '';
  return s.slice(0, USERNAME_MAX_LEN);
}

/**
 * Met à jour uniquement le username sur la row existante. Gère 23505 (déjà pris).
 * @param {string} userId
 * @param {string} username - sera normalisé
 * @returns {Promise<{ success: boolean, error?: 'username_taken' | string }>}
 */
export async function setUsername(userId, username) {
  const normalised = normaliseUsername(username);
  if (!userId || !normalised) return { success: false, error: 'invalid' };
  try {
    const { error } = await supabase
      .from('user_profiles')
      .update({ username: normalised, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) {
      if (error.code === '23505' && /username|unique/i.test(String(error.message || error.details || ''))) {
        if (__DEV__) console.log('[USERNAME_TAKEN]', { userId: userId.slice(0, 8) });
        return { success: false, error: 'username_taken' };
      }
      return { success: false, error: error.message || 'erreur' };
    }
    if (__DEV__) console.log('[USERNAME_WRITE_OK]', { userId: userId.slice(0, 8) });
    return { success: true };
  } catch (e) {
    return { success: false, error: e?.message || 'erreur' };
  }
}

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
    if (!userId) {
      const err = { message: 'userId required' };
      if (__DEV__) console.warn('[upsertUser] ❌ Appel sans userId — pas d’écriture DB');
      return { data: null, error: err };
    }

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
      profileData.onboarding_step = Math.min(ONBOARDING_MAX_STEP, Math.max(1, sanitizeOnboardingStep(userData.onboarding_step)));
    }
    if (userData.professional_project !== undefined) {
      profileData.professional_project = userData.professional_project;
    }
    if (userData.similar_apps !== undefined) {
      profileData.similar_apps = userData.similar_apps;
    }
    // Ne pas écraser avec des chaînes vides (persistance onboarding)
    if (userData.first_name !== undefined && userData.first_name != null && String(userData.first_name).trim() !== '') {
      profileData.first_name = userData.first_name.trim();
    }
    if (userData.last_name !== undefined && userData.last_name != null && String(userData.last_name).trim() !== '') {
      profileData.last_name = userData.last_name.trim();
    }
    if (userData.username !== undefined && userData.username != null && String(userData.username).trim() !== '') {
      const normalised = normaliseUsername(userData.username);
      if (normalised) profileData.username = normalised;
    }
    
    console.log('[upsertUser] Données à sauvegarder:', Object.keys(profileData).filter(k => k !== 'id' && k !== 'created_at' && k !== 'updated_at'));
    if (__DEV__) {
      console.log('[PROFILE_SAVE] school_level before write', userData.school_level ?? null);
    }

    // Ne jamais considérer un 409 comme succès. Stratégie : select puis update ou insert.
    const { data: existingRow, error: selectError } = await supabase
      .from('user_profiles')
      .select('id, username, first_name')
      .eq('id', userId)
      .maybeSingle();

    if (selectError) {
      throw selectError;
    }

    const updatePayload = { ...profileData };
    delete updatePayload.id;
    delete updatePayload.created_at;
    // Ne pas envoyer username/first_name s'ils sont inchangés — évite faux 409 sur même ligne
    if (existingRow && updatePayload.username !== undefined && existingRow.username != null && String(updatePayload.username).trim() === String(existingRow.username).trim()) {
      delete updatePayload.username;
    }
    if (existingRow && updatePayload.first_name !== undefined && existingRow.first_name != null && String(updatePayload.first_name).trim() === String(existingRow.first_name).trim()) {
      delete updatePayload.first_name;
    }

    if (existingRow) {
      // Ligne existe : UPDATE uniquement (évite 409 d'upsert)
      const { data: updateData, error: updateError } = await supabase
        .from('user_profiles')
        .update(updatePayload)
        .eq('id', userId)
        .select()
        .single();

      if (updateError) {
        const isUsernameConflict = updateError.code === '23505' && /username|idx_user_profiles_username|unique/i.test(String(updateError.message || updateError.details || ''));
        if (isUsernameConflict) {
          if (__DEV__) console.log('[USERNAME_TAKEN]', { userId: userId.slice(0, 8) });
          return { data: null, error: { message: 'Ce pseudo est déjà pris', code: '23505' } };
        }
        // 409 sans 23505 : possible race (ex. double submit) → un seul retry UPDATE
        if (updateError.status === 409 || updateError.code === '409') {
          const { data: retryData, error: retryError } = await supabase
            .from('user_profiles')
            .update(updatePayload)
            .eq('id', userId)
            .select()
            .single();
          if (!retryError) {
            resultData = retryData;
          } else {
            const retryUsernameConflict = retryError.code === '23505' && /username|idx_user_profiles_username|unique/i.test(String(retryError.message || retryError.details || ''));
            if (retryUsernameConflict) {
              return { data: null, error: { message: 'Ce pseudo est déjà pris', code: '23505' } };
            }
            if (__DEV__) console.error('[upsertUser] 409 on update retry failed', retryError);
            throw retryError;
          }
        } else {
          throw updateError;
        }
      } else {
        resultData = updateData;
      }
    } else {
      // Ligne n'existe pas : INSERT
      const { data: insertData, error: insertError } = await supabase
        .from('user_profiles')
        .insert(profileData)
        .select()
        .single();

      if (insertError) {
        // 23505 = duplicate : ligne créée entre notre select et insert (ex. trigger / signUp) → recovery update
        // 23505 ou 409 sur INSERT = ligne déjà existante (trigger/race) → recovery UPDATE
        if (insertError.code === '23505' || insertError.status === 409 || insertError.code === '409') {
          const { data: updateData, error: updateError } = await supabase
            .from('user_profiles')
            .update(updatePayload)
            .eq('id', userId)
            .select()
            .single();
          if (updateError) {
            const isUsernameConflict = updateError.code === '23505' && /username|idx_user_profiles_username|unique/i.test(String(updateError.message || updateError.details || ''));
            if (isUsernameConflict) {
              if (__DEV__) console.log('[USERNAME_TAKEN]', { userId: userId.slice(0, 8) });
              return { data: null, error: { message: 'Ce pseudo est déjà pris', code: '23505' } };
            }
            if (updateError.status === 409 || updateError.code === '409') {
              if (__DEV__) console.error('[upsertUser] 409 on recovery update', updateError);
              throw updateError;
            }
            throw updateError;
          }
          resultData = updateData;
        } else if (insertError.code === '23503') {
          // FK violation : trigger pas encore terminé, retry avec délai
          const MAX_RETRIES = 5;
          const INITIAL_DELAY = 300;
          for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            const delay = INITIAL_DELAY * Math.pow(2, attempt - 1);
            console.log(`[upsertUser] FK violation, retry ${attempt}/${MAX_RETRIES} après ${delay}ms...`);
            await new Promise((r) => setTimeout(r, delay));
            const { data: retryData, error: retryError } = await supabase
              .from('user_profiles')
              .select('id')
              .eq('id', userId)
              .maybeSingle();
            if (retryError) throw retryError;
            if (retryData) {
              const { data: updateData2, error: updateError2 } = await supabase
                .from('user_profiles')
                .update(updatePayload)
                .eq('id', userId)
                .select()
                .single();
              if (updateError2) throw updateError2;
              resultData = updateData2;
              break;
            }
          }
          if (!resultData) throw insertError;
        } else {
          throw insertError;
        }
      } else {
        resultData = insertData;
      }
    }

    if (__DEV__ && resultData && userData.school_level !== undefined && userData.school_level != null) {
      const after = resultData.school_level != null ? String(resultData.school_level).trim() : null;
      if (!after) {
        console.warn('[PROFILE_SAVE] school_level was set but row has school_level null after write — possible DB column missing or RLS');
      }
    }

    // Après write : refetch immédiatement et mise à jour du cache (source de vérité = DB)
    const { data: refetched } = await supabase
      .from('user_profiles')
      .select('school_level, birthdate, first_name')
      .eq('id', userId)
      .maybeSingle();

    if (refetched) {
      setProfileCache(userId, {
        firstName: refetched.first_name ?? null,
        birthdate: refetched.birthdate ?? null,
        school_level: refetched.school_level != null ? String(refetched.school_level).trim() : null,
      });
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.log('[PROFILE_DB_AFTER_WRITE]', {
          school_level: refetched.school_level ?? null,
          birthdate: refetched.birthdate ?? null,
          first_name: refetched.first_name ?? null,
        });
      }
    }

    if (profileData.username && __DEV__) {
      console.log('[USERNAME_WRITE_OK]', { userId: userId.slice(0, 8) });
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
 * Au login uniquement : s'assurer qu'une ligne user_profiles existe sans jamais écraser prénom/username/onboarding.
 * Si la ligne existe déjà : ne rien faire. Si elle n'existe pas : INSERT minimal (id, email, updated_at).
 * À appeler après SIGNED_IN à la place de upsertUser pour éviter d'écraser onboarding_completed / first_name / username.
 * @param {string} userId - ID de l'utilisateur
 * @param {string} [email] - Email (optionnel)
 * @returns {Promise<{created: boolean}>}
 */
export async function ensureProfileRowExistsForLogin(userId, email) {
  if (!userId) return { created: false };
  try {
    const { data: existing } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
    if (existing) {
      if (__DEV__) console.log('[ensureProfileRowExistsForLogin] Ligne existante, pas d’écriture');
      return { created: false };
    }
    const { error } = await supabase
      .from('user_profiles')
      .insert({
        id: userId,
        email: email ?? null,
        updated_at: new Date().toISOString(),
      });
    if (error) {
      // 23503 = FK (auth.users pas encore visible), 23505 = duplicate : profil déjà créé (ex. par signUp).
      if (error.code !== '23503' && error.code !== '23505' && __DEV__) {
        console.warn('[ensureProfileRowExistsForLogin] Insert échoué (non bloquant):', error.message);
      }
      return { created: false };
    }
    if (__DEV__) console.log('[ensureProfileRowExistsForLogin] Ligne créée (minimal)');
    return { created: true };
  } catch (e) {
    if (__DEV__) console.warn('[ensureProfileRowExistsForLogin] Erreur:', e?.message);
    return { created: false };
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
 * Singleton in-flight: évite les appels getUserProgressFromDB parallèles pour le même userId.
 * Map<userId, Promise> — les appels concurrents partagent la même promesse.
 */
const getUserProgressFromDBInFlight = new Map();

/**
 * Récupère la progression de l'utilisateur depuis la DB
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<object>} - Progression de l'utilisateur
 */
export async function getUserProgressFromDB(userId) {
  if (getUserProgressFromDBInFlight.has(userId)) {
    return getUserProgressFromDBInFlight.get(userId);
  }
  const promise = getUserProgressFromDBInternal(userId);
  getUserProgressFromDBInFlight.set(userId, promise);
  try {
    return await promise;
  } finally {
    getUserProgressFromDBInFlight.delete(userId);
  }
}

async function getUserProgressFromDBInternal(userId) {
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
      'current_module_index', 'max_unlocked_module_index',
      'quetes_completes', 'progression_quetes',
      'streak_count', 'last_flame_day', 'flame_screen_seen_for_day',
      'last_activity_at', 'last_reminder_stage', 'last_reminder_sent_at'
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

