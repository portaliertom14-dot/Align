import { getCurrentUser } from '../services/auth';
import { getUserProgressFromDB, upsertUserProgress } from '../services/userService';
import { supabase } from '../services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { validateStoredUserId } from '../services/authCleanup';
import { getCache, setCache, clearCache } from './cache';
import { validateProgress } from './validation';
import { supabaseWithRetry, withRetry } from './retry';
import { calculateLevel, getTotalXPForLevel } from './progression';
import { SECTEUR_ID_TO_DIRECTION, DIRECTION_TO_SERIE, normalizeSecteurIdToV16 } from '../data/serieData';
import { normalizeJobKey } from '../domain/normalizeJobKey';

/**
 * Service de progression utilisateur avec Supabase
 * Synchronise les données avec la base de données Supabase
 */

// Verrou pour éviter les créations multiples de progression initiale
const initialProgressCreationLock = new Map(); // userId -> boolean

/**
 * CRITICAL: Flag pour éviter les écritures updateUserProgress pendant l'hydratation initiale.
 * true = en cours de chargement (getUserProgress depuis DB), false = hydratation terminée.
 * Les écritures sont skippées quand isHydratingProgress === true.
 */
let isHydratingProgress = false;

/**
 * CRITICAL: Helper pour gérer le cache AsyncStorage scoped par userId
 * Évite les fuites de données entre utilisateurs
 */
const getFallbackKey = (userId) => `@align_user_progress_fallback_${userId}`;

const getFallbackData = async (userId) => {
  try {
    const key = getFallbackKey(userId);
    const data = await AsyncStorage.getItem(key);
    if (!data) return null;
    const parsed = JSON.parse(data);
    // Vérifier que le userId dans les données correspond
    if (parsed.userId && parsed.userId !== userId) {
      console.error('[getFallbackData] ❌ FUITE DE DONNÉES: userId mismatch, purge cache');
      await AsyncStorage.removeItem(key);
      return null;
    }
    return parsed;
  } catch (error) {
    console.error('[getFallbackData] Erreur:', error);
    return null;
  }
};

const setFallbackData = async (userId, data) => {
  try {
    const key = getFallbackKey(userId);
    const dataWithUserId = { ...data, userId }; // Inclure userId dans les données
    await AsyncStorage.setItem(key, JSON.stringify(dataWithUserId));
  } catch (error) {
    console.error('[setFallbackData] Erreur:', error);
  }
};

const clearFallbackData = async (userId) => {
  try {
    const key = getFallbackKey(userId);
    await AsyncStorage.removeItem(key);
    // Nettoyer aussi les anciennes clés globales (migration)
    await AsyncStorage.removeItem('@align_user_progress_fallback');
    await AsyncStorage.removeItem('@align_user_progress_fallback_user_id');
  } catch (error) {
    console.error('[clearFallbackData] Erreur:', error);
  }
};

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
  maxUnlockedModuleIndex: 0, // BUG FIX: Index du module le plus élevé jamais déverrouillé (0, 1, ou 2)
  currentModuleInChapter: 0, // Index du module actuel dans le chapitre (0, 1, ou 2)
  completedModulesInChapter: [], // Modules complétés dans le chapitre actuel
  chapterHistory: [], // Historique des chapitres complétés
  loopLearningIndex: 0, // Rotation chapitre 10 apprentissage (pool infini)
  quizAnswers: {},
  metierQuizAnswers: {},
  // Flammes (streak) — mis à jour uniquement à la fin d'un module
  streakCount: 0,
  lastFlameDay: null,
  flameScreenSeenForDay: null,
  lastActivityAt: null,
  lastReminderStage: 0,
  lastReminderSentAt: null,
  /** Contexte secteur (quiz secteur) : debug.extractedAI du résultat Edge (styleCognitif, finaliteDominante, contexteDomaine, signauxTechExplicites). */
  activeSectorContext: null,
  /** Statut global seed modules IA: 'idle' | 'running' | 'done' | 'error'. Si !== 'done', Feed affiche "Préparation…" et poll. */
  modulesSeedStatus: 'idle',
  modulesSeedStartedAt: null,
  modulesSeedDoneAt: null,
};

/**
 * Convertit la progression Supabase en format local
 */
function convertFromDB(dbProgress) {
  if (!dbProgress) return DEFAULT_USER_PROGRESS;
  
  if (__DEV__) {
    console.log('[convertFromDB] 🔍 Conversion des données:', {
      rawXP: dbProgress.xp,
      rawEtoiles: dbProgress.etoiles,
      rawNiveau: dbProgress.niveau,
      currentChapter: dbProgress.currentChapter ?? dbProgress.currentchapter,
      completedModulesInChapter: dbProgress.completed_modules_in_chapter ?? dbProgress.completedModulesInChapter,
    });
  }
  
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
  
  if (__DEV__) {
    console.log('[convertFromDB] ✅ Valeurs converties:', {
      xp: xpNum,
      etoiles: etoilesNum,
      niveau: niveauNum,
      currentChapter: dbProgress.currentChapter ?? dbProgress.currentchapter ?? 1,
      maxUnlockedModuleIndex: dbProgress.max_unlocked_module_index ?? dbProgress.current_module_index,
    });
  }
  
  const activeMetier = dbProgress.activeMetier ?? dbProgress.activemetier ?? dbProgress.active_metier ?? null;
  const rawKey = dbProgress.activeMetierKey ?? dbProgress.activemetierkey ?? dbProgress.active_metier_key ?? null;
  // Dériver la clé à la lecture si absente (rétrocompatibilité)
  const activeMetierKey = rawKey || (activeMetier && typeof activeMetier === 'string' ? normalizeJobKey(activeMetier) : null);

  return {
    activeDirection: dbProgress.activeDirection ?? dbProgress.activedirection ?? null,
    activeSerie: dbProgress.activeSerie ?? dbProgress.activeserie ?? null,
    activeMetier,
    activeMetierKey,
    activeModule: dbProgress.activeModule ?? dbProgress.activemodule ?? 'mini_simulation_metier',
    currentChapter: dbProgress.currentChapter ?? dbProgress.currentchapter ?? 1,
    currentLesson: dbProgress.currentLesson ?? dbProgress.currentlesson ?? 1,
    currentLevel: niveauNum,
    currentXP: xpNum,
    completedLevels: dbProgress.completedLevels ?? dbProgress.completedlevels ?? [],
    totalStars: etoilesNum, // CRITICAL FIX: Utiliser etoilesNum au lieu de || 0 pour préserver 0 réel
    currentModuleIndex: typeof dbProgress.current_module_index === 'number' ? dbProgress.current_module_index : (typeof dbProgress.module_index_actuel === 'number' ? dbProgress.module_index_actuel : 0),
    maxUnlockedModuleIndex: typeof dbProgress.max_unlocked_module_index === 'number' ? dbProgress.max_unlocked_module_index : (typeof dbProgress.maxUnlockedModuleIndex === 'number' ? dbProgress.maxUnlockedModuleIndex : (typeof dbProgress.current_module_index === 'number' ? dbProgress.current_module_index : 0)), // BUG FIX: Charger max_unlocked_module_index, fallback sur current_module_index
    currentModuleInChapter: typeof dbProgress.current_module_in_chapter === 'number' ? dbProgress.current_module_in_chapter : 0,
    loopLearningIndex: typeof dbProgress.loop_learning_index === 'number' ? dbProgress.loop_learning_index : 0,
    completedModulesInChapter: (() => {
      const raw = dbProgress.completed_modules_in_chapter ?? dbProgress.completedModulesInChapter;
      if (Array.isArray(raw)) return raw;
      if (typeof raw === 'string') {
        try {
          const parsed = JSON.parse(raw);
          return Array.isArray(parsed) ? parsed : [];
        } catch (_) { return []; }
      }
      return [];
    })(),
    chapterHistory: Array.isArray(dbProgress.chapter_history) ? dbProgress.chapter_history : [],
    quizAnswers: dbProgress.quizAnswers ?? dbProgress.quizanswers ?? {},
    metierQuizAnswers: dbProgress.metierQuizAnswers ?? dbProgress.metierquizanswers ?? {},
    streakCount: typeof dbProgress.streak_count === 'number' ? dbProgress.streak_count : 0,
    lastFlameDay: dbProgress.last_flame_day ?? null,
    flameScreenSeenForDay: dbProgress.flame_screen_seen_for_day ?? null,
    lastActivityAt: dbProgress.last_activity_at ?? null,
    lastReminderStage: typeof dbProgress.last_reminder_stage === 'number' ? dbProgress.last_reminder_stage : 0,
    lastReminderSentAt: dbProgress.last_reminder_sent_at ?? null,
    activeSectorContext: (() => {
      const raw = dbProgress.activeSectorContext ?? dbProgress.active_sector_context;
      if (raw == null) return null;
      if (typeof raw === 'object') return raw;
      if (typeof raw === 'string') {
        try { return JSON.parse(raw); } catch (_) { return null; }
      }
      return null;
    })(),
    modulesSeedStatus: (dbProgress.modules_seed_status ?? dbProgress.modulesSeedStatus ?? 'idle') + '',
    modulesSeedStartedAt: dbProgress.modules_seed_started_at ?? dbProgress.modulesSeedStartedAt ?? null,
    modulesSeedDoneAt: dbProgress.modules_seed_done_at ?? dbProgress.modulesSeedDoneAt ?? null,
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
    max_unlocked_module_index: typeof localProgress.maxUnlockedModuleIndex === 'number' ? localProgress.maxUnlockedModuleIndex : (typeof localProgress.currentModuleIndex === 'number' ? localProgress.currentModuleIndex : 0), // BUG FIX: Inclure max_unlocked_module_index
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
  if (localProgress.activeMetierKey !== undefined) {
    dbProgress.activeMetierKey = localProgress.activeMetierKey || null;
  }
  if (localProgress.activeSectorContext !== undefined) {
    dbProgress.activeSectorContext = localProgress.activeSectorContext && typeof localProgress.activeSectorContext === 'object' ? localProgress.activeSectorContext : null;
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
  if (localProgress.loopLearningIndex !== undefined && typeof localProgress.loopLearningIndex === 'number') {
    dbProgress.loop_learning_index = Math.max(0, localProgress.loopLearningIndex);
  }
  if (localProgress.modulesSeedStatus !== undefined && typeof localProgress.modulesSeedStatus === 'string') {
    dbProgress.modules_seed_status = localProgress.modulesSeedStatus;
  }
  if (localProgress.modulesSeedStartedAt !== undefined) {
    dbProgress.modules_seed_started_at = localProgress.modulesSeedStartedAt || null;
  }
  if (localProgress.modulesSeedDoneAt !== undefined) {
    dbProgress.modules_seed_done_at = localProgress.modulesSeedDoneAt || null;
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
  if (localProgress.streakCount !== undefined) {
    dbProgress.streak_count = typeof localProgress.streakCount === 'number' ? localProgress.streakCount : 0;
  }
  if (localProgress.lastFlameDay !== undefined) {
    dbProgress.last_flame_day = localProgress.lastFlameDay || null;
  }
  if (localProgress.flameScreenSeenForDay !== undefined) {
    dbProgress.flame_screen_seen_for_day = localProgress.flameScreenSeenForDay || null;
  }
  if (localProgress.lastActivityAt !== undefined) {
    dbProgress.last_activity_at = localProgress.lastActivityAt || null;
  }
  if (localProgress.lastReminderStage !== undefined) {
    dbProgress.last_reminder_stage = typeof localProgress.lastReminderStage === 'number' ? localProgress.lastReminderStage : 0;
  }
  if (localProgress.lastReminderSentAt !== undefined) {
    dbProgress.last_reminder_sent_at = localProgress.lastReminderSentAt || null;
  }
  
  return dbProgress;
}

/**
 * Récupère la progression utilisateur depuis Supabase
 * Si la progression n'existe pas, la crée avec les valeurs par défaut
 * @returns {Promise<Object>} Progression sauvegardée
 */
// Cache pour éviter les appels DB répétés (scoped par userId pour éviter fuite entre utilisateurs)
let progressCache = null;
let progressCacheTimestamp = 0;
let progressCacheUserId = null;
const PROGRESS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes (augmenté de 30s pour réduire les appels DB)

/**
 * Invalide le cache de progression (mémoire + AsyncStorage pour l'utilisateur courant).
 * À appeler avant setActiveMetier/setActiveDirection pour éviter de servir un progress obsolète (sector/job).
 */
export async function invalidateProgressCache() {
  progressCache = null;
  progressCacheTimestamp = 0;
  progressCacheUserId = null;
  try {
    const user = await getCurrentUser();
    if (user?.id) await clearCache(`user_progress_${user.id}`);
  } catch (_) {}
  if (__DEV__) console.log('[USER_PROGRESS] Cache de progression invalidé');
}

export async function getUserProgress(forceRefresh = false) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      fetch('http://127.0.0.1:7242/ingest/5c2eef27-11e3-4b8c-8e26-574a50e47ac3',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'fbbe0c'},body:JSON.stringify({sessionId:'fbbe0c',location:'userProgressSupabase.js:getUserProgress',message:'getUserProgress no user',data:{},timestamp:Date.now(),hypothesisId:'C'})}).catch(()=>{});
      return DEFAULT_USER_PROGRESS;
    }

    // CRITICAL: Ne jamais servir le cache d'un autre utilisateur (ex. après connexion avec un autre compte)
    const didInvalidateDueToUserChange = progressCache !== null && progressCacheUserId !== user.id;
    if (didInvalidateDueToUserChange) {
      progressCache = null;
      progressCacheTimestamp = 0;
      progressCacheUserId = null;
      if (__DEV__) console.log('[USER_PROGRESS] Cache invalidé (changement d’utilisateur)');
    }
    fetch('http://127.0.0.1:7242/ingest/5c2eef27-11e3-4b8c-8e26-574a50e47ac3',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'fbbe0c'},body:JSON.stringify({sessionId:'fbbe0c',location:'userProgressSupabase.js:getUserProgress',message:'getUserProgress entry',data:{currentUserIdSlice:user?.id?.slice(0,8),cacheUserIdSlice:progressCacheUserId?.slice(0,8),didInvalidateDueToUserChange},timestamp:Date.now(),hypothesisId:'C_E'})}).catch(()=>{});

    // CRITIQUE: Si le cache a été mis à jour récemment (dans les 3 dernières secondes),
    // l'utiliser même en mode forceRefresh pour éviter le cache PostgREST obsolète
    const now = Date.now();
    const RECENT_UPDATE_THRESHOLD = 3000; // 3 secondes
    const isRecentUpdate = progressCache && (now - progressCacheTimestamp) < RECENT_UPDATE_THRESHOLD;
    const cacheAge = progressCache ? (now - progressCacheTimestamp) : null;
    
    // Vérifier le cache en mémoire (plus rapide que AsyncStorage)
    if (!forceRefresh && progressCache && (now - progressCacheTimestamp) < PROGRESS_CACHE_TTL) {
      if (__DEV__) console.log('[CACHE_HIT] progress');
      return progressCache;
    }
    // Quand forceRefresh=true (ex: ouverture module dynamique), ne jamais utiliser le cache récent :
    // il peut contenir un ancien sectorId/jobId et afficher le mauvais métier.
    if (forceRefresh && isRecentUpdate) {
      // Skip cache when caller asked for refresh (e.g. ChapterModules before fetchDynamicModules).
    } else if (isRecentUpdate) {
      const cacheHasMetier = progressCache?.activeMetier != null && progressCache?.activeMetier !== '';
      if (cacheHasMetier) {
        if (__DEV__) console.log('[getUserProgress] Cache récent détecté, utilisation du cache local');
        return progressCache;
      }
    }
    const cacheKey = `user_progress_${user.id}`;
    if (!forceRefresh) {
      const cached = await getCache(cacheKey);
      if (cached) {
        if (__DEV__) console.log('[CACHE_HIT] progress storage');
        progressCache = cached;
        progressCacheTimestamp = now;
        progressCacheUserId = user.id;
        return cached;
      }
    }

    // Récupérer depuis la DB avec retry (optimisé : 1 retry seulement pour des performances optimales)
    // CRITICAL FIX: getUserProgressFromDB retourne directement data ou null, pas { data, error }
    // Il faut l'appeler directement et gérer les erreurs manuellement
    // HYDRATION: Marquer le début de l'hydratation — updateUserProgress skippera les écritures
    isHydratingProgress = true;
    try {
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
          progressCacheUserId = user.id;
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
          progressCache = cached;
          progressCacheTimestamp = Date.now();
          progressCacheUserId = user.id;
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
        await new Promise(resolve => setTimeout(resolve, 500));
        // getUserProgressFromDB retourne data | null, pas { data, error }
        const retryData = await supabaseWithRetry(
          () => getUserProgressFromDB(user.id),
          { maxRetries: 1, initialDelay: 200 }
        );
        if (retryData) {
          const progress = convertFromDB(retryData);
          progressCache = progress;
          progressCacheTimestamp = now;
          progressCacheUserId = user.id;
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
          progressCacheUserId = user.id;
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
        max_unlocked_module_index: 0,
        activeModule: 'mini_simulation_metier',
        currentChapter: 1,
        currentLesson: 1,
        completedLevels: [],
        quizAnswers: {},
        metierQuizAnswers: {},
        activeDirection: 'ingenierie_tech', // Secteur par défaut pour le seed modules (compte existant / login)
      };
      
      // Upsert atomique : évite 409 duplicate et double création
      const payload = {
        id: user.id,
        ...dbProgress,
        updated_at: new Date().toISOString(),
      };
      const { data: newData, error: createError } = await supabase
        .from('user_progress')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();

      // 409 ou conflit : traiter comme succès → refetch
      if (createError && (createError.code === '23505' || createError.status === 409)) {
        console.log('[USER_PROGRESS] Conflit (409/23505), récupération...');
        const existing = await getUserProgressFromDB(user.id);
        if (existing) {
          const progress = convertFromDB(existing);
          progressCache = progress;
          progressCacheTimestamp = now;
          progressCacheUserId = user.id;
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
        // CRITICAL: Clé scoped par userId pour éviter les fuites
        try {
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          const fallbackKey = `@align_user_progress_fallback_${user.id}`;
          const fallbackData = { ...initialProgress, userId: user.id }; // Inclure userId dans les données
          await AsyncStorage.setItem(fallbackKey, JSON.stringify(fallbackData));
          console.log('[USER_PROGRESS] ✅ Progression sauvegardée dans AsyncStorage (fallback scoped)');
        } catch (fallbackError) {
          console.error('[USER_PROGRESS] Erreur lors du fallback AsyncStorage:', fallbackError);
        }
        return initialProgress;
      }
      
      // Retourner la progression créée (conversion depuis DB)
      if (!newData) {
        const refetched = await getUserProgressFromDB(user.id);
        if (refetched) {
          const progress = convertFromDB(refetched);
          progressCache = progress;
          progressCacheTimestamp = now;
          progressCacheUserId = user.id;
          await setCache(cacheKey, progress, PROGRESS_CACHE_TTL);
          return progress;
        }
        return { ...initialProgress };
      }
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

    if (__DEV__) {
      console.log('[getUserProgress] fetch DB — session userId:', user.id?.substring(0, 8) + '...', '| chapitre:', progress.currentChapter, '| completedModulesInChapter:', progress.completedModulesInChapter, '| maxUnlockedModuleIndex:', progress.maxUnlockedModuleIndex);
    }
    
    // FALLBACK: Si les valeurs ne sont pas dans la BDD (cache PostgREST non rafraîchi),
    // essayer de les récupérer depuis AsyncStorage comme stockage temporaire
    // CRITICAL: Utiliser des clés scoped par userId pour éviter les fuites de données
    try {
      // CRITICAL FIX: Utiliser helper scoped par userId
      const fallback = await getFallbackData(user.id);
      
      if (fallback) {
        if (__DEV__) console.log('[getUserProgress] Fallback AsyncStorage utilisé');
        if (fallback.activeDirection && (!progress.activeDirection || progress.activeDirection === null)) {
          progress.activeDirection = fallback.activeDirection;
        }
        if (fallback.activeMetier && (!progress.activeMetier || progress.activeMetier === null)) {
          progress.activeMetier = fallback.activeMetier;
        }
        if (fallback.quizAnswers && Object.keys(fallback.quizAnswers).length > 0) {
          if (!progress.quizAnswers || Object.keys(progress.quizAnswers).length === 0) {
            progress.quizAnswers = fallback.quizAnswers;
          }
        }
        if (fallback.metierQuizAnswers && Object.keys(fallback.metierQuizAnswers).length > 0) {
          if (!progress.metierQuizAnswers || Object.keys(progress.metierQuizAnswers).length === 0) {
            progress.metierQuizAnswers = fallback.metierQuizAnswers;
          }
        }
        if (typeof fallback.currentChapter === 'number' && fallback.currentChapter > 0) {
          progress.currentChapter = fallback.currentChapter;
        }
        if (typeof fallback.currentModuleInChapter === 'number') {
          progress.currentModuleInChapter = fallback.currentModuleInChapter;
        }
        if (Array.isArray(fallback.completedModulesInChapter)) {
          progress.completedModulesInChapter = fallback.completedModulesInChapter;
        }
        if (Array.isArray(fallback.chapterHistory)) {
          progress.chapterHistory = fallback.chapterHistory;
        }
        if (fallback.activeSectorContext != null && typeof fallback.activeSectorContext === 'object') {
          progress.activeSectorContext = fallback.activeSectorContext;
        }
      } else {
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
      if (__DEV__) console.error('[getUserProgress] Erreur fallback:', e?.message ?? e);
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

    // Migration: si activeMetier toujours null, tenter l'ancienne clé AsyncStorage (lib/userProgress)
    if (!progress.activeMetier) {
      try {
        const legacyJson = await AsyncStorage.getItem('@align_user_progress');
        if (legacyJson) {
          const legacy = JSON.parse(legacyJson);
          if (legacy.activeMetier) {
            progress.activeMetier = legacy.activeMetier;
            if (__DEV__) console.log('[getUserProgress] activeMetier récupéré depuis clé legacy');
            updateUserProgress({ activeMetier: legacy.activeMetier }).catch(() => {});
          }
        }
      } catch (_) {}
    }
    
    if (__DEV__) {
      console.log('[getUserProgress] 📊 Progression finale — chapitre:', progress.currentChapter, '| modules unlock:', progress.maxUnlockedModuleIndex, '| completedInChapter:', progress.completedModulesInChapter?.length ?? 0);
    }
    
    
    // ⚠️ VALIDATION: Vérifier que currentXP est un nombre valide (supprimer la limite MAX_XP car la colonne sera migrée en BIGINT)
    if (typeof progress.currentXP !== 'number' || progress.currentXP < 0 || isNaN(progress.currentXP)) {
      if (__DEV__) console.warn('[getUserProgress] currentXP invalide, réinitialisation à 0');
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
    progressCacheUserId = user.id;
    try {
      await setCache(cacheKey, progress, PROGRESS_CACHE_TTL);
    } catch (cacheError) {
      // Si erreur de cache (quota), continuer quand même sans cache
      console.warn('[userProgress] Impossible de mettre en cache (quota dépassé), continuation sans cache');
    }
    
    return progress;
    } finally {
      isHydratingProgress = false;
    }
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

    // CRITICAL: Ne jamais écrire pendant l'hydratation initiale (évite la boucle login/Feed)
    if (isHydratingProgress) {
      if (__DEV__) console.log('[updateUserProgress] Skip write (isHydratingProgress=true)');
      return null;
    }
    
    // CRITICAL: Vérifier qu'un utilisateur est connecté AVANT toute opération
    const user = await getCurrentUser();
    if (!user) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('[updateUserProgress] ⚠️ Pas d\'utilisateur connecté, impossible de sauvegarder la progression. Ignoré.');
      }
      return null;
    }

    // Récupérer la progression actuelle depuis le cache si disponible, sinon depuis DB
    const currentProgress = progressCache || await getUserProgress(false);
    const mergedProgress = { ...currentProgress, ...updates };

    // Normalize: treat "unchanged" string as undefined (no update)
    const norm = (v) => (v === 'unchanged' ? undefined : v);

    // STRICT PATCH BUILDER: only include fields that are defined, not null, AND actually changed.
    const patch = {};

    const isDifferent = (oldVal, newVal) => {
      if (Array.isArray(oldVal) && Array.isArray(newVal)) {
        return JSON.stringify(oldVal) !== JSON.stringify(newVal);
      }
      if (typeof oldVal === 'object' && oldVal !== null && typeof newVal === 'object' && newVal !== null && !Array.isArray(oldVal) && !Array.isArray(newVal)) {
        return JSON.stringify(oldVal) !== JSON.stringify(newVal);
      }
      return oldVal !== newVal;
    };

    const uChapter = norm(updates.currentChapter);
    if (typeof uChapter === 'number' && uChapter !== currentProgress.currentChapter) {
      patch.currentChapter = uChapter;
    }
    const uCompleted = norm(updates.completedModulesInChapter);
    if (Array.isArray(uCompleted) && isDifferent(uCompleted, currentProgress.completedModulesInChapter ?? [])) {
      patch.completed_modules_in_chapter = uCompleted;
    }
    if (typeof updates.currentModuleIndex === 'number' && updates.currentModuleIndex !== (currentProgress.currentModuleIndex ?? -1)) {
      const v = Math.max(0, Math.min(2, updates.currentModuleIndex));
      patch.current_module_index = v;
    }
    if (typeof updates.maxUnlockedModuleIndex === 'number' && updates.maxUnlockedModuleIndex !== (currentProgress.maxUnlockedModuleIndex ?? -1)) {
      patch.max_unlocked_module_index = Math.max(0, Math.min(2, updates.maxUnlockedModuleIndex));
    }
    if (typeof updates.currentXP === 'number' && updates.currentXP >= 0 && updates.currentXP !== (currentProgress.currentXP ?? -1)) {
      patch.xp = updates.currentXP;
    }
    if (typeof updates.currentLevel === 'number' && updates.currentLevel >= 0 && updates.currentLevel !== (currentProgress.currentLevel ?? -1)) {
      patch.niveau = updates.currentLevel;
    }
    if (typeof updates.totalStars === 'number' && updates.totalStars >= 0 && updates.totalStars !== (currentProgress.totalStars ?? -1)) {
      patch.etoiles = updates.totalStars;
    }
    // Règle absolue : les quiz ne doivent jamais effacer secteur/métier. On ne met à jour que si la nouvelle valeur est non vide.
    const nonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;
    if (updates.activeDirection !== undefined && updates.activeDirection !== null && nonEmptyString(updates.activeDirection) && updates.activeDirection !== currentProgress.activeDirection) {
      patch.activeDirection = updates.activeDirection;
    }
    if (updates.activeSerie !== undefined && updates.activeSerie !== null && updates.activeSerie !== currentProgress.activeSerie) {
      patch.activeSerie = updates.activeSerie;
    }
    if (updates.activeMetier !== undefined && updates.activeMetier !== null && nonEmptyString(updates.activeMetier) && updates.activeMetier !== currentProgress.activeMetier) {
      patch.activeMetier = updates.activeMetier;
    }
    if (updates.activeMetierKey !== undefined && updates.activeMetierKey !== null && nonEmptyString(updates.activeMetierKey) && updates.activeMetierKey !== currentProgress.activeMetierKey) {
      patch.activeMetierKey = updates.activeMetierKey;
    }
    if (updates.activeModule !== undefined && updates.activeModule !== null && nonEmptyString(updates.activeModule) && updates.activeModule !== (currentProgress.activeModule ?? 'mini_simulation_metier')) {
      patch.activeModule = updates.activeModule;
    }
    if (updates.activeSectorContext !== undefined) {
      const next = updates.activeSectorContext && typeof updates.activeSectorContext === 'object' ? updates.activeSectorContext : null;
      const curr = currentProgress.activeSectorContext;
      if (next !== curr && (next == null || curr == null || JSON.stringify(next) !== JSON.stringify(curr))) {
        patch.activeSectorContext = next;
      }
    }
    if (typeof updates.currentLesson === 'number' && updates.currentLesson !== (currentProgress.currentLesson ?? -1)) {
      patch.currentLesson = updates.currentLesson;
    }
    if (Array.isArray(updates.completedLevels) && isDifferent(updates.completedLevels, currentProgress.completedLevels ?? [])) {
      patch.completedLevels = updates.completedLevels;
    }
    if (updates.quizAnswers !== undefined && updates.quizAnswers !== null && isDifferent(updates.quizAnswers, currentProgress.quizAnswers ?? {})) {
      patch.quizAnswers = updates.quizAnswers;
    }
    if (updates.metierQuizAnswers !== undefined && updates.metierQuizAnswers !== null && isDifferent(updates.metierQuizAnswers, currentProgress.metierQuizAnswers ?? {})) {
      patch.metierQuizAnswers = updates.metierQuizAnswers;
    }
    if (typeof updates.currentModuleInChapter === 'number' && updates.currentModuleInChapter !== (currentProgress.currentModuleInChapter ?? -1)) {
      patch.current_module_in_chapter = updates.currentModuleInChapter;
    }
    if (Array.isArray(updates.chapterHistory) && isDifferent(updates.chapterHistory, currentProgress.chapterHistory ?? [])) {
      patch.chapter_history = updates.chapterHistory;
    }
    if (typeof updates.loopLearningIndex === 'number' && updates.loopLearningIndex !== (currentProgress.loopLearningIndex ?? -1)) {
      patch.loop_learning_index = Math.max(0, updates.loopLearningIndex);
    }
    if (updates.modulesSeedStatus !== undefined && updates.modulesSeedStatus !== currentProgress.modulesSeedStatus) {
      patch.modules_seed_status = updates.modulesSeedStatus;
    }
    if (updates.modulesSeedStartedAt !== undefined) {
      patch.modules_seed_started_at = updates.modulesSeedStartedAt || null;
    }
    if (updates.modulesSeedDoneAt !== undefined) {
      patch.modules_seed_done_at = updates.modulesSeedDoneAt || null;
    }
    if (typeof updates.streakCount === 'number' && updates.streakCount !== (currentProgress.streakCount ?? -1)) {
      patch.streak_count = updates.streakCount;
    }
    if (updates.lastFlameDay !== undefined && updates.lastFlameDay !== currentProgress.lastFlameDay) {
      patch.last_flame_day = updates.lastFlameDay;
    }
    if (updates.flameScreenSeenForDay !== undefined && updates.flameScreenSeenForDay !== currentProgress.flameScreenSeenForDay) {
      patch.flame_screen_seen_for_day = updates.flameScreenSeenForDay;
    }
    if (updates.lastActivityAt !== undefined && updates.lastActivityAt !== null && updates.lastActivityAt !== currentProgress.lastActivityAt) {
      patch.last_activity_at = updates.lastActivityAt;
    }
    if (typeof updates.lastReminderStage === 'number' && updates.lastReminderStage !== (currentProgress.lastReminderStage ?? -1)) {
      patch.last_reminder_stage = updates.lastReminderStage;
    }
    if (updates.lastReminderSentAt !== undefined && updates.lastReminderSentAt !== currentProgress.lastReminderSentAt) {
      patch.last_reminder_sent_at = updates.lastReminderSentAt;
    }
    if (Array.isArray(updates.quetesCompletes) && isDifferent(updates.quetesCompletes, currentProgress.quetesCompletes ?? [])) {
      patch.quetes_completes = updates.quetesCompletes;
    }
    if (updates.progressionQuetes !== undefined && updates.progressionQuetes !== null && isDifferent(updates.progressionQuetes, currentProgress.progressionQuetes ?? {})) {
      patch.progression_quetes = updates.progressionQuetes;
    }
    if (updates.quests !== undefined && updates.quests !== null && isDifferent(updates.quests, currentProgress.quests ?? null)) {
      patch.quests = updates.quests;
    }

    if (Object.keys(patch).length === 0) {
      console.log('[updateUserProgress] skip (no real changes)');
      return currentProgress; // no cache invalidation
    }

    console.log('[updateUserProgress] write — patch keys:', Object.keys(patch).join(', '));

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
    const optionalColumns = ['activeDirection', 'activeSerie', 'activeMetier', 'activeMetierKey', 'activeModule',
                            'currentChapter', 'currentLesson', 'completedLevels',
                            'quizAnswers', 'metierQuizAnswers',
                            'current_module_in_chapter', 'completed_modules_in_chapter', 'chapter_history',
                            'loop_learning_index', 'activeSectorContext',
                            'modules_seed_status', 'modules_seed_started_at', 'modules_seed_done_at'];
    
    // Colonnes sûres qui existent toujours dans la base de données
    // IMPORTANT: Ne pas inclure les colonnes de chapitres ici car elles n'existent pas encore en BDD
    // ('chapter_history', 'completed_modules_in_chapter', 'current_module_in_chapter')
    // Elles seront filtrées proactivement avant l'envoi à Supabase et sauvegardées dans AsyncStorage
    const safeColumns = ['niveau', 'xp', 'etoiles', 'current_module_index', 'user_id', 'updated_at'];
    
    // Colonnes à filtrer : vides si les colonnes existent en BDD (add_chapter_columns.sql)
    // Persistance chapitres : envoyer à Supabase pour éviter perte après logout
    const columnsToFilter = [];
    
    // Filtrer les colonnes optionnelles pour éviter les erreurs PGRST204
    // (Désactiver ce filtre après exécution du script SQL)
    let safeDbUpdates = {};
    const filteredValues = {};
    
    if (filterOptionalColumns) {
      // Mode FILTRÉ: Ne garder que les colonnes sûres
      Object.keys(patch).forEach(key => {
        if (safeColumns.includes(key) || !optionalColumns.includes(key)) {
          safeDbUpdates[key] = patch[key];
        } else {
          // Colonne optionnelle : sauvegarder dans AsyncStorage comme fallback
          filteredValues[key] = patch[key];
          console.log(`[updateUserProgress] ⚠️ Colonne optionnelle '${key}' filtrée (à ajouter via SQL). Valeur sauvegardée dans AsyncStorage.`);
        }
      });
      
      // Sauvegarder les valeurs des colonnes filtrées dans AsyncStorage
      if (Object.keys(filteredValues).length > 0) {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        try {
          // CRITICAL: Utiliser helper scoped par userId
          const fallback = await getFallbackData(user.id) || {};
          Object.assign(fallback, filteredValues);
          await setFallbackData(user.id, fallback);
          console.log(`[updateUserProgress] ✅ ${Object.keys(filteredValues).length} colonne(s) optionnelle(s) sauvegardée(s) dans AsyncStorage`);
          console.log(`[updateUserProgress] 💡 Exécutez FIX_USER_PROGRESS_COLUMNS_SIMPLE.sql dans Supabase pour activer ces colonnes`);
        } catch (fallbackError) {
          console.error('[updateUserProgress] Erreur lors de la sauvegarde AsyncStorage:', fallbackError);
        }
      }
    } else {
      // Mode NORMAL: Envoyer toutes les colonnes (après exécution du script SQL)
      // MAIS filtrer proactivement les colonnes connues pour ne pas exister en BDD
      safeDbUpdates = { ...patch };
      
      // Filtrer proactivement les colonnes qui n'existent pas encore en BDD
      // Elles seront sauvegardées dans AsyncStorage via le fallback
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      // CRITICAL: Utiliser helper scoped par userId
      let fallback = await getFallbackData(user.id) || {};

      // Filtrer proactivement les colonnes qui n'existent pas en BDD
      let hasFilteredColumns = false;
      for (const { dbKey, localKey } of columnsToFilter) {
        const valueToFilter = safeDbUpdates[dbKey] !== undefined ? safeDbUpdates[dbKey] : 
                              patch[dbKey] !== undefined ? patch[dbKey] : undefined;
        
        if (valueToFilter !== undefined) {
          try {
            // Sauvegarder la valeur dans AsyncStorage (utiliser le nom local)
            if (updates[localKey] !== undefined) {
              fallback[localKey] = updates[localKey];
            } else if (valueToFilter !== undefined) {
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
          // CRITICAL: Utiliser helper scoped par userId
          await setFallbackData(user.id, fallback);
        } catch (fallbackError) {
          console.error('[updateUserProgress] Erreur lors de la sauvegarde AsyncStorage pour colonnes filtrées:', fallbackError);
        }
      }
    }
    
    // patch keys already logged above before filterOptionalColumns
    
    // Sauvegarder uniquement les champs mis à jour avec retry
    const { data, error } = await supabaseWithRetry(
      () => upsertUserProgress(user.id, safeDbUpdates),
      { maxRetries: 2 }
    );
    
    if (__DEV__ && !error) {
      console.log('[updateUserProgress] write OK — currentChapter:', data?.currentChapter ?? data?.currentchapter, '| completed_modules_in_chapter:', data?.completed_modules_in_chapter?.length ?? 0);
    }
    
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
          // CRITICAL: Utiliser helper scoped par userId
          const fallback = await getFallbackData(user.id) || {};
          
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
          
          // CRITICAL: Utiliser helper scoped par userId
          await setFallbackData(user.id, fallback);
          
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
            // CRITICAL: Utiliser helper scoped par userId
            try {
              const fallback = await getFallbackData(user.id) || {};
              
              // Sauvegarder les valeurs des colonnes filtrées (y compris la colonne manquante)
              if (updates.activeDirection !== undefined) fallback.activeDirection = updates.activeDirection;
              if (updates.activeSerie !== undefined) fallback.activeSerie = updates.activeSerie;
              if (updates.activeMetier !== undefined) fallback.activeMetier = updates.activeMetier;
              if (updates.activeMetierKey !== undefined) fallback.activeMetierKey = updates.activeMetierKey;
              if (updates.activeSectorContext !== undefined) fallback.activeSectorContext = updates.activeSectorContext;
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
                                missingColumn === 'chapter_history' ? 'chapterHistory' :
                                missingColumn === 'loop_learning_index' ? 'loopLearningIndex' : missingColumn;
                fallback[localKey] = safeDbUpdates[missingColumn];
              }
              
              // CRITICAL: Utiliser helper scoped par userId
              await setFallbackData(user.id, fallback);
              console.log('[updateUserProgress] ✅ Valeurs sauvegardées dans AsyncStorage (fallback scoped)');
            } catch (fallbackError) {
              console.error('[updateUserProgress] Erreur lors du fallback AsyncStorage:', fallbackError);
            }
            
            return mergedProgress;
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
          if (updates.activeMetierKey !== undefined) fallback.activeMetierKey = updates.activeMetierKey;
          if (updates.activeSectorContext !== undefined) fallback.activeSectorContext = updates.activeSectorContext;
          if (updates.quizAnswers !== undefined) fallback.quizAnswers = updates.quizAnswers;
          if (updates.metierQuizAnswers !== undefined) fallback.metierQuizAnswers = updates.metierQuizAnswers;
          // Colonnes du système de chapitres
          if (updates.currentChapter !== undefined) fallback.currentChapter = updates.currentChapter;
          if (updates.currentModuleInChapter !== undefined) fallback.currentModuleInChapter = updates.currentModuleInChapter;
          if (updates.completedModulesInChapter !== undefined) fallback.completedModulesInChapter = updates.completedModulesInChapter;
          if (updates.chapterHistory !== undefined) fallback.chapterHistory = updates.chapterHistory;
          
          // CRITICAL: Utiliser helper scoped par userId
          await setFallbackData(user.id, fallback);
          console.log('[updateUserProgress] ✅ Valeurs sauvegardées dans AsyncStorage (fallback) pour userId:', user.id.substring(0, 8) + '...');
          
          // Retourner la progression mise à jour localement même si Supabase a échoué
          return mergedProgress;
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
    
    if (__DEV__) {
      console.log('[updateUserProgress] ✅ write success — chapitre:', result.currentChapter, '| maxUnlocked:', result.maxUnlockedModuleIndex, '| completedInChapter:', result.completedModulesInChapter?.length ?? 0);
    }
    
    // Mettre à jour le cache avec le résultat fusionné
    progressCache = result;
    progressCacheTimestamp = Date.now();
    progressCacheUserId = user.id;
    
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
  await invalidateProgressCache();
  const secteurIdToStore = normalizeSecteurIdToV16(direction);
  const directionName = SECTEUR_ID_TO_DIRECTION[secteurIdToStore];
  const serieId = directionName ? DIRECTION_TO_SERIE[directionName] : DIRECTION_TO_SERIE['Sciences & Technologies'];
  return await updateUserProgress({
    activeDirection: secteurIdToStore,
    activeSerie: serieId,
  });
}

export async function setActiveSerie(serieId) {
  return await updateUserProgress({ activeSerie: serieId });
}

/** Persiste le métier (titre affiché) et sa clé stable pour seed/edge (mini_simulation_metier). */
export async function setActiveMetier(metierId) {
  await invalidateProgressCache();
  const key = metierId && typeof metierId === 'string' ? normalizeJobKey(metierId) : null;
  const result = await updateUserProgress({ activeMetier: metierId || null, activeMetierKey: key || null });
  // Fire-and-forget seed V2 (user_modules) — pas d’await pour ne pas bloquer l’UI
  const { ensureSeedModules } = require('../services/userModulesService');
  getCurrentUser()
    .then((user) => user?.id && ensureSeedModules(user.id))
    .catch(() => {});
  return result;
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

