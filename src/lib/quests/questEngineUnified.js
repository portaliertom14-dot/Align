/**
 * Moteur de quêtes unifié V3
 * Système complet, robuste et scalable
 * 
 * FONCTIONNALITÉS:
 * - Trois types de quêtes (quotidiennes, hebdomadaires, performance)
 * - Adaptation automatique au niveau utilisateur
 * - Tracking temps actif et séries
 * - Renouvellement automatique
 * - Persistance Supabase + AsyncStorage
 * - Gestion d'événements
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUser } from '../../services/auth';
import { getUserProgress, updateUserProgress } from '../userProgressSupabase';
import { calculateLevel } from '../progression';
import { Quest, QuestSection, QUEST_STATUS, QUEST_TYPES } from './v2/questModel';
import { questEventEmitter, QUEST_EVENT_TYPES, emitQuestEvent } from './v2/events';
import { 
  generateDailyQuests, 
  generateWeeklyQuests, 
  generatePerformanceQuests,
  shouldRegenerateQuests,
  QUEST_CYCLE_TYPES 
} from './questGenerator';
import { 
  getActiveTimeMinutes, 
  recordActivity, 
  startActivitySession,
  resetActivityTracking 
} from './activityTracker';
import { 
  getPerfectSeriesCompleted, 
  getTotalSeriesCompleted,
  completeSeries as completeSeriesTracking,
  recordSeriesError,
  startSeries
} from './seriesTracker';

const STORAGE_KEY_PREFIX = '@align_quests_unified';

/** Logs debug quêtes (mettre à true pour diagnostiquer niveau/étoiles/temps) */
const DEBUG_QUESTS = false;

/**
 * Structure des données de quêtes
 */
class QuestData {
  constructor(data = {}) {
    this.userId = data.userId || null;
    this.dailyQuests = (data.dailyQuests || []).map(q => Quest.fromJSON(q));
    this.weeklyQuests = (data.weeklyQuests || []).map(q => Quest.fromJSON(q));
    this.performanceQuests = (data.performanceQuests || []).map(q => Quest.fromJSON(q));
    
    // Métadonnées de renouvellement
    this.lastDailyReset = data.lastDailyReset || null;
    this.lastWeeklyReset = data.lastWeeklyReset || null;
    this.lastPerformanceUpdate = data.lastPerformanceUpdate || null;
    
    // Tracking du cycle quotidien
    this.dailyCycleId = data.dailyCycleId || null;
    this.dailyStartTime = data.dailyStartTime || null;
    
    // Tracking du cycle hebdomadaire
    this.weeklyCycleId = data.weeklyCycleId || null;
    this.weeklyStartTime = data.weeklyStartTime || null;
    
    // Quêtes complétées dans la session (pour l'écran de récompense)
    this.completedInSession = (data.completedInSession || []).map(q => Quest.fromJSON(q));
    
    // Timestamp de dernière mise à jour
    this.lastUpdated = data.lastUpdated || new Date().toISOString();
  }

  toJSON() {
    return {
      userId: this.userId,
      dailyQuests: this.dailyQuests.map(q => q.toJSON()),
      weeklyQuests: this.weeklyQuests.map(q => q.toJSON()),
      performanceQuests: this.performanceQuests.map(q => q.toJSON()),
      lastDailyReset: this.lastDailyReset,
      lastWeeklyReset: this.lastWeeklyReset,
      lastPerformanceUpdate: this.lastPerformanceUpdate,
      dailyCycleId: this.dailyCycleId,
      dailyStartTime: this.dailyStartTime,
      weeklyCycleId: this.weeklyCycleId,
      weeklyStartTime: this.weeklyStartTime,
      completedInSession: [], // Ne jamais persister: récompenses uniquement au claim sur écran
      lastUpdated: this.lastUpdated,
    };
  }
}

/**
 * Moteur de quêtes unifié
 */
class UnifiedQuestEngine {
  constructor() {
    this.data = null;
    this.isInitialized = false;
    this.currentUserId = null;
    this.eventUnsubscribers = [];
  }

  /**
   * Initialise le moteur de quêtes
   */
  async initialize() {
    try {
      const user = await getCurrentUser();
      if (!user || !user.id) {
        console.log('[QuestEngine] Aucun utilisateur connecté');
        return false;
      }

      // Vérifier si l'utilisateur a changé
      if (this.isInitialized && this.currentUserId !== user.id) {
        console.log('[QuestEngine] Changement d\'utilisateur détecté, réinitialisation...');
        await this.deinitialize();
      }

      if (this.isInitialized) {
        return true; // Déjà initialisé pour cet utilisateur
      }

      this.currentUserId = user.id;

      // Charger les données
      await this.loadData();

      // Vérifier et renouveler les quêtes si nécessaire
      await this.checkAndRenewQuests();

      // S'abonner aux événements
      this.subscribeToEvents();

      // Démarrer le tracking d'activité
      await startActivitySession();

      this.isInitialized = true;
      console.log('[QuestEngine] ✅ Initialisé avec succès');
      return true;
    } catch (error) {
      console.error('[QuestEngine] Erreur lors de l\'initialisation:', error);
      return false;
    }
  }

  /**
   * Charge les données depuis le stockage
   * Priorité: Supabase > AsyncStorage > Nouvelle initialisation
   */
  async loadData() {
    try {
      const user = await getCurrentUser();
      if (!user || !user.id) {
        this.data = new QuestData();
        return;
      }

      // 1. Essayer de charger depuis Supabase
      const supabaseData = await this.loadFromSupabase();
      if (supabaseData && supabaseData.userId === user.id) {
        this.data = new QuestData(supabaseData);
        this.data.completedInSession = []; // Ne jamais restaurer: pas de récompense au login/reload
        console.log('[QuestEngine] 📥 Données chargées depuis Supabase');
        return;
      }

      // 2. Fallback: charger depuis AsyncStorage
      const storageKey = `${STORAGE_KEY_PREFIX}_${user.id}`;
      const dataJson = await AsyncStorage.getItem(storageKey);

      if (dataJson) {
        const parsed = JSON.parse(dataJson);
        
        // Vérifier que les données correspondent à l'utilisateur actuel
        if (parsed.userId && parsed.userId !== user.id) {
          console.warn('[QuestEngine] Données d\'un autre utilisateur, réinitialisation');
          this.data = await this.initializeNewData(user.id);
          return;
        }

        this.data = new QuestData(parsed);
        this.data.completedInSession = []; // Ne jamais restaurer: pas de récompense au login/reload
        console.log('[QuestEngine] Données chargées depuis AsyncStorage');
        
        // Synchroniser avec Supabase en arrière-plan
        this.saveToSupabase(this.data).catch(err => {
          console.warn('[QuestEngine] Erreur sync Supabase (non-bloquant):', err.message);
        });
      } else {
        // 3. Première initialisation
        this.data = await this.initializeNewData(user.id);
      }
    } catch (error) {
      console.error('[QuestEngine] Erreur lors du chargement:', error);
      this.data = new QuestData();
    }
  }

  /**
   * Initialise les données pour un nouvel utilisateur
   */
  async initializeNewData(userId) {
    console.log('[QuestEngine] Initialisation des données pour nouvel utilisateur');
    
    const [daily, weekly, performance] = await Promise.all([
      generateDailyQuests(),
      generateWeeklyQuests(),
      generatePerformanceQuests(),
    ]);

    const now = new Date().toISOString();

    const data = new QuestData({
      userId,
      dailyQuests: daily,
      weeklyQuests: weekly,
      performanceQuests: performance,
      lastDailyReset: now,
      lastWeeklyReset: now,
      lastPerformanceUpdate: now,
      dailyCycleId: `daily_${Date.now()}`,
      dailyStartTime: now,
      weeklyCycleId: `weekly_${Date.now()}`,
      weeklyStartTime: now,
      completedInSession: [],
      lastUpdated: now,
    });

    await this.saveData(data);
    return data;
  }

  /**
   * Sauvegarde les données
   */
  async saveData(data = null) {
    try {
      const dataToSave = data || this.data;
      if (!dataToSave) return;

      const user = await getCurrentUser();
      if (!user || !user.id) return;

      dataToSave.lastUpdated = new Date().toISOString();
      dataToSave.userId = user.id;

      // Sauvegarder dans AsyncStorage (rapide, toujours disponible)
      const storageKey = `${STORAGE_KEY_PREFIX}_${user.id}`;
      await AsyncStorage.setItem(storageKey, JSON.stringify(dataToSave.toJSON()));

      // Sauvegarder dans Supabase (synchronisation, backup)
      await this.saveToSupabase(dataToSave);

      console.log('[QuestEngine] ✅ Données sauvegardées');
    } catch (error) {
      console.error('[QuestEngine] Erreur lors de la sauvegarde:', error);
    }
  }

  /**
   * Sauvegarde dans Supabase
   */
  async saveToSupabase(data) {
    try {
      const user = await getCurrentUser();
      if (!user || !user.id) return;

      // Préparer les données pour Supabase
      const questsData = {
        dailyQuests: data.dailyQuests.map(q => q.toJSON()),
        weeklyQuests: data.weeklyQuests.map(q => q.toJSON()),
        performanceQuests: data.performanceQuests.map(q => q.toJSON()),
        lastDailyReset: data.lastDailyReset,
        lastWeeklyReset: data.lastWeeklyReset,
        lastPerformanceUpdate: data.lastPerformanceUpdate,
        dailyCycleId: data.dailyCycleId,
        weeklyCycleId: data.weeklyCycleId,
        lastUpdated: data.lastUpdated,
      };

      // Sauvegarder dans user_progress (colonne quests)
      // NOTE: user est déjà vérifié à la ligne 264, pas besoin de re-vérifier
      await updateUserProgress({
        quests: questsData,
      });

      console.log('[QuestEngine] ✅ Données synchronisées avec Supabase');
    } catch (error) {
      // Ne pas bloquer si Supabase échoue (AsyncStorage est le fallback)
      console.warn('[QuestEngine] ⚠️ Erreur Supabase (non-bloquant):', error.message);
    }
  }

  /**
   * Charge depuis Supabase
   */
  async loadFromSupabase() {
    try {
      const user = await getCurrentUser();
      if (!user || !user.id) return null;

      const userProgress = await getUserProgress();
      
      // Vérifier si les quêtes sont dans Supabase
      if (userProgress.quests && typeof userProgress.quests === 'object') {
        console.log('[QuestEngine] 📥 Données chargées depuis Supabase');
        return userProgress.quests;
      }

      return null;
    } catch (error) {
      console.warn('[QuestEngine] ⚠️ Erreur chargement Supabase:', error.message);
      return null;
    }
  }

  /**
   * Sync toutes les quêtes depuis la source de vérité (niveau, étoiles, temps actif).
   * À appeler avant chaque lecture (getActiveQuests / getQuestsByType) pour éviter incohérences.
   */
  async syncAllQuestsFromUserStats() {
    if (!this.data) return;

    const userProgress = await getUserProgress(true);
    const currentLevel = calculateLevel(userProgress?.currentXP || 0);
    const totalStars = userProgress?.totalStars ?? 0;
    const activeTimeMinutes = await getActiveTimeMinutes();

    if (DEBUG_QUESTS) {
      console.log('[QuestEngine] DEBUG sync stats:', { currentLevel, totalStars, activeTimeMinutes });
    }

    const allQuests = [
      ...this.data.dailyQuests,
      ...this.data.weeklyQuests,
      ...this.data.performanceQuests,
    ];
    let hasChanges = false;

    for (const quest of allQuests) {
      if (quest.status === QUEST_STATUS.COMPLETED) continue;

      let newProgress = quest.progress;
      let shouldComplete = false;

      if (quest.type === QUEST_TYPES.LEVEL_REACHED) {
        newProgress = Math.min(currentLevel, quest.target);
        shouldComplete = currentLevel >= quest.target;
        if (newProgress !== quest.progress) {
          quest.progress = newProgress;
          hasChanges = true;
        }
        if (shouldComplete && quest.status !== QUEST_STATUS.COMPLETED) {
          quest.status = QUEST_STATUS.COMPLETED;
          quest.completedAt = new Date().toISOString();
          if (!this.data.completedInSession.some(q => q.id === quest.id)) {
            this.data.completedInSession.push(quest);
          }
          hasChanges = true;
        }
      } else if (quest.type === QUEST_TYPES.STAR_EARNED) {
        const starsAtStart = quest.metadata?.starsAtQuestStart ?? 0;
        const delta = Math.max(0, totalStars - starsAtStart);
        newProgress = Math.min(delta, quest.target);
        shouldComplete = newProgress >= quest.target;
        if (newProgress !== quest.progress) {
          quest.progress = newProgress;
          hasChanges = true;
        }
        if (shouldComplete && quest.status !== QUEST_STATUS.COMPLETED) {
          quest.status = QUEST_STATUS.COMPLETED;
          quest.completedAt = new Date().toISOString();
          if (!this.data.completedInSession.some(q => q.id === quest.id)) {
            this.data.completedInSession.push(quest);
          }
          hasChanges = true;
        }
      } else if (quest.type === QUEST_TYPES.TIME_SPENT) {
        newProgress = Math.min(activeTimeMinutes, quest.target);
        shouldComplete = newProgress >= quest.target;
        if (newProgress !== quest.progress) {
          quest.progress = newProgress;
          hasChanges = true;
        }
        if (shouldComplete && quest.status !== QUEST_STATUS.COMPLETED) {
          quest.status = QUEST_STATUS.COMPLETED;
          quest.completedAt = new Date().toISOString();
          if (!this.data.completedInSession.some(q => q.id === quest.id)) {
            this.data.completedInSession.push(quest);
          }
          hasChanges = true;
        }
      }

      if (DEBUG_QUESTS && (quest.type === QUEST_TYPES.LEVEL_REACHED || quest.type === QUEST_TYPES.STAR_EARNED || quest.type === QUEST_TYPES.TIME_SPENT)) {
        console.log('[QuestEngine] DEBUG quest:', { title: quest.title, target: quest.target, progress: quest.progress, isCompleted: quest.isCompleted() });
      }
    }

    if (hasChanges) {
      await this.saveData();
    }
  }

  /**
   * Vérifie si les quêtes doivent être renouvelées
   */
  async checkAndRenewQuests() {
    if (!this.data) return;

    await this.syncAllQuestsFromUserStats();

    const now = new Date();
    let hasChanges = false;

    // 1. Quêtes quotidiennes : renouveler seulement si nouveau jour ET (aucune quête ou toutes complétées) — pool lock
    if (this.shouldRenewDaily(now)) {
      console.log('[QuestEngine] 🔄 Renouvellement des quêtes quotidiennes');
      await this.renewDailyQuests();
      hasChanges = true;
    }

    // 2. Quêtes hebdomadaires : renouveler seulement si nouvelle semaine ET (aucune ou toutes complétées) — pool lock
    if (await this.shouldRenewWeekly(now)) {
      console.log('[QuestEngine] 🔄 Renouvellement des quêtes hebdomadaires');
      await this.renewWeeklyQuests();
      hasChanges = true;
    }

    // 3. Mettre à jour les quêtes de performance (niveau)
    await this.updatePerformanceQuests();

    if (hasChanges) {
      await this.saveData();
    }
  }

  /**
   * Vérifie si les quêtes quotidiennes doivent être renouvelées (pool lock : seulement si jour changé ET batch terminé)
   */
  shouldRenewDaily(now) {
    const dayChanged = !this.data.lastDailyReset || (() => {
      const lastReset = new Date(this.data.lastDailyReset);
      return now.getDate() !== lastReset.getDate() ||
        now.getMonth() !== lastReset.getMonth() ||
        now.getFullYear() !== lastReset.getFullYear();
    })();
    if (!dayChanged) return false;
    const allCompleted = this.data.dailyQuests.length === 0 || this.data.dailyQuests.every(q => q.isCompleted());
    return allCompleted;
  }

  /**
   * Vérifie si les quêtes hebdomadaires doivent être renouvelées (pool lock : semaine changée ET batch terminé)
   */
  async shouldRenewWeekly(now) {
    const weekChanged = !this.data.lastWeeklyReset || (() => {
      const lastReset = new Date(this.data.lastWeeklyReset);
      const msPerWeek = 7 * 24 * 60 * 60 * 1000;
      return (now - lastReset) >= msPerWeek;
    })();
    if (!weekChanged) return false;
    const allCompleted = this.data.weeklyQuests.length === 0 || this.data.weeklyQuests.every(q => q.isCompleted());
    return allCompleted;
  }

  /**
   * Renouvelle les quêtes quotidiennes
   */
  async renewDailyQuests() {
    const newQuests = await generateDailyQuests();
    this.data.dailyQuests = newQuests;
    this.data.lastDailyReset = new Date().toISOString();
    this.data.dailyCycleId = `daily_${Date.now()}`;
    this.data.dailyStartTime = new Date().toISOString();
    
    // Réinitialiser le tracking d'activité pour le nouveau jour
    await resetActivityTracking();
  }

  /**
   * Renouvelle les quêtes hebdomadaires
   */
  async renewWeeklyQuests() {
    const newQuests = await generateWeeklyQuests();
    this.data.weeklyQuests = newQuests;
    this.data.lastWeeklyReset = new Date().toISOString();
    this.data.weeklyCycleId = `weekly_${Date.now()}`;
    this.data.weeklyStartTime = new Date().toISOString();
  }

  /**
   * Met à jour les quêtes de performance (niveau).
   * Anti-incohérence : progression = min(niveau actuel, target), complétée si niveau >= target.
   */
  async updatePerformanceQuests() {
    const userProgress = await getUserProgress(true);
    const currentLevel = calculateLevel(userProgress?.currentXP || 0);

    for (const quest of this.data.performanceQuests) {
      if (quest.type !== QUEST_TYPES.LEVEL_REACHED || quest.status === QUEST_STATUS.COMPLETED) continue;

      const newProgress = Math.min(currentLevel, quest.target);
      const wasActive = quest.status === QUEST_STATUS.ACTIVE;
      quest.progress = newProgress;

      if (currentLevel >= quest.target && wasActive) {
        quest.status = QUEST_STATUS.COMPLETED;
        quest.completedAt = new Date().toISOString();
        if (!this.data.completedInSession.some(q => q.id === quest.id)) {
          this.data.completedInSession.push(quest);
        }
        await this.generateNextLevelQuest(quest);
      }
    }

    this.data.lastPerformanceUpdate = new Date().toISOString();
  }

  /**
   * Génère la prochaine quête de niveau après complétion
   */
  async generateNextLevelQuest(completedQuest) {
    const userProgress = await getUserProgress();
    const currentLevel = calculateLevel(userProgress?.currentXP || 0);
    const nextLevel = currentLevel + 1;

    const isMilestone = completedQuest.metadata?.isMilestone || false;

    if (isMilestone) {
      // Générer la prochaine quête milestone (palier de 5)
      const nextMilestone = Math.ceil((currentLevel + 1) / 5) * 5;
      if (nextMilestone > currentLevel) {
        const newQuest = new Quest({
          type: QUEST_TYPES.LEVEL_REACHED,
          title: `Atteindre le niveau ${nextMilestone}`,
          description: `Atteins le niveau ${nextMilestone} pour obtenir une récompense spéciale`,
          target: nextMilestone,
          progress: currentLevel,
          status: QUEST_STATUS.ACTIVE,
          rewards: {
            stars: 10,
            xp: 100,
          },
          metadata: {
            cycleType: QUEST_CYCLE_TYPES.PERFORMANCE,
            userLevel: currentLevel,
            targetLevel: nextMilestone,
            isMilestone: true,
            generatedAt: new Date().toISOString(),
          },
        });

        // Remplacer l'ancienne quête milestone
        const index = this.data.performanceQuests.findIndex(q => 
          q.type === QUEST_TYPES.LEVEL_REACHED && q.metadata?.isMilestone
        );
        if (index !== -1) {
          this.data.performanceQuests[index] = newQuest;
        }
      }
    } else {
      // Générer la prochaine quête de niveau (+1)
      const newQuest = new Quest({
        type: QUEST_TYPES.LEVEL_REACHED,
        title: `Atteindre le niveau ${nextLevel}`,
        description: `Monte jusqu'au niveau ${nextLevel} pour débloquer de nouvelles récompenses`,
        target: nextLevel,
        progress: currentLevel,
        status: QUEST_STATUS.ACTIVE,
        rewards: {
          stars: 6,
          xp: 60,
        },
        metadata: {
          cycleType: QUEST_CYCLE_TYPES.PERFORMANCE,
          userLevel: currentLevel,
          targetLevel: nextLevel,
          generatedAt: new Date().toISOString(),
        },
      });

      // Remplacer l'ancienne quête de niveau
      const index = this.data.performanceQuests.findIndex(q => 
        q.type === QUEST_TYPES.LEVEL_REACHED && !q.metadata?.isMilestone
      );
      if (index !== -1) {
        this.data.performanceQuests[index] = newQuest;
      }
    }
  }

  /**
   * S'abonne aux événements
   */
  subscribeToEvents() {
    // Étoiles gagnées
    const unsubStar = questEventEmitter.on(QUEST_EVENT_TYPES.STAR_EARNED, async (event) => {
      await this.handleEvent(QUEST_TYPES.STAR_EARNED, event.payload.amount);
    });

    // Module complété
    const unsubModule = questEventEmitter.on(QUEST_EVENT_TYPES.MODULE_COMPLETED, async (event) => {
      await this.handleEvent(QUEST_TYPES.MODULE_COMPLETED, 1, event.payload);
    });

    // Série parfaite
    const unsubPerfect = questEventEmitter.on(QUEST_EVENT_TYPES.PERFECT_SERIES, async (event) => {
      await this.handleEvent(QUEST_TYPES.PERFECT_SERIES, 1, event.payload);
    });

    // Temps passé
    const unsubTime = questEventEmitter.on(QUEST_EVENT_TYPES.TIME_SPENT, async (event) => {
      await this.handleEvent(QUEST_TYPES.TIME_SPENT, event.payload.minutes);
    });

    // Niveau atteint
    const unsubLevel = questEventEmitter.on(QUEST_EVENT_TYPES.LEVEL_REACHED, async (event) => {
      await this.updatePerformanceQuests();
      await this.saveData();
    });

    this.eventUnsubscribers = [unsubStar, unsubModule, unsubPerfect, unsubTime, unsubLevel];
  }

  /**
   * Traite un événement et met à jour les quêtes correspondantes.
   * TIME_SPENT : amount = total minutes (source de vérité), pas un delta.
   * Autres types : amount = incrément.
   */
  async handleEvent(questType, amount, metadata = {}) {
    if (!this.data) return;

    const allQuests = [
      ...this.data.dailyQuests,
      ...this.data.weeklyQuests,
      ...this.data.performanceQuests,
    ];

    let hasChanges = false;

    for (const quest of allQuests) {
      if (quest.type !== questType || quest.status !== QUEST_STATUS.ACTIVE) continue;

      const previousProgress = quest.progress;
      if (questType === QUEST_TYPES.TIME_SPENT) {
        // amount = total minutes actif (émis par l'intégration), pas un delta
        quest.progress = Math.min(amount, quest.target);
      } else {
        quest.progress = Math.min(quest.progress + amount, quest.target);
      }

      if (quest.progress > previousProgress) hasChanges = true;

      if (quest.progress >= quest.target) {
        quest.status = QUEST_STATUS.COMPLETED;
        quest.completedAt = new Date().toISOString();
        if (!this.data.completedInSession.some(q => q.id === quest.id)) {
          this.data.completedInSession.push(quest);
        }
        hasChanges = true;
        console.log('[QuestEngine] ✅ Quête complétée (récompense au claim):', quest.title);
      }
    }

    if (hasChanges) {
      await this.saveData();
    }
  }

  /**
   * Donne les récompenses d'une quête
   */
  async giveRewards(quest) {
    const { stars, xp } = quest.rewards;

    if (stars > 0 || xp > 0) {
      const userProgress = await getUserProgress();
      const updates = {};

      if (xp > 0) {
        updates.currentXP = (userProgress.currentXP || 0) + xp;
        updates.currentLevel = calculateLevel(updates.currentXP);
      }

      if (stars > 0) {
        updates.totalStars = (userProgress.totalStars || 0) + stars;
      }

      await updateUserProgress(updates);
      console.log('[QuestEngine] 🎁 Récompenses données:', { stars, xp });
    }
  }

  /**
   * Récupère toutes les quêtes actives (sync depuis user stats avant retour)
   */
  async getActiveQuests() {
    if (!this.data) return [];
    await this.syncAllQuestsFromUserStats();
    return [
      ...this.data.dailyQuests.filter(q => q.status === QUEST_STATUS.ACTIVE),
      ...this.data.weeklyQuests.filter(q => q.status === QUEST_STATUS.ACTIVE),
      ...this.data.performanceQuests.filter(q => q.status === QUEST_STATUS.ACTIVE),
    ];
  }

  /**
   * Récupère les quêtes par type (sync depuis user stats avant retour)
   */
  async getQuestsByType(cycleType) {
    if (!this.data) return [];
    await this.syncAllQuestsFromUserStats();
    switch (cycleType) {
      case QUEST_CYCLE_TYPES.DAILY:
        return this.data.dailyQuests;
      case QUEST_CYCLE_TYPES.WEEKLY:
        return this.data.weeklyQuests;
      case QUEST_CYCLE_TYPES.PERFORMANCE:
        return this.data.performanceQuests;
      default:
        return [];
    }
  }

  /**
   * Récupère les quêtes complétées dans la session
   */
  getCompletedInSession() {
    return this.data?.completedInSession || [];
  }

  /**
   * Efface les quêtes complétées de la session
   */
  clearCompletedInSession() {
    if (this.data) {
      this.data.completedInSession = [];
      this.saveData();
    }
  }

  /**
   * Désinitialise le moteur
   */
  async deinitialize() {
    // Se désabonner des événements
    this.eventUnsubscribers.forEach(unsub => unsub());
    this.eventUnsubscribers = [];

    // Réinitialiser l'état
    this.data = null;
    this.isInitialized = false;
    this.currentUserId = null;
  }
}

// Instance singleton
export const unifiedQuestEngine = new UnifiedQuestEngine();

/**
 * API publique
 */
export async function initializeQuestSystem() {
  return await unifiedQuestEngine.initialize();
}

export async function getActiveQuests() {
  if (!unifiedQuestEngine.isInitialized) {
    await initializeQuestSystem();
  }
  return unifiedQuestEngine.getActiveQuests();
}

export async function getQuestsByType(cycleType) {
  if (!unifiedQuestEngine.isInitialized) {
    await initializeQuestSystem();
  }
  return unifiedQuestEngine.getQuestsByType(cycleType);
}

export function getCompletedQuestsInSession() {
  return unifiedQuestEngine.getCompletedInSession();
}

export function clearCompletedQuestsInSession() {
  unifiedQuestEngine.clearCompletedInSession();
}

export async function forceQuestRenewal() {
  await unifiedQuestEngine.checkAndRenewQuests();
}

// Export pour utilisation dans d'autres modules
export { QUEST_CYCLE_TYPES, emitQuestEvent };
