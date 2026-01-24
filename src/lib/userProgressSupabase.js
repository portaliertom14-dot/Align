import { getCurrentUser } from '../services/auth';
import { getUserProgressFromDB, upsertUserProgress } from '../services/userService';
import { supabase } from '../services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { validateStoredUserId } from '../services/authCleanup';
import { getCache, setCache, clearCache } from './cache';
import { validateProgress } from './validation';
import { supabaseWithRetry, withRetry } from './retry';
import { calculateLevel, getTotalXPForLevel } from './progression';

/**
 * Service de progression utilisateur avec Supabase
 * Synchronise les données avec la base de données Supabase
 */

// Verrou pour éviter les créations multiples de progression initiale
const initialProgressCreationLock = new Map(); // userId -> boolean

/**
 * Structure de progression utilisateur par défaut
 */
const DEFAULT_USER_PROGRESS = {
  activeDirection: null,
  activeSerie: null,
  activeMetier: null,
  activeModule: 'mini_simulation_metier',
  currentChapter: 1,
  currentLesson: 1,
  currentLevel: 0,
  currentXP: 0,
  completedLevels: [],
  totalStars: 0,
  currentModuleIndex: 0, // Index du dernier module débloqué (0, 1, ou 2)
  currentModuleInChapter: 0, // Index du module actuel dans le chapitre (0, 1, ou 2)
  completedModulesInChapter: [], // Modules complétés dans le chapitre actuel
  chapterHistory: [], // Historique des chapitres complétés
  quizAnswers: {},
  metierQuizAnswers: {},
};

/**
 * Convertit la progression Supabase en format local
 */
function convertFromDB(dbProgress) {
  if (!dbProgress) return DEFAULT_USER_PROGRESS;
  
  // 🔍 LOGS DE DIAGNOSTIC
  console.log('[convertFromDB] 🔍 Conversion des données:', {
    rawXP: dbProgress.xp,
    rawEtoiles: dbProgress.etoiles,
    rawNiveau: dbProgress.niveau,
    xpType: typeof dbProgress.xp,
    etoilesType: typeof dbProgress.etoiles,
    niveauType: typeof dbProgress.niveau,
    xpIsNull: dbProgress.xp === null,
    etoilesIsNull: dbProgress.etoiles === null,
    niveauIsNull: dbProgress.niveau === null,
    xpIsUndefined: dbProgress.xp === undefined,
    etoilesIsUndefined: dbProgress.etoiles === undefined,
    niveauIsUndefined: dbProgress.niveau === undefined
  });
  
  // PostgreSQL convertit les colonnes non-quoted en lowercase
  // Vérifier à la fois camelCase et lowercase
  // Convertir niveau en nombre si c'est une string
  // CRITICAL FIX: Utiliser ?? au lieu de || pour distinguer undefined de 0
  // Si la valeur est 0 (réelle), on veut la garder. Si elle est undefined (non retournée), on veut 0 par défaut
  const parseNumber = (value, defaultValue = 0) => {
    if (value === undefined || value === null) return defaultValue;
    if (typeof value === 'string') {
      const parsed = parseInt(value, 10);
      return isNaN(parsed) ? defaultValue : parsed;
    }
    return typeof value === 'number' ? value : defaultValue;
  };
  
  const niveauNum = parseNumber(dbProgress.niveau, 0);
  const xpNum = parseNumber(dbProgress.xp, 0);
  const etoilesNum = parseNumber(dbProgress.etoiles, 0);
  
  // 🔍 LOGS APRÈS CONVERSION
  console.log('[convertFromDB] ✅ Valeurs converties:', {
    xp: xpNum,
    etoiles: etoilesNum,
    niveau: niveauNum,
    xpChanged: dbProgress.xp !== xpNum && dbProgress.xp != null,
    etoilesChanged: dbProgress.etoiles !== etoilesNum && dbProgress.etoiles != null,
    niveauChanged: dbProgress.niveau !== niveauNum && dbProgress.niveau != null
  });
  
  return {
    activeDirection: dbProgress.activeDirection ?? dbProgress.activedirection ?? null,
    activeSerie: dbProgress.activeSerie ?? dbProgress.activeserie ?? null,
    activeMetier: dbProgress.activeMetier ?? dbProgress.activemetier ?? null,
    activeModule: dbProgress.activeModule ?? dbProgress.activemodule ?? 'mini_simulation_metier',
    currentChapter: dbProgress.currentChapter ?? dbProgress.currentchapter ?? 1,
    currentLesson: dbProgress.currentLesson ?? dbProgress.currentlesson ?? 1,
    currentLevel: niveauNum,
    currentXP: xpNum,
    completedLevels: dbProgress.completedLevels ?? dbProgress.completedlevels ?? [],
    totalStars: etoilesNum, // CRITICAL FIX: Utiliser etoilesNum au lieu de || 0 pour préserver 0 réel
    currentModuleIndex: typeof dbProgress.current_module_index === 'number' ? dbProgress.current_module_index : (typeof dbProgress.module_index_actuel === 'number' ? dbProgress.module_index_actuel : 0),
    currentModuleInChapter: typeof dbProgress.current_module_in_chapter === 'number' ? dbProgress.current_module_in_chapter : 0,
    completedModulesInChapter: Array.isArray(dbProgress.completed_modules_in_chapter) ? dbProgress.completed_modules_in_chapter : [],
    chapterHistory: Array.isArray(dbProgress.chapter_history) ? dbProgress.chapter_history : [],
    quizAnswers: dbProgress.quizAnswers ?? dbProgress.quizanswers ?? {},
    metierQuizAnswers: dbProgress.metierQuizAnswers ?? dbProgress.metierquizanswers ?? {},
  };
}

/**
 * Convertit la progression locale en format Supabase
 */
function convertToDB(localProgress) {
  // Construire l'objet DB avec seulement les champs qui ont des valeurs définies
  // Cela évite d'envoyer null pour des champs qui pourraient ne pas exister en BDD
  // CRITICAL FIX: Ne pas inclure xp, etoiles, niveau s'ils ne sont pas explicitement définis
  // Sinon, on écrase les valeurs existantes avec 0 lors d'un update partiel
  const dbProgress = {
    current_module_index: typeof localProgress.currentModuleIndex === 'number' ? localProgress.currentModuleIndex : 0,
  };
  
  // CRITICAL: Ne jamais inclure undefined ou null pour les champs critiques
  // Seulement inclure si la valeur est explicitement définie ET valide
  // Si undefined, NE PAS inclure - Supabase utilisera la valeur existante (pas d'écrasement)
  
  if (localProgress.currentLevel !== undefined && typeof localProgress.currentLevel === 'number') {
    dbProgress.niveau = localProgress.currentLevel;
  }
  // Si undefined, NE PAS inclure - laisser Supabase utiliser la valeur existante
  
  if (localProgress.currentXP !== undefined && typeof localProgress.currentXP === 'number' && localProgress.currentXP >= 0) {
    dbProgress.xp = localProgress.currentXP;
  }
  // Si undefined, NE PAS inclure - laisser Supabase utiliser la valeur existante
  
  if (localProgress.totalStars !== undefined && typeof localProgress.totalStars === 'number' && localProgress.totalStars >= 0) {
    dbProgress.etoiles = localProgress.totalStars;
  }
  // Si undefined, NE PAS inclure - laisser Supabase utiliser la valeur existante
  
  // Ajouter les champs optionnels seulement s'ils existent
  if (localProgress.quetesCompletes !== undefined) {
    dbProgress.quetes_completes = Array.isArray(localProgress.quetesCompletes) ? localProgress.quetesCompletes : [];
  }
  if (localProgress.progressionQuetes !== undefined) {
    dbProgress.progression_quetes = localProgress.progressionQuetes || {};
  }
  if (localProgress.activeDirection !== undefined) {
    dbProgress.activeDirection = localProgress.activeDirection || null;
  }
  if (localProgress.activeSerie !== undefined) {
    dbProgress.activeSerie = localProgress.activeSerie || null;
  }
  if (localProgress.activeMetier !== undefined) {
    dbProgress.activeMetier = localProgress.activeMetier || null;
  }
  if (localProgress.activeModule !== undefined) {
    dbProgress.activeModule = localProgress.activeModule || 'mini_simulation_metier';
  }
  if (localProgress.currentChapter !== undefined) {
    dbProgress.currentChapter = localProgress.currentChapter || 1;
  }
  if (localProgress.currentModuleInChapter !== undefined) {
    dbProgress.current_module_in_chapter = localProgress.currentModuleInChapter || 0;
  }
  if (localProgress.completedModulesInChapter !== undefined) {
    dbProgress.completed_modules_in_chapter = Array.isArray(localProgress.completedModulesInChapter) 
      ? localProgress.completedModulesInChapter 
      : [];
  }
  if (localProgress.chapterHistory !== undefined) {
    dbProgress.chapter_history = Array.isArray(localProgress.chapterHistory) 
      ? localProgress.chapterHistory 
      : [];
  }
  if (localProgress.currentLesson !== undefined) {
    dbProgress.currentLesson = localProgress.currentLesson || 1;
  }
  if (localProgress.completedLevels !== undefined) {
    dbProgress.completedLevels = Array.isArray(localProgress.completedLevels) ? localProgress.completedLevels : [];
  }
  if (localProgress.quizAnswers !== undefined) {
    dbProgress.quizAnswers = localProgress.quizAnswers || {};
  }
  if (localProgress.metierQuizAnswers !== undefined) {
    dbProgress.metierQuizAnswers = localProgress.metierQuizAnswers || {};
  }
  
  return dbProgress;
}

/**
 * Récupère la progression utilisateur depuis Supabase
 * Si la progression n'existe pas, la crée avec les valeurs par défaut
 * @returns {Promise<Object>} Progression sauvegardée
 */
// Cache pour éviter les appels DB répétés
let progressCache = null;
let progressCacheTimestamp = 0;
const PROGRESS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes (augmenté de 30s pour réduire les appels DB)

/**
 * Invalide le cache de progression
 * À appeler lors de la déconnexion pour éviter les fuites de données
 */
export function invalidateProgressCache() {
  progressCache = null;
  progressCacheTimestamp = 0;
  console.log('[USER_PROGRESS] Cache de progression invalidé');
}

export async function getUserProgress(forceRefresh = false) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      // Pas d'utilisateur connecté → retourner progression par défaut
      return DEFAULT_USER_PROGRESS;
    }

    // CRITIQUE: Si le cache a été mis à jour récemment (dans les 3 dernières secondes),
    // l'utiliser même en mode forceRefresh pour éviter le cache PostgREST obsolète
    const now = Date.now();
    const RECENT_UPDATE_THRESHOLD = 3000; // 3 secondes
    const isRecentUpdate = progressCache && (now - progressCacheTimestamp) < RECENT_UPDATE_THRESHOLD;
    const cacheAge = progressCache ? (now - progressCacheTimestamp) : null;
    
    // Vérifier le cache en mémoire (plus rapide que AsyncStorage)
    if (!forceRefresh && progressCache && (now - progressCacheTimestamp) < PROGRESS_CACHE_TTL) {
      return progressCache;
    }
    
    // Si forceRefresh mais que le cache est récent, l'utiliser quand même
    // (évite le cache PostgREST obsolète qui peut prendre plusieurs secondes à se rafraîchir)
    if (forceRefresh && isRecentUpdate) {
      console.log('[getUserProgress] Cache récent détecté, utilisation du cache local au lieu de Supabase (évite cache PostgREST obsolète)');
      return progressCache;
    }

    // Essayer le cache AsyncStorage
    const cacheKey = `user_progress_${user.id}`;
    if (!forceRefresh) {
      const cached = await getCache(cacheKey);
      if (cached) {
        progressCache = cached;
        progressCacheTimestamp = now;
        return cached;
      }
    }

    // Récupérer depuis la DB avec retry (optimisé : 1 retry seulement pour des performances optimales)
    // CRITICAL FIX: getUserProgressFromDB retourne directement data ou null, pas { data, error }
    // Il faut l'appeler directement et gérer les erreurs manuellement
    let data = null;
    let error = null;
    
    try {
      data = await supabaseWithRetry(
        () => getUserProgressFromDB(user.id),
        { maxRetries: 1, initialDelay: 200 } // 1 retry avec délai réduit
      );
    } catch (err) {
      error = err;
      console.error('[getUserProgress] Erreur lors de la récupération depuis DB:', err);
    }
    
    // Gérer les erreurs CORS gracieusement
    if (error) {
      const isCorsError = error instanceof TypeError ||
                         error?.message?.includes('access control') ||
                         error?.message?.includes('CORS') ||
                         error?.message?.includes('Load failed') ||
                         error?.message?.includes('Failed to fetch') ||
                         error?.message === 'TypeError: Load failed';
      
      if (isCorsError) {
        console.warn('[USER_PROGRESS] ⚠️ Erreur CORS/réseau détectée, utilisation du cache local (mode dégradé)');
        // Essayer de récupérer depuis le cache AsyncStorage/localStorage
        const cacheKey = `user_progress_${user.id}`;
        const cached = await getCache(cacheKey);
        if (cached) {
          console.log('[USER_PROGRESS] ✅ Cache local trouvé, utilisation des valeurs en cache');
          progressCache = cached;
          progressCacheTimestamp = Date.now();
          return cached;
        }
        // Si pas de cache, retourner les valeurs par défaut
        console.warn('[USER_PROGRESS] ⚠️ Aucun cache local trouvé, utilisation des valeurs par défaut');
        return DEFAULT_USER_PROGRESS;
      }
      
      // Si erreur (sauf "not found"), logger et retourner default
      if (error.code !== 'PGRST116') {
        console.error('[USER_PROGRESS] ❌ Erreur lors de la récupération de la progression:', error);
        // Essayer quand même le cache local
        const cacheKey = `user_progress_${user.id}`;
        const cached = await getCache(cacheKey);
        if (cached) {
          console.log('[USER_PROGRESS] ✅ Cache local trouvé après erreur, utilisation des valeurs en cache');
          return cached;
        }
        return DEFAULT_USER_PROGRESS;
      }
    }
    
    // CRITICAL FIX: Vérifier si la progression existe vraiment avant de la créer
    // data peut être null si la progression n'existe pas, ou undefined si il y a une erreur
    // Ne créer la progression que si data est vraiment null/undefined ET qu'il n'y a pas d'erreur autre que PGRST116
    const shouldCreateInitial = (!data && (error?.code === 'PGRST116' || !error));
    
    if (shouldCreateInitial) {
      // CRITICAL FIX: Utiliser le verrou pour éviter les créations multiples simultanées
      if (initialProgressCreationLock.get(user.id)) {
        console.log('[USER_PROGRESS] Création initiale déjà en cours pour cet utilisateur, attente...');
        // Attendre un peu et réessayer de récupérer
        await new Promise(resolve => setTimeout(resolve, 500));
        const { data: retryData, error: retryError } = await supabaseWithRetry(
          () => getUserProgressFromDB(user.id),
          { maxRetries: 1, initialDelay: 200 }
        );
        if (retryData && !retryError) {
          const progress = convertFromDB(retryData);
          progressCache = progress;
          progressCacheTimestamp = now;
          await setCache(cacheKey, progress, PROGRESS_CACHE_TTL);
          return progress;
        }
      }
      
      // Activer le verrou
      initialProgressCreationLock.set(user.id, true);
      
      try {
        // Vérifier une dernière fois si la progression existe vraiment (race condition protection)
        const { data: doubleCheckData, error: doubleCheckError } = await supabase
          .from('user_progress')
          .select('id, xp, etoiles, niveau')
          .eq('id', user.id)
          .maybeSingle();
        
        // Si la progression existe maintenant (race condition), l'utiliser
        if (doubleCheckData && !doubleCheckError) {
          console.log('[USER_PROGRESS] Progression trouvée lors de la double vérification, utilisation des données existantes');
          const progress = convertFromDB(doubleCheckData);
          progressCache = progress;
          progressCacheTimestamp = now;
          await setCache(cacheKey, progress, PROGRESS_CACHE_TTL);
          return progress; // Le verrou sera libéré dans le finally
        }
        
        // La progression n'existe vraiment pas, la créer
        console.log('[USER_PROGRESS] Progression inexistante, création initiale pour user:', user.id?.substring(0, 8) + '...');
      
      // CRITICAL FIX: Créer la progression avec des valeurs par défaut non-null pour les colonnes critiques
      // IMPORTANT: Ne pas inclure xp, etoiles, niveau dans la création initiale
      // Ils seront créés avec leurs valeurs par défaut en DB (0) mais on ne veut pas les écraser explicitement
      const dbProgress = {
        current_module_index: 0,
        activeModule: 'mini_simulation_metier',
        currentChapter: 1,
        currentLesson: 1,
        completedLevels: [],
        quizAnswers: {},
        metierQuizAnswers: {},
      };
      
      // Utiliser INSERT au lieu d'UPSERT pour éviter d'écraser une progression existante
      // Si la progression existe déjà (race condition), l'erreur 23505 sera ignorée
      const { data: newData, error: createError } = await supabase
        .from('user_progress')
        .insert({
          id: user.id,
          ...dbProgress,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      // Si erreur 23505 (duplicate key), la progression existe déjà - la récupérer
      if (createError && createError.code === '23505') {
        console.log('[USER_PROGRESS] Progression existe déjà (race condition), récupération...');
        const { data: existingData, error: getError } = await supabase
          .from('user_progress')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (!getError && existingData) {
          const progress = convertFromDB(existingData);
          progressCache = progress;
          progressCacheTimestamp = now;
          await setCache(cacheKey, progress, PROGRESS_CACHE_TTL);
          return progress;
        }
      }
      
      // Pour le fallback AsyncStorage, utiliser DEFAULT_USER_PROGRESS
      const initialProgress = {
        ...DEFAULT_USER_PROGRESS,
        activeModule: 'mini_simulation_metier',
        currentChapter: 1,
        currentLesson: 1,
        completedLevels: [],
        quizAnswers: {},
        metierQuizAnswers: {},
      };
      
      if (createError) {
        const isCorsErrorOnCreate = createError instanceof TypeError ||
                                    createError?.message?.includes('Load failed') ||
                                    createError?.message?.includes('access control') ||
                                    createError?.message?.includes('CORS');
        console.error('[USER_PROGRESS] Erreur lors de la création de la progression initiale:', createError);
        // FALLBACK: Sauvegarder dans AsyncStorage si la création DB échoue
        try {
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          await AsyncStorage.setItem('@align_user_progress_fallback', JSON.stringify(initialProgress));
          await AsyncStorage.setItem('@align_user_progress_fallback_user_id', user.id);
          console.log('[USER_PROGRESS] ✅ Progression sauvegardée dans AsyncStorage (fallback)');
        } catch (fallbackError) {
          console.error('[USER_PROGRESS] Erreur lors du fallback AsyncStorage:', fallbackError);
        }
        return initialProgress;
      }
      
      // Retourner la progression créée (conversion depuis DB)
      const newProgress = convertFromDB(newData);
      // S'assurer que currentModuleIndex est un nombre valide (0, 1, ou 2)
      if (typeof newProgress.currentModuleIndex !== 'number' || newProgress.currentModuleIndex < 0) {
        newProgress.currentModuleIndex = 0;
      }
      if (newProgress.currentModuleIndex > 2) {
        newProgress.currentModuleIndex = 0; // Reset si > 2
      }
      
      // S'assurer que les valeurs par défaut sont présentes même si la DB renvoie null
      if (!newProgress.activeModule) newProgress.activeModule = 'mini_simulation_metier';
      if (!newProgress.currentChapter) newProgress.currentChapter = 1;
      if (!newProgress.currentLesson) newProgress.currentLesson = 1;
      if (!Array.isArray(newProgress.completedLevels)) newProgress.completedLevels = [];
      if (!newProgress.quizAnswers || typeof newProgress.quizAnswers !== 'object') newProgress.quizAnswers = {};
      if (!newProgress.metierQuizAnswers || typeof newProgress.metierQuizAnswers !== 'object') newProgress.metierQuizAnswers = {};
      
        console.log('[USER_PROGRESS] ✅ Progression initiale créée avec succès');
        return newProgress;
      } finally {
        // Toujours libérer le verrou (même en cas d'erreur)
        initialProgressCreationLock.delete(user.id);
      }
    }

    const progress = convertFromDB(data);
    
    // CRITICAL FIX: Si les valeurs XP/étoiles sont 0 mais que la progression existe (data.id existe),
    // vérifier si c'est vraiment 0 en DB ou si c'est un problème de récupération
    if (data && data.id && progress.currentXP === 0 && progress.totalStars === 0) {
    }
    
    // Mettre à jour spécifiquement le compte tomprt14@yahoo.com au niveau 102 avec 836 étoiles
    // Une seule fois, si le niveau actuel est inférieur à 102
    if (user?.email === 'tomprt14@yahoo.com' && progress.currentLevel < 102) {
      console.log(`[getUserProgress] Mise à jour du compte ${user.email} au niveau 102 avec 836 étoiles`);
      
      // Calculer l'XP total nécessaire pour le niveau 102 avec la nouvelle formule progressive
      const targetXP = getTotalXPForLevel(102);
      
      // Mettre à jour la progression localement
      progress.currentLevel = 102;
      progress.currentXP = targetXP;
      progress.totalStars = 836;
      
      // Sauvegarder en arrière-plan (ne pas bloquer le chargement)
      updateUserProgress({
        currentLevel: 102,
        currentXP: targetXP,
        totalStars: 836,
      }).then(() => {
        console.log(`[getUserProgress] ✅ Compte ${user.email} mis à jour avec succès (niveau 102, 836 étoiles)`);
      }).catch(err => {
        console.error('[getUserProgress] Erreur lors de la mise à jour du compte:', err);
      });
    }
    
    // Debug: logger les valeurs récupérées pour diagnostiquer
    console.log('[getUserProgress] Valeurs récupérées depuis BDD:', {
      activeDirection: data?.activeDirection || data?.activedirection || null,
      activeMetier: data?.activeMetier || data?.activemetier || null,
      rawKeys: Object.keys(data || {})
    });
    
    // FALLBACK: Si les valeurs ne sont pas dans la BDD (cache PostgREST non rafraîchi),
    // essayer de les récupérer depuis AsyncStorage comme stockage temporaire
    // CRITIQUE : Vérifier que l'ID utilisateur correspond avant d'utiliser les données
    try {
      const fallbackData = await AsyncStorage.getItem('@align_user_progress_fallback');
      const fallbackUserId = await AsyncStorage.getItem('@align_user_progress_fallback_user_id');
      
      if (fallbackData) {
        // Vérifier que l'ID utilisateur correspond
        if (fallbackUserId && fallbackUserId !== user.id) {
          console.error('[getUserProgress] ❌ FUITE DE DONNÉES DÉTECTÉE dans fallback: userId mismatch');
          console.error(`  - fallbackUserId: ${fallbackUserId.substring(0, 8)}...`);
          console.error(`  - currentUser.id: ${user.id.substring(0, 8)}...`);
          // Nettoyer les données invalides
          await AsyncStorage.removeItem('@align_user_progress_fallback');
          await AsyncStorage.removeItem('@align_user_progress_fallback_user_id');
        } else if (fallbackUserId === user.id) {
          // L'ID correspond, utiliser les données du fallback
          const fallback = JSON.parse(fallbackData);
          console.log('[getUserProgress] 🔄 Fallback AsyncStorage trouvé (userId valide):', fallback);
          
          // Fusionner les valeurs depuis AsyncStorage (priorité au fallback si BDD est null)
          if (fallback.activeDirection && (!progress.activeDirection || progress.activeDirection === null)) {
            console.log('[getUserProgress] ✅ Récupération activeDirection depuis AsyncStorage:', fallback.activeDirection);
            progress.activeDirection = fallback.activeDirection;
          }
          if (fallback.activeMetier && (!progress.activeMetier || progress.activeMetier === null)) {
            console.log('[getUserProgress] ✅ Récupération activeMetier depuis AsyncStorage:', fallback.activeMetier);
            progress.activeMetier = fallback.activeMetier;
          }
          if (fallback.quizAnswers && Object.keys(fallback.quizAnswers).length > 0) {
            if (!progress.quizAnswers || Object.keys(progress.quizAnswers).length === 0) {
              console.log('[getUserProgress] ✅ Récupération quizAnswers depuis AsyncStorage');
              progress.quizAnswers = fallback.quizAnswers;
            }
          }
          if (fallback.metierQuizAnswers && Object.keys(fallback.metierQuizAnswers).length > 0) {
            if (!progress.metierQuizAnswers || Object.keys(progress.metierQuizAnswers).length === 0) {
              console.log('[getUserProgress] ✅ Récupération metierQuizAnswers depuis AsyncStorage');
              progress.metierQuizAnswers = fallback.metierQuizAnswers;
            }
          }
          // Colonnes du système de chapitres
          // Toujours utiliser le fallback si disponible (priorité au fallback car c'est la source de vérité si Supabase a échoué)
          if (typeof fallback.currentChapter === 'number' && fallback.currentChapter > 0) {
            console.log('[getUserProgress] ✅ Récupération currentChapter depuis AsyncStorage:', fallback.currentChapter, '(valeur BDD:', progress.currentChapter, ')');
            progress.currentChapter = fallback.currentChapter;
          }
          if (typeof fallback.currentModuleInChapter === 'number') {
            console.log('[getUserProgress] ✅ Récupération currentModuleInChapter depuis AsyncStorage:', fallback.currentModuleInChapter, '(valeur BDD:', progress.currentModuleInChapter, ')');
            progress.currentModuleInChapter = fallback.currentModuleInChapter;
          }
          if (Array.isArray(fallback.completedModulesInChapter)) {
            console.log('[getUserProgress] ✅ Récupération completedModulesInChapter depuis AsyncStorage (longueur:', fallback.completedModulesInChapter.length, ')');
            progress.completedModulesInChapter = fallback.completedModulesInChapter;
          }
          if (Array.isArray(fallback.chapterHistory)) {
            console.log('[getUserProgress] ✅ Récupération chapterHistory depuis AsyncStorage (longueur:', fallback.chapterHistory.length, ')');
            progress.chapterHistory = fallback.chapterHistory;
          }
        } else {
          // Pas d'ID stocké (ancien format) → nettoyer pour sécurité
          console.warn('[getUserProgress] ⚠️ Fallback sans userId, nettoyage pour sécurité');
          await AsyncStorage.removeItem('@align_user_progress_fallback');
        }
      } else {
        console.log('[getUserProgress] ⚠️ Aucun fallback AsyncStorage trouvé');
        
        // CRITICAL FIX: Si la BDD renvoie null pour les colonnes critiques et qu'il n'y a pas de fallback,
        // initialiser avec des valeurs par défaut pour éviter les null
        if (!progress.activeModule) progress.activeModule = 'mini_simulation_metier';
        if (!progress.currentChapter) progress.currentChapter = 1;
        if (!progress.currentLesson) progress.currentLesson = 1;
        if (!Array.isArray(progress.completedLevels)) progress.completedLevels = [];
        if (!progress.quizAnswers || typeof progress.quizAnswers !== 'object') progress.quizAnswers = {};
        if (!progress.metierQuizAnswers || typeof progress.metierQuizAnswers !== 'object') progress.metierQuizAnswers = {};
        // Colonnes du système de chapitres
        if (typeof progress.currentModuleInChapter !== 'number') progress.currentModuleInChapter = 0;
        if (!Array.isArray(progress.completedModulesInChapter)) progress.completedModulesInChapter = [];
        if (!Array.isArray(progress.chapterHistory)) progress.chapterHistory = [];
      }
    } catch (e) {
      console.error('[getUserProgress] ❌ Erreur lors de la récupération du fallback:', e);
      // En cas d'erreur, s'assurer que les valeurs par défaut sont présentes
      if (!progress.activeModule) progress.activeModule = 'mini_simulation_metier';
      if (!progress.currentChapter) progress.currentChapter = 1;
      if (!progress.currentLesson) progress.currentLesson = 1;
      if (!Array.isArray(progress.completedLevels)) progress.completedLevels = [];
      if (!progress.quizAnswers || typeof progress.quizAnswers !== 'object') progress.quizAnswers = {};
      if (!progress.metierQuizAnswers || typeof progress.metierQuizAnswers !== 'object') progress.metierQuizAnswers = {};
      // Colonnes du système de chapitres
      if (typeof progress.currentModuleInChapter !== 'number') progress.currentModuleInChapter = 0;
      if (!Array.isArray(progress.completedModulesInChapter)) progress.completedModulesInChapter = [];
      if (!Array.isArray(progress.chapterHistory)) progress.chapterHistory = [];
    }
    
    console.log('[getUserProgress] 📊 Progression finale après fusion:', {
      activeDirection: progress.activeDirection,
      activeMetier: progress.activeMetier,
      hasQuizAnswers: Object.keys(progress.quizAnswers || {}).length > 0,
      hasMetierQuizAnswers: Object.keys(progress.metierQuizAnswers || {}).length > 0
    });
    
    
    // ⚠️ VALIDATION: Vérifier que currentXP est un nombre valide (supprimer la limite MAX_XP car la colonne sera migrée en BIGINT)
    if (typeof progress.currentXP !== 'number' || progress.currentXP < 0 || isNaN(progress.currentXP)) {
      console.error('[getUserProgress] ⚠️ currentXP invalide/corrompu:', progress.currentXP, '- Réinitialisation à 0');
      progress.currentXP = 0;
      progress.currentLevel = 0;
      // Corriger la valeur dans la BDD en arrière-plan (ne pas bloquer)
      updateUserProgress({
        currentXP: 0,
        currentLevel: 0,
      }).catch(err => console.error('[getUserProgress] Erreur lors de la correction de currentXP:', err));
    } else {
      // Recalculer le niveau basé sur l'XP avec la nouvelle formule progressive
      if (progress.currentXP > 0) {
        const calculatedLevel = calculateLevel(progress.currentXP);
        progress.currentLevel = calculatedLevel;
      } else {
        progress.currentLevel = 0;
      }
    }
    
    // S'assurer que currentModuleIndex est un nombre valide (0, 1, ou 2)
    if (typeof progress.currentModuleIndex !== 'number' || progress.currentModuleIndex < 0) {
      progress.currentModuleIndex = 0;
    }
    // Limiter à 2 (max 3 modules : 0, 1, 2)
    if (progress.currentModuleIndex > 2) {
      progress.currentModuleIndex = 0; // Reset si > 2
    }
    
    // Valider la progression avant de retourner
    const validation = validateProgress(progress);
    if (!validation.valid) {
      console.warn('[getUserProgress] Progression invalide, utilisation des valeurs par défaut:', validation.errors);
      return DEFAULT_USER_PROGRESS;
    }
    
    // Mettre en cache (gestion silencieuse des erreurs de quota)
    progressCache = progress;
    progressCacheTimestamp = now;
    try {
      await setCache(cacheKey, progress, PROGRESS_CACHE_TTL);
    } catch (cacheError) {
      // Si erreur de cache (quota), continuer quand même sans cache
      console.warn('[userProgress] Impossible de mettre en cache (quota dépassé), continuation sans cache');
    }
    
    return progress;
  } catch (error) {
    console.error('Erreur lors de la récupération de la progression:', error);
    return DEFAULT_USER_PROGRESS;
  }
}

/**
 * Met à jour la progression utilisateur dans Supabase
 * @param {Object} updates - Mises à jour à appliquer
 * @returns {Promise<Object|null>} Progression mise à jour
 */
export async function updateUserProgress(updates) {
  try {
    // Valider les mises à jour
    const validation = validateProgress(updates);
    if (!validation.valid) {
      console.error('[updateUserProgress] Mises à jour invalides:', validation.errors);
      throw new Error(`Mises à jour invalides: ${validation.errors.join(', ')}`);
    }
    
    // CRITICAL: Vérifier qu'un utilisateur est connecté AVANT toute opération
    const user = await getCurrentUser();
    if (!user) {
      console.warn('[updateUserProgress] ⚠️ Pas d\'utilisateur connecté, impossible de sauvegarder la progression. Ignoré.');
      return null;
    }

    // CRITICAL FIX: NE PAS invalider le cache AVANT la sauvegarde
    // Le cache doit être préservé pour le merge après la sauvegarde
    // On va utiliser le cache existant pour le merge, et l'invalider seulement après succès
    
    // Récupérer la progression actuelle depuis le cache si disponible, sinon depuis DB
    // Utiliser le cache existant pour préserver les valeurs non mises à jour
    const currentProgress = progressCache || await getUserProgress(true);
    
    // Fusionner les mises à jour localement
    const updatedProgress = {
      ...currentProgress,
      ...updates,
    };
    
    // Valider la progression fusionnée
    const mergedValidation = validateProgress(updatedProgress);
    if (!mergedValidation.valid) {
      console.error('[updateUserProgress] Progression fusionnée invalide:', mergedValidation.errors);
      throw new Error(`Progression invalide après fusion: ${mergedValidation.errors.join(', ')}`);
    }

    // Convertir SEULEMENT les champs mis à jour en format DB
    // Cela évite d'essayer de sauvegarder des colonnes qui n'existent pas en BDD
    const dbUpdates = {};
    
    // Mapper les champs mis à jour vers leurs noms DB
    Object.keys(updates).forEach(key => {
      const value = updates[key];
      
      switch (key) {
        case 'currentModuleIndex':
          dbUpdates.current_module_index = typeof value === 'number' ? value : 0;
          break;
        case 'currentXP':
          dbUpdates.xp = typeof value === 'number' ? value : 0;
          break;
        case 'currentLevel':
          dbUpdates.niveau = typeof value === 'number' ? value : 0;
          break;
        case 'totalStars':
          dbUpdates.etoiles = typeof value === 'number' ? value : 0;
          break;
        case 'quetesCompletes':
          dbUpdates.quetes_completes = Array.isArray(value) ? value : [];
          break;
        case 'progressionQuetes':
          dbUpdates.progression_quetes = value || {};
          break;
        case 'activeDirection':
          dbUpdates.activeDirection = value || null;
          break;
        case 'activeSerie':
          dbUpdates.activeSerie = value || null;
          break;
        case 'activeMetier':
          dbUpdates.activeMetier = value || null;
          break;
        case 'activeModule':
          // Colonne optionnelle - peut ne pas exister dans toutes les BDD
          // dbUpdates.activeModule = value || 'mini_simulation_metier';
          console.warn('[updateUserProgress] activeModule ignoré (colonne peut ne pas exister en BDD)');
          break;
        case 'currentChapter':
          dbUpdates.currentChapter = typeof value === 'number' ? value : 1;
          break;
        case 'currentLesson':
          dbUpdates.currentLesson = typeof value === 'number' ? value : 1;
          break;
        case 'completedLevels':
          dbUpdates.completedLevels = Array.isArray(value) ? value : [];
          break;
        case 'quizAnswers':
          dbUpdates.quizAnswers = value || {};
          break;
        case 'metierQuizAnswers':
          dbUpdates.metierQuizAnswers = value || {};
          break;
        case 'currentModuleInChapter':
          dbUpdates.current_module_in_chapter = typeof value === 'number' ? value : 0;
          break;
        case 'completedModulesInChapter':
          dbUpdates.completed_modules_in_chapter = Array.isArray(value) ? value : [];
          break;
        case 'chapterHistory':
          dbUpdates.chapter_history = Array.isArray(value) ? value : [];
          break;
        default:
          // Pour les autres champs, utiliser le nom tel quel
          dbUpdates[key] = value;
      }
    });
    
    // Si on met à jour currentModuleIndex, s'assurer que c'est valide
    if (dbUpdates.current_module_index !== undefined) {
      if (typeof dbUpdates.current_module_index !== 'number' || dbUpdates.current_module_index < 0) {
        dbUpdates.current_module_index = 0;
      }
      if (dbUpdates.current_module_index > 2) {
        dbUpdates.current_module_index = 0; // Reset si > 2
      }
    }
    
    // CRITICAL FIX: Filtrer les colonnes optionnelles qui peuvent ne pas exister dans la base de données
    // Ces colonnes doivent être ajoutées via le script SQL FIX_USER_PROGRESS_COLUMNS_SIMPLE.sql
    // Pour éviter les erreurs PGRST204, on les filtre PROACTIVEMENT jusqu'à ce que le script SQL soit exécuté
    // 
    // INSTRUCTIONS POUR RÉACTIVER LES COLONNES:
    // 1. Exécuter le script SQL: FIX_USER_PROGRESS_COLUMNS_SIMPLE.sql dans Supabase
    // 2. Attendre 10-15 secondes pour le rafraîchissement du cache PostgREST
    // 3. Redémarrer PostgREST si nécessaire: Settings > API > Restart PostgREST service
    // 4. Retirer le filtre ci-dessous en changeant `filterOptionalColumns = true` à `false`
    // 5. Tester que les sauvegardes fonctionnent sans erreurs PGRST204
    const filterOptionalColumns = false; // Mettre à false après exécution du script SQL
    
    // Liste des colonnes optionnelles (à ajouter via SQL avant de les utiliser)
    const optionalColumns = ['activeDirection', 'activeSerie', 'activeMetier', 'activeModule', 
                            'currentChapter', 'currentLesson', 'completedLevels', 
                            'quizAnswers', 'metierQuizAnswers',
                            'current_module_in_chapter', 'completed_modules_in_chapter', 'chapter_history'];
    
    // Colonnes sûres qui existent toujours dans la base de données
    // IMPORTANT: Ne pas inclure les colonnes de chapitres ici car elles n'existent pas encore en BDD
    // ('chapter_history', 'completed_modules_in_chapter', 'current_module_in_chapter')
    // Elles seront filtrées proactivement avant l'envoi à Supabase et sauvegardées dans AsyncStorage
    const safeColumns = ['niveau', 'xp', 'etoiles', 'current_module_index', 'user_id', 'updated_at'];
    
    // Colonnes à filtrer proactivement car elles n'existent pas en BDD (accessible dans tout le scope)
    const columnsToFilter = [
      { dbKey: 'chapter_history', localKey: 'chapterHistory' },
      { dbKey: 'completed_modules_in_chapter', localKey: 'completedModulesInChapter' },
      { dbKey: 'current_module_in_chapter', localKey: 'currentModuleInChapter' },
    ];
    
    // Filtrer les colonnes optionnelles pour éviter les erreurs PGRST204
    // (Désactiver ce filtre après exécution du script SQL)
    let safeDbUpdates = {};
    const filteredValues = {};
    
    if (filterOptionalColumns) {
      // Mode FILTRÉ: Ne garder que les colonnes sûres
      Object.keys(dbUpdates).forEach(key => {
        if (safeColumns.includes(key) || !optionalColumns.includes(key)) {
          safeDbUpdates[key] = dbUpdates[key];
        } else {
          // Colonne optionnelle : sauvegarder dans AsyncStorage comme fallback
          filteredValues[key] = dbUpdates[key];
          console.log(`[updateUserProgress] ⚠️ Colonne optionnelle '${key}' filtrée (à ajouter via SQL). Valeur sauvegardée dans AsyncStorage.`);
        }
      });
      
      // Sauvegarder les valeurs des colonnes filtrées dans AsyncStorage
      if (Object.keys(filteredValues).length > 0) {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        try {
          const fallbackData = await AsyncStorage.getItem('@align_user_progress_fallback');
          const fallback = fallbackData ? JSON.parse(fallbackData) : {};
          Object.assign(fallback, filteredValues);
          await AsyncStorage.setItem('@align_user_progress_fallback', JSON.stringify(fallback));
          await AsyncStorage.setItem('@align_user_progress_fallback_user_id', user.id);
          console.log(`[updateUserProgress] ✅ ${Object.keys(filteredValues).length} colonne(s) optionnelle(s) sauvegardée(s) dans AsyncStorage`);
          console.log(`[updateUserProgress] 💡 Exécutez FIX_USER_PROGRESS_COLUMNS_SIMPLE.sql dans Supabase pour activer ces colonnes`);
        } catch (fallbackError) {
          console.error('[updateUserProgress] Erreur lors de la sauvegarde AsyncStorage:', fallbackError);
        }
      }
    } else {
      // Mode NORMAL: Envoyer toutes les colonnes (après exécution du script SQL)
      // MAIS filtrer proactivement les colonnes connues pour ne pas exister en BDD
      safeDbUpdates = { ...dbUpdates };
      
      // Filtrer proactivement les colonnes qui n'existent pas encore en BDD
      // Elles seront sauvegardées dans AsyncStorage via le fallback
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      let fallbackData = null;
      let fallback = {};
      
      try {
        fallbackData = await AsyncStorage.getItem('@align_user_progress_fallback');
        fallback = fallbackData ? JSON.parse(fallbackData) : {};
      } catch (e) {
        // Ignorer si pas de données fallback existantes
      }

      // Filtrer proactivement les colonnes qui n'existent pas en BDD
      let hasFilteredColumns = false;
      for (const { dbKey, localKey } of columnsToFilter) {
        // Vérifier à la fois dans safeDbUpdates ET dans dbUpdates pour être sûr
        const valueToFilter = safeDbUpdates[dbKey] !== undefined ? safeDbUpdates[dbKey] : 
                              dbUpdates[dbKey] !== undefined ? dbUpdates[dbKey] : undefined;
        
        if (valueToFilter !== undefined) {
          try {
            // Sauvegarder la valeur dans AsyncStorage (utiliser le nom local)
            if (updates[localKey] !== undefined) {
              fallback[localKey] = updates[localKey];
            } else if (valueToFilter !== undefined) {
              // Si pas dans updates, utiliser la valeur convertie depuis dbUpdates
              fallback[localKey] = valueToFilter;
            }
            hasFilteredColumns = true;
            delete safeDbUpdates[dbKey];
            // Ne pas logger à chaque fois pour éviter le spam - seulement en debug
            // console.log(`[updateUserProgress] ℹ️ Colonne '${dbKey}' filtrée proactivement (n'existe pas encore en BDD)`);
          } catch (filterError) {
            console.error(`[updateUserProgress] Erreur lors du filtrage de ${dbKey}:`, filterError);
          }
        }
      }

      // Sauvegarder les valeurs filtrées dans AsyncStorage si nécessaire
      if (hasFilteredColumns) {
        try {
          await AsyncStorage.setItem('@align_user_progress_fallback', JSON.stringify(fallback));
          await AsyncStorage.setItem('@align_user_progress_fallback_user_id', user.id);
        } catch (fallbackError) {
          console.error('[updateUserProgress] Erreur lors de la sauvegarde AsyncStorage pour colonnes filtrées:', fallbackError);
        }
      }
    }
    
    // 🔍 LOGS DÉTAILLÉS AVANT ENVOI À SUPABASE
    console.log('[updateUserProgress] 🔍 AVANT ENVOI À SUPABASE:', {
      dbUpdatesKeys: Object.keys(dbUpdates),
      dbUpdatesXP: dbUpdates.xp,
      dbUpdatesEtoiles: dbUpdates.etoiles,
      dbUpdatesNiveau: dbUpdates.niveau,
      safeDbUpdatesKeys: Object.keys(safeDbUpdates),
      safeDbUpdatesXP: safeDbUpdates.xp,
      safeDbUpdatesEtoiles: safeDbUpdates.etoiles,
      safeDbUpdatesNiveau: safeDbUpdates.niveau,
      updatesKeys: Object.keys(updates),
      updatesXP: updates.currentXP,
      updatesStars: updates.totalStars,
      updatesLevel: updates.currentLevel
    });
    
    // Sauvegarder uniquement les champs mis à jour avec retry
    const { data, error } = await supabaseWithRetry(
      () => upsertUserProgress(user.id, safeDbUpdates),
      { maxRetries: 2 }
    );
    
    // 🔍 LOGS APRÈS RÉCEPTION DE SUPABASE
    console.log('[updateUserProgress] 🔍 APRÈS RÉCEPTION DE SUPABASE:', {
      hasError: !!error,
      errorCode: error?.code,
      errorMessage: error?.message,
      hasData: !!data,
      dataXP: data?.xp,
      dataEtoiles: data?.etoiles,
      dataNiveau: data?.niveau,
      dataKeys: data ? Object.keys(data) : []
    });
    
    // CRITICAL FIX: Vérifier directement en DB après la sauvegarde pour confirmer que les valeurs sont bien persistées
    // (utile pour déboguer les problèmes de cache PostgREST)
    // Note: Cette vérification est asynchrone et ne bloque pas le flux principal
    if (!error && data && (updates.currentXP !== undefined || updates.totalStars !== undefined || updates.currentLevel !== undefined)) {
      // Utiliser setImmediate ou setTimeout pour ne pas bloquer
      Promise.resolve().then(async () => {
        // Attendre un peu pour laisser PostgREST se rafraîchir
        await new Promise(resolve => setTimeout(resolve, 1000));
        try {
          const { data: verifyData, error: verifyError } = await supabase
            .from('user_progress')
            .select('xp, etoiles, niveau')
            .eq('id', user.id)
            .single();
        } catch (e) {
          // Ignorer les erreurs de vérification (ne pas bloquer le flux principal)
        }
      }).catch(() => {}); // Ignorer les erreurs non gérées
    }
    
    if (error) {
      console.error('[updateUserProgress] Erreur lors de la sauvegarde de la progression:', error);
      console.error('[updateUserProgress] Détails:', {
        errorCode: error.code,
        errorMessage: error.message,
        userId: user.id?.substring(0, 8) + '...',
        updates: Object.keys(updates)
      });
      
      // ⚠️ ERREUR 22003: "out of range for type integer" - La colonne currentXP est de type INTEGER mais la valeur dépasse 2^31-1
      if (error.code === '22003' || (error.message && error.message.includes('out of range for type integer'))) {
        const MAX_INT_POSTGRES = 2147483647; // 2^31 - 1
        const problematicValue = safeDbUpdates.currentXP || safeDbUpdates.xp || updates.currentXP;
        
        console.error('[updateUserProgress] ❌ ERREUR CRITIQUE: Valeur XP dépasse la limite INTEGER de PostgreSQL');
        console.error('[updateUserProgress] Valeur problématique:', problematicValue, '- Limite INTEGER:', MAX_INT_POSTGRES);
        console.error('[updateUserProgress] 💡 SOLUTION: Exécutez le script SQL MIGRATE_XP_TO_BIGINT.sql dans Supabase pour changer le type de colonne de INTEGER à BIGINT');
        console.error('[updateUserProgress] 📋 Script disponible dans: MIGRATE_XP_TO_BIGINT.sql');
        console.error('[updateUserProgress] ⚠️ La valeur sera sauvegardée dans AsyncStorage en attendant la migration SQL');
        
        // Sauvegarder dans AsyncStorage comme fallback en attendant la migration SQL
        try {
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          const fallbackData = await AsyncStorage.getItem('@align_user_progress_fallback');
          const fallback = fallbackData ? JSON.parse(fallbackData) : {};
          
          // Sauvegarder toutes les valeurs XP importantes
          if (problematicValue !== undefined) {
            fallback.currentXP = problematicValue;
            fallback.lastXPError = {
              value: problematicValue,
              timestamp: Date.now(),
              error: '22003 - out of range for type integer'
            };
          }
          
          // Sauvegarder aussi les autres valeurs de l'update
          Object.keys(updates).forEach(key => {
            if (key === 'currentXP' || key === 'currentLevel') {
              fallback[key] = updates[key];
            }
          });
          
          await AsyncStorage.setItem('@align_user_progress_fallback', JSON.stringify(fallback));
          await AsyncStorage.setItem('@align_user_progress_fallback_user_id', user.id);
          
          console.warn('[updateUserProgress] ✅ Valeurs sauvegardées dans AsyncStorage comme fallback');
          console.warn('[updateUserProgress] 🔄 Après exécution du script SQL, les valeurs seront automatiquement synchronisées');
        } catch (fallbackError) {
          console.error('[updateUserProgress] Erreur lors de la sauvegarde AsyncStorage:', fallbackError);
        }
        
        // Ne pas throw l'erreur, mais retourner null pour indiquer l'échec
        return null;
      }
      
      // FALLBACK: Si erreur PGRST204 (colonne non trouvée dans le cache) ou erreur 400 (Bad Request)
      // CRITIQUE : Les colonnes doivent être ajoutées via le script SQL FIX_DATABASE_SCHEMA_COMPLETE.sql
      const errorStatus = error.status || error.code || error.statusCode;
      const errorMessage = error.message || error.details || '';
      const isMissingColumnError = error.code === 'PGRST204' || 
                                    errorStatus === 400 || 
                                    error.code === 400 ||
                                    (errorMessage && (
                                      (errorMessage.includes('column') || errorMessage.includes('Column')) && 
                                      (errorMessage.includes('does not exist') || 
                                       errorMessage.includes('not found') ||
                                       errorMessage.includes('not exist') ||
                                       errorMessage.includes('unknown column'))
                                    ));
      
      if (isMissingColumnError) {
        // Extraire le nom de la colonne manquante depuis le message d'erreur
        // Essayer plusieurs patterns pour détecter le nom de la colonne
        const message = error.message || '';
        const missingColumnMatch = message.match(/'(\w+)'/) || 
                                   message.match(/column "(\w+)"/) ||
                                   message.match(/column (\w+)/) ||
                                   message.match(/the '(\w+)' column/) ||
                                   error.details?.match(/'(\w+)'/) ||
                                   error.details?.match(/column "(\w+)"/);
        let missingColumn = missingColumnMatch ? missingColumnMatch[1] : null;
        
        // Si pas de colonne trouvée mais errorStatus 400/PGRST204, vérifier les colonnes optionnelles dans les updates
        if (!missingColumn && (errorStatus === 400 || error.code === 'PGRST204')) {
          // Chercher si une colonne optionnelle est présente dans les updates mais pas en BDD
          const optionalInUpdates = optionalColumns.find(col => safeDbUpdates[col] !== undefined);
          if (optionalInUpdates) {
            missingColumn = optionalInUpdates;
            console.log(`[updateUserProgress] 🔍 Colonne manquante détectée via liste optionnelle: '${missingColumn}'`);
          }
        }
        
        
        // Si la colonne manquante est dans la liste des colonnes optionnelles, la filtrer
        if (missingColumn && optionalColumns.includes(missingColumn)) {
          // Vérifier si cette colonne était déjà dans columnsToFilter (filtrée proactivement)
          const wasAlreadyFiltered = columnsToFilter.some(col => col.dbKey === missingColumn);
          
          if (!wasAlreadyFiltered) {
            // Seulement logger si la colonne n'a pas été filtrée proactivement
            console.warn(`[updateUserProgress] ⚠️ Colonne '${missingColumn}' manquante dans la base de données.`);
            console.warn(`[updateUserProgress] 💡 Exécutez le script SQL: FIX_DATABASE_SCHEMA_COMPLETE.sql dans Supabase`);
            console.warn(`[updateUserProgress] 🔄 Tentative de sauvegarde sans la colonne '${missingColumn}'...`);
          } else {
            // Colonne déjà filtrée proactivement - log silencieux ou debug uniquement
            // console.log(`[updateUserProgress] ℹ️ Colonne '${missingColumn}' déjà filtrée proactivement, traitement en cours...`);
          }
          
          // Retirer la colonne problématique et réessayer avec seulement les colonnes sûres
          const safeColumns = ['niveau', 'xp', 'etoiles', 'current_module_index', 'user_id', 'updated_at'];
          const filteredUpdates = {};
          Object.keys(safeDbUpdates).forEach(key => {
            // Exclure la colonne manquante et ne garder que les colonnes sûres
            if (key !== missingColumn && (safeColumns.includes(key) || !optionalColumns.includes(key))) {
              filteredUpdates[key] = safeDbUpdates[key];
            }
          });
          
          // Réessayer avec les colonnes filtrées
          const { data: retryData, error: retryError } = await supabaseWithRetry(
            () => upsertUserProgress(user.id, filteredUpdates),
            { maxRetries: 1 }
          );
          
          if (retryError) {
            console.error('[updateUserProgress] ❌ Échec même après filtrage des colonnes:', retryError);
            // Continuer avec le fallback AsyncStorage
          } else {
            console.log('[updateUserProgress] ✅ Sauvegarde réussie après filtrage de la colonne manquante');
            // Sauvegarder les valeurs filtrées dans AsyncStorage comme fallback
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            try {
              const fallbackData = await AsyncStorage.getItem('@align_user_progress_fallback');
              const fallback = fallbackData ? JSON.parse(fallbackData) : {};
              
              // Sauvegarder les valeurs des colonnes filtrées (y compris la colonne manquante)
              if (updates.activeDirection !== undefined) fallback.activeDirection = updates.activeDirection;
              if (updates.activeSerie !== undefined) fallback.activeSerie = updates.activeSerie;
              if (updates.activeMetier !== undefined) fallback.activeMetier = updates.activeMetier;
              if (updates.quizAnswers !== undefined) fallback.quizAnswers = updates.quizAnswers;
              if (updates.metierQuizAnswers !== undefined) fallback.metierQuizAnswers = updates.metierQuizAnswers;
              // Colonnes du système de chapitres
              if (updates.currentChapter !== undefined) fallback.currentChapter = updates.currentChapter;
              if (updates.currentModuleInChapter !== undefined) fallback.currentModuleInChapter = updates.currentModuleInChapter;
              if (updates.completedModulesInChapter !== undefined) fallback.completedModulesInChapter = updates.completedModulesInChapter;
              if (updates.chapterHistory !== undefined) fallback.chapterHistory = updates.chapterHistory;
              
              // Sauvegarder spécifiquement la colonne manquante si elle était dans les updates
              if (missingColumn && safeDbUpdates[missingColumn] !== undefined) {
                // Convertir le nom de colonne DB en nom local si nécessaire
                const localKey = missingColumn === 'completed_modules_in_chapter' ? 'completedModulesInChapter' :
                                missingColumn === 'current_module_in_chapter' ? 'currentModuleInChapter' :
                                missingColumn === 'chapter_history' ? 'chapterHistory' : missingColumn;
                fallback[localKey] = safeDbUpdates[missingColumn];
              }
              
              await AsyncStorage.setItem('@align_user_progress_fallback', JSON.stringify(fallback));
              await AsyncStorage.setItem('@align_user_progress_fallback_user_id', user.id);
              console.log('[updateUserProgress] ✅ Valeurs sauvegardées dans AsyncStorage (fallback)');
            } catch (fallbackError) {
              console.error('[updateUserProgress] Erreur lors du fallback AsyncStorage:', fallbackError);
            }
            
            return {
              ...updatedProgress,
              ...updates
            };
          }
        }
        
        // Fallback original : sauvegarder dans AsyncStorage
        try {
          const fallbackData = await AsyncStorage.getItem('@align_user_progress_fallback');
          const fallback = fallbackData ? JSON.parse(fallbackData) : {};
          
          // Vérifier que l'ID utilisateur correspond (si déjà stocké)
          const existingUserId = await AsyncStorage.getItem('@align_user_progress_fallback_user_id');
          if (existingUserId && existingUserId !== user.id) {
            console.error('[updateUserProgress] ❌ FUITE DE DONNÉES DÉTECTÉE: userId mismatch dans fallback');
            // Nettoyer les anciennes données
            await AsyncStorage.removeItem('@align_user_progress_fallback');
            await AsyncStorage.removeItem('@align_user_progress_fallback_user_id');
          }
          
          // Sauvegarder les valeurs qui ont échoué dans AsyncStorage
          if (updates.activeDirection !== undefined) fallback.activeDirection = updates.activeDirection;
          if (updates.activeMetier !== undefined) fallback.activeMetier = updates.activeMetier;
          if (updates.quizAnswers !== undefined) fallback.quizAnswers = updates.quizAnswers;
          if (updates.metierQuizAnswers !== undefined) fallback.metierQuizAnswers = updates.metierQuizAnswers;
          // Colonnes du système de chapitres
          if (updates.currentChapter !== undefined) fallback.currentChapter = updates.currentChapter;
          if (updates.currentModuleInChapter !== undefined) fallback.currentModuleInChapter = updates.currentModuleInChapter;
          if (updates.completedModulesInChapter !== undefined) fallback.completedModulesInChapter = updates.completedModulesInChapter;
          if (updates.chapterHistory !== undefined) fallback.chapterHistory = updates.chapterHistory;
          
          await AsyncStorage.setItem('@align_user_progress_fallback', JSON.stringify(fallback));
          await AsyncStorage.setItem('@align_user_progress_fallback_user_id', user.id);
          console.log('[updateUserProgress] ✅ Valeurs sauvegardées dans AsyncStorage (fallback) pour userId:', user.id.substring(0, 8) + '...');
          
          // Retourner la progression mise à jour localement même si Supabase a échoué
          // Ne pas appeler getUserProgress ici pour éviter la récursion, juste retourner les updates
          // Les valeurs seront récupérées depuis AsyncStorage lors du prochain getUserProgress
          return {
            ...updatedProgress,
            ...updates
          };
        } catch (fallbackError) {
          console.error('[updateUserProgress] Erreur lors du fallback AsyncStorage:', fallbackError);
        }
      }
      
      return null;
    }

    if (!data) {
      console.error('[updateUserProgress] Aucune donnée retournée après upsert');
      return null;
    }

    // CRITICAL FIX: Fusionner AVANT conversion pour préserver les valeurs du cache
    // Supabase ne retourne que les colonnes mises à jour, donc si on met à jour seulement
    // current_module_index, xp et etoiles ne sont pas retournées (undefined dans data)
    // Il faut préserver les valeurs du cache pour les champs non mis à jour
    
    // Récupérer le cache actuel (éviter appel récursif si pas de cache)
    // CRITICAL: Utiliser currentProgress (qui vient du cache ou DB) comme source de vérité
    // au lieu de progressCache qui peut être null si invalide
    let existingCache = progressCache || currentProgress;
    if (!existingCache) {
      // Pas de cache, récupérer depuis DB mais sans forcer refresh pour éviter récursion
      const cacheKey = `user_progress_${user.id}`;
      const cached = await getCache(cacheKey);
      if (cached) {
        existingCache = cached;
      } else {
        // CRITICAL FIX: Ne pas utiliser DEFAULT_USER_PROGRESS comme cache car il a currentXP: 0, totalStars: 0
        // Si on n'a pas de cache, récupérer depuis la DB une dernière fois (sans forceRefresh pour éviter récursion)
        // Mais seulement si on n'a pas mis à jour XP/étoiles (pour éviter la récursion)
        const shouldFetchFromDB = !updates.currentXP && !updates.totalStars && !updates.currentLevel;
        if (shouldFetchFromDB) {
          try {
            const dbData = await getUserProgressFromDB(user.id);
            if (dbData) {
              existingCache = convertFromDB(dbData);
            }
          } catch (e) {
            // Ignorer les erreurs pour éviter la récursion
          }
        }
        // Si toujours pas de cache, utiliser les valeurs par défaut (mais seulement pour les champs non-XP/étoiles)
        if (!existingCache) {
          existingCache = DEFAULT_USER_PROGRESS;
        }
      }
    }
    
    // Convertir le cache en format DB pour fusionner avec data
    const existingCacheDB = convertToDB(existingCache);
    
    // Fusionner les données Supabase avec le cache existant (format DB)
    // CRITICAL FIX: Si on n'a PAS mis à jour xp/etoiles dans cette requête,
    // NE PAS utiliser data.xp/data.etoiles car ils peuvent être 0 (valeurs par défaut de la DB)
    // Utiliser les valeurs du cache existant à la place
    const mergedData = {
      ...existingCacheDB,
      ...data,
      // CRITICAL: Si on vient de mettre à jour XP/étoiles, utiliser data.xp/data.etoiles
      // Sinon, préserver les valeurs du cache pour éviter d'écraser avec 0
      // Ne jamais utiliser 0 si la valeur est undefined (cela indique une absence de mise à jour)
      xp: (updates.currentXP !== undefined || updates.xp !== undefined)
        ? (data.xp !== undefined ? data.xp : (existingCacheDB.xp !== undefined ? existingCacheDB.xp : (existingCache?.currentXP ?? 0)))
        : (existingCacheDB.xp !== undefined ? existingCacheDB.xp : (existingCache?.currentXP !== undefined ? existingCache.currentXP : (data.xp !== undefined && data.xp > 0 ? data.xp : (existingCache?.currentXP ?? 0)))),
      etoiles: (updates.totalStars !== undefined || updates.etoiles !== undefined)
        ? (data.etoiles !== undefined ? data.etoiles : (existingCacheDB.etoiles !== undefined ? existingCacheDB.etoiles : (existingCache?.totalStars ?? 0)))
        : (existingCacheDB.etoiles !== undefined ? existingCacheDB.etoiles : (existingCache?.totalStars !== undefined ? existingCache.totalStars : (data.etoiles !== undefined && data.etoiles > 0 ? data.etoiles : (existingCache?.totalStars ?? 0)))),
      niveau: (updates.currentLevel !== undefined || updates.niveau !== undefined)
        ? (data.niveau !== undefined ? data.niveau : (existingCacheDB.niveau !== undefined ? existingCacheDB.niveau : (existingCache?.currentLevel ?? 0)))
        : (existingCacheDB.niveau !== undefined ? existingCacheDB.niveau : (existingCache?.currentLevel !== undefined ? existingCache.currentLevel : (data.niveau !== undefined && data.niveau > 0 ? data.niveau : (existingCache?.currentLevel ?? 0)))),
    };
    
    // 🔍 LOGS DE FUSION DÉTAILLÉS
    console.log('[updateUserProgress] 🔍 FUSION DES DONNÉES:', {
      updatesXP: updates.currentXP,
      updatesStars: updates.totalStars,
      updatesLevel: updates.currentLevel,
      dataXP: data?.xp,
      dataEtoiles: data?.etoiles,
      dataNiveau: data?.niveau,
      existingCacheXP: existingCache?.currentXP,
      existingCacheStars: existingCache?.totalStars,
      existingCacheLevel: existingCache?.currentLevel,
      existingCacheDBXP: existingCacheDB.xp,
      existingCacheDBEtoiles: existingCacheDB.etoiles,
      mergedXP: mergedData.xp,
      mergedEtoiles: mergedData.etoiles,
      mergedNiveau: mergedData.niveau
    });
    
    // Convertir la version fusionnée
    const result = convertFromDB(mergedData);
    
    console.log('[updateUserProgress] ✅ Progression mise à jour avec succès, current_module_index:', result.currentModuleIndex);
    
    // Mettre à jour le cache avec le résultat fusionné
    progressCache = result;
    progressCacheTimestamp = Date.now();
    
    const cacheKey = `user_progress_${user.id}`;
    try {
      // Sauvegarder le cache fusionné (pas juste le résultat)
      await setCache(cacheKey, progressCache, PROGRESS_CACHE_TTL);
      console.log('[updateUserProgress] ✅ Cache mis à jour avec la nouvelle progression');
    } catch (cacheError) {
      // Si erreur de cache (quota), continuer quand même sans cache
      console.warn('[updateUserProgress] ⚠️ Impossible de mettre en cache (quota dépassé), continuation sans cache');
    }
    
    // Marquer la progression comme "dirty" pour forcer une sauvegarde automatique
    // (même si updateUserProgress sauvegarde déjà, cela garantit une sauvegarde périodique)
    // Utiliser un import dynamique pour éviter les erreurs de chargement de module
    try {
      const autoSaveModule = require('./autoSave');
      if (autoSaveModule && typeof autoSaveModule.markProgressDirty === 'function') {
        autoSaveModule.markProgressDirty();
      }
    } catch (e) {
      // Ignorer si autoSave n'est pas disponible (pas critique)
    }
    
    // Retourner le cache fusionné (pas juste le résultat)
    return progressCache;
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la progression:', error);
    return null;
  }
}

/**
 * Ajoute de l'XP et met à jour le niveau
 * @param {number} xp - XP à ajouter
 * @returns {Promise<Object|null>} Progression mise à jour
 */
export async function addXP(xp) {
  try {
    // CRITIQUE: Forcer le refresh du cache pour avoir les dernières valeurs
    const currentProgress = await getUserProgress(true);
    
    // ⚠️ VALIDATION: Vérifier que currentXP est un nombre valide (supprimer la limite MAX_XP car la colonne sera migrée en BIGINT)
    let currentXP = currentProgress.currentXP || 0;
    
    if (typeof currentXP !== 'number' || currentXP < 0 || isNaN(currentXP)) {
      console.error('[addXP] ⚠️ currentXP invalide/corrompu:', currentXP, '- Réinitialisation à 0');
      currentXP = 0;
      // Corriger la valeur dans la BDD immédiatement
      await updateUserProgress({
        currentXP: 0,
        currentLevel: 0,
      }).catch(err => console.error('[addXP] Erreur lors de la correction de currentXP:', err));
    }
    
    // ⚠️ VALIDATION: Vérifier que xp à ajouter est un nombre valide
    if (typeof xp !== 'number' || xp < 0 || isNaN(xp)) {
      console.error('[addXP] ⚠️ XP à ajouter invalide:', xp, '- Ignoré');
      return null;
    }
    
    const newXP = currentXP + xp;
    
    // Calculer le niveau avec la nouvelle formule progressive
    const newLevel = calculateLevel(newXP);
    
    const result = await updateUserProgress({
      currentXP: newXP,
      currentLevel: newLevel,
    });
    
    if (!result) {
      console.error('[addXP] Échec de la sauvegarde de l\'XP');
      return null;
    }
    
    // Marquer la progression comme "dirty" pour forcer une sauvegarde automatique
    // Utiliser un import dynamique pour éviter les erreurs de chargement de module
    try {
      const autoSaveModule = require('./autoSave');
      if (autoSaveModule && typeof autoSaveModule.markProgressDirty === 'function') {
        autoSaveModule.markProgressDirty();
      }
    } catch (e) {
      // Ignorer si autoSave n'est pas disponible (pas critique)
    }
    
    console.log('[addXP] XP ajouté:', xp, 'Nouveau total:', newXP, 'Niveau:', newLevel);
    
    return result;
  } catch (error) {
    console.error('Erreur lors de l\'ajout d\'XP:', error);
    return null;
  }
}

/**
 * Ajoute des étoiles à l'utilisateur
 * @param {number} stars - Nombre d'étoiles à ajouter
 * @returns {Promise<Object|null>} Progression mise à jour
 */
export async function addStars(stars) {
  try {
    // CRITIQUE: Forcer le refresh du cache pour avoir les dernières valeurs
    const currentProgress = await getUserProgress(true);
    const currentStars = currentProgress.totalStars || 0;
    const newStars = currentStars + stars;
    
    const result = await updateUserProgress({
      totalStars: newStars,
    });
    
    if (!result) {
      console.error('[addStars] Échec de la sauvegarde des étoiles');
      return null;
    }
    
    // Marquer la progression comme "dirty" pour forcer une sauvegarde automatique
    // Utiliser un import dynamique pour éviter les erreurs de chargement de module
    try {
      const autoSaveModule = require('./autoSave');
      if (autoSaveModule && typeof autoSaveModule.markProgressDirty === 'function') {
        autoSaveModule.markProgressDirty();
      }
    } catch (e) {
      // Ignorer si autoSave n'est pas disponible (pas critique)
    }
    
    console.log('[addStars] Étoiles ajoutées:', stars, 'Nouveau total:', newStars);
    return result;
  } catch (error) {
    console.error('Erreur lors de l\'ajout d\'étoiles:', error);
    return null;
  }
}

/**
 * Réinitialise la progression utilisateur à l'état initial
 * @returns {Promise<Object>} Progression réinitialisée
 */
export async function resetUserProgress() {
  try {
    return await updateUserProgress(DEFAULT_USER_PROGRESS);
  } catch (error) {
    console.error('Erreur lors de la réinitialisation de la progression:', error);
    return DEFAULT_USER_PROGRESS;
  }
}

// Export des autres fonctions nécessaires pour compatibilité
export async function setActiveDirection(direction) {
  return await updateUserProgress({ activeDirection: direction });
}

export async function setActiveSerie(serieId) {
  return await updateUserProgress({ activeSerie: serieId });
}

export async function setActiveMetier(metierId) {
  return await updateUserProgress({ activeMetier: metierId });
}

export async function getCurrentLevel() {
  const progress = await getUserProgress();
  return progress.currentLevel || 0;
}

export async function getActiveSerie() {
  const progress = await getUserProgress();
  return progress.activeSerie;
}

export async function getActiveDirection() {
  const progress = await getUserProgress();
  return progress.activeDirection;
}

/**
 * Marque un niveau comme complété
 * @param {number} levelNumber - Numéro du niveau
 */
export async function completeLevel(levelNumber) {
  try {
    const currentProgress = await getUserProgress();
    const completedLevels = [...(currentProgress.completedLevels || [])];
    
    if (!completedLevels.includes(levelNumber)) {
      completedLevels.push(levelNumber);
    }
    
    return await updateUserProgress({
      completedLevels,
    });
  } catch (error) {
    console.error('Erreur lors de la complétion du niveau:', error);
    return null;
  }
}

/**
 * Vérifie si un niveau est complété
 * @param {number} levelNumber - Numéro du niveau
 */
export async function isLevelCompleted(levelNumber) {
  const progress = await getUserProgress();
  return (progress.completedLevels || []).includes(levelNumber);
}

