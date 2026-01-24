/**
 * Moteur de quêtes V2
 * Écoute les événements et met à jour les quêtes automatiquement
 * Source de vérité unique pour l'état des quêtes
 */

import { questEventEmitter, QUEST_EVENT_TYPES } from './events';
import { Quest, QuestSection, QUEST_STATUS, QUEST_TYPES } from './questModel';
import { saveQuests, loadQuests } from './storage';
import { generatePersonalizedSection, QUEST_SCOPES } from './personalizedGenerator';

/**
 * Mapping entre types d'événements et types de quêtes
 */
const EVENT_TO_QUEST_TYPE = {
  [QUEST_EVENT_TYPES.STAR_EARNED]: QUEST_TYPES.STAR_EARNED,
  [QUEST_EVENT_TYPES.LESSON_COMPLETED]: QUEST_TYPES.LESSON_COMPLETED,
  [QUEST_EVENT_TYPES.MODULE_COMPLETED]: QUEST_TYPES.MODULE_COMPLETED,
  [QUEST_EVENT_TYPES.LEVEL_REACHED]: QUEST_TYPES.LEVEL_REACHED,
  [QUEST_EVENT_TYPES.TIME_SPENT]: QUEST_TYPES.TIME_SPENT,
  [QUEST_EVENT_TYPES.PERFECT_SERIES]: QUEST_TYPES.PERFECT_SERIES,
};

/**
 * Moteur de quêtes
 */
class QuestEngine {
  constructor() {
    this.sections = []; // Sections de quêtes
    this.completedQuests = []; // Quêtes complétées dans cette session (pour l'écran de félicitations)
    this.isInitialized = false;
    this.eventUnsubscribers = [];
    this.currentUserId = null; // ID de l'utilisateur actuel pour vérifier les changements
  }

  /**
   * Initialise le moteur de quêtes
   * CRITICAL: Vérifie que les quêtes correspondent à l'utilisateur actuel
   * Ne s'initialise que si un utilisateur est connecté
   */
  async initialize() {
    const { getCurrentUser } = require('../../../services/auth');
    const currentUser = await getCurrentUser();
    const currentUserId = currentUser?.id || null;

    // CRITICAL: Ne pas initialiser si aucun utilisateur n'est connecté
    if (!currentUser || !currentUserId) {
      console.log('[QuestEngine] Pas d\'utilisateur connecté, initialisation reportée');
      return;
    }

    // Si déjà initialisé, vérifier que c'est pour le même utilisateur
    if (this.isInitialized) {
      // Si l'utilisateur a changé, réinitialiser
      if (this.currentUserId !== currentUserId) {
        console.log('[QuestEngine] Utilisateur changé, réinitialisation...');
        await this.deinitialize();
        // Continuer pour réinitialiser avec le nouvel utilisateur
      } else {
        // Même utilisateur, pas besoin de réinitialiser
        return;
      }
    }

    // Stocker l'ID de l'utilisateur actuel
    this.currentUserId = currentUserId;

    // Charger les quêtes depuis le stockage
    await this.loadQuests();

    // S'abonner aux événements
    this.subscribeToEvents();

    this.isInitialized = true;
  }

  /**
   * Charge les quêtes depuis le stockage
   * CRITICAL: Vérifie que les quêtes correspondent à l'utilisateur actuel
   */
  async loadQuests() {
    try {
      const { getCurrentUser } = require('../../../services/auth');
      const currentUser = await getCurrentUser();
      const currentUserId = currentUser?.id || null;

      const data = await loadQuests();
      if (data && data.sections) {
        // Vérifier que les quêtes correspondent à l'utilisateur actuel
        // (loadQuests() dans storage.js fait déjà cette vérification, mais on double-vérifie)
        if (data.userId && data.userId !== currentUserId) {
          console.warn('[QuestEngine] ⚠️ Quêtes d\'un autre utilisateur détectées, régénération...');
          // Régénérer les quêtes pour le nouvel utilisateur
          await this.initializeDefaultSections();
          return;
        }

        // Extraire les sections (sans userId pour compatibilité avec QuestSection.fromJSON)
        const { userId, lastUpdated, ...questData } = data;
        this.sections = questData.sections.map(s => QuestSection.fromJSON(s));
        
        // CRITICAL: Vérifier et mettre à jour les quêtes de niveau après chargement
        await this.checkAndUpdateLevelQuests();
      } else {
        // Première initialisation : créer une section par défaut
        await this.initializeDefaultSections();
      }
    } catch (error) {
      console.error('[QuestEngine] Erreur lors du chargement des quêtes:', error);
      await this.initializeDefaultSections();
    }
  }
  
  /**
   * Vérifie et met à jour les quêtes de niveau basées sur le niveau actuel de l'utilisateur
   * CRITICAL: Doit être appelé après chaque chargement des quêtes pour synchroniser la progression
   */
  async checkAndUpdateLevelQuests() {
    try {
      const { getUserProgress } = require('../../../lib/userProgressSupabase');
      const { calculateLevel } = require('../../../lib/progression');
      
      const userProgress = await getUserProgress();
      const currentXP = userProgress?.currentXP || 0;
      const currentLevel = calculateLevel(currentXP);
      
      // Mettre à jour les quêtes de niveau avec le niveau actuel
      await this.updateLevelQuests(currentLevel);
    } catch (error) {
      console.error('[QuestEngine] Erreur lors de la vérification des quêtes de niveau:', error);
    }
  }

  /**
   * Initialise les sections par défaut
   * CRITICAL: Vérifie que l'utilisateur est connecté avant de sauvegarder
   */
  async initializeDefaultSections() {
    const { getCurrentUser } = require('../../../services/auth');
    const currentUser = await getCurrentUser();
    
    // Vérifier que l'utilisateur est connecté avant de générer les quêtes
    if (!currentUser || !currentUser.id) {
      console.warn('[QuestEngine] Impossible d\'initialiser les sections par défaut: utilisateur non connecté');
      // Retourner des sections vides plutôt que de générer des quêtes sans utilisateur
      this.sections = [];
      return;
    }

    // Utiliser le nouveau générateur personnalisé
    // Passer un tableau vide car c'est l'initialisation (pas de sections existantes)
    const weeklySection = await generatePersonalizedSection(QUEST_SCOPES.WEEKLY, []);
    const monthlySection = await generatePersonalizedSection(QUEST_SCOPES.MONTHLY, [weeklySection]);
    this.sections = [weeklySection, monthlySection];
    await this.saveQuests();
  }

  /**
   * Sauvegarde les quêtes dans le stockage
   */
  async saveQuests() {
    try {
      const data = {
        sections: this.sections.map(s => s.toJSON()),
        lastUpdated: new Date().toISOString(),
      };
      await saveQuests(data);
    } catch (error) {
      console.error('[QuestEngine] Erreur lors de la sauvegarde des quêtes:', error);
    }
  }

  /**
   * S'abonne aux événements
   */
  subscribeToEvents() {
    // STAR_EARNED
    const unsubscribeStar = questEventEmitter.on(QUEST_EVENT_TYPES.STAR_EARNED, async (event) => {
      await this.handleStarEarned(event.payload.amount);
    });

    // LESSON_COMPLETED
    const unsubscribeLesson = questEventEmitter.on(QUEST_EVENT_TYPES.LESSON_COMPLETED, async (event) => {
      await this.handleLessonCompleted(event.payload.moduleId);
    });

    // MODULE_COMPLETED
    const unsubscribeModule = questEventEmitter.on(QUEST_EVENT_TYPES.MODULE_COMPLETED, async (event) => {
      await this.handleModuleCompleted(event.payload.moduleId, event.payload.score);
    });

    // LEVEL_REACHED
    const unsubscribeLevel = questEventEmitter.on(QUEST_EVENT_TYPES.LEVEL_REACHED, async (event) => {
      await this.handleLevelReached(event.payload.level);
    });

    // TIME_SPENT
    const unsubscribeTime = questEventEmitter.on(QUEST_EVENT_TYPES.TIME_SPENT, async (event) => {
      await this.handleTimeSpent(event.payload.minutes);
    });

    // PERFECT_SERIES
    const unsubscribePerfect = questEventEmitter.on(QUEST_EVENT_TYPES.PERFECT_SERIES, async (event) => {
      await this.handlePerfectSeries(event.payload.moduleId);
    });

    this.eventUnsubscribers = [
      unsubscribeStar,
      unsubscribeLesson,
      unsubscribeModule,
      unsubscribeLevel,
      unsubscribeTime,
      unsubscribePerfect,
    ];
  }

  /**
   * Traite l'événement STAR_EARNED
   */
  async handleStarEarned(amount) {
    const questType = QUEST_TYPES.STAR_EARNED;
    await this.updateQuestsByType(questType, amount);
  }

  /**
   * Traite l'événement LESSON_COMPLETED
   */
  async handleLessonCompleted(moduleId) {
    const questType = QUEST_TYPES.LESSON_COMPLETED;
    await this.updateQuestsByType(questType, 1, { moduleId });
  }

  /**
   * Traite l'événement MODULE_COMPLETED
   */
  async handleModuleCompleted(moduleId, score) {
    const questType = QUEST_TYPES.MODULE_COMPLETED;
    await this.updateQuestsByType(questType, 1, { moduleId, score });
  }

  /**
   * Traite l'événement LEVEL_REACHED
   */
  async handleLevelReached(level) {
    const questType = QUEST_TYPES.LEVEL_REACHED;
    // Pour les quêtes de niveau, on vérifie si le niveau atteint correspond au target
    await this.updateLevelQuests(level);
  }

  /**
   * Traite l'événement TIME_SPENT
   */
  async handleTimeSpent(minutes) {
    const questType = QUEST_TYPES.TIME_SPENT;
    await this.updateQuestsByType(questType, minutes);
  }

  /**
   * Traite l'événement PERFECT_SERIES
   */
  async handlePerfectSeries(moduleId) {
    const questType = QUEST_TYPES.PERFECT_SERIES;
    await this.updateQuestsByType(questType, 1, { moduleId });
  }

  /**
   * Met à jour toutes les quêtes d'un type donné
   */
  async updateQuestsByType(questType, amount, metadata = {}) {
    let hasUpdates = false;
    const newlyCompleted = [];

    for (const section of this.sections) {
      for (const quest of section.quests) {
        if (quest.type === questType && quest.status === QUEST_STATUS.ACTIVE) {
          const wasCompleted = quest.updateProgress(amount);
          hasUpdates = true;

          if (wasCompleted) {
            newlyCompleted.push(quest);
            this.completedQuests.push(quest);
            
            // Émettre un événement QUEST_COMPLETED
            questEventEmitter.emit({
              id: `quest_completed_${quest.id}`,
              type: 'QUEST_COMPLETED',
              payload: { quest: quest.toJSON() },
              metadata: { timestamp: Date.now() },
            });
          }
        }
      }
    }

    if (hasUpdates) {
      await this.saveQuests();
      await this.checkAndRenewSections();
    }

    return newlyCompleted;
  }

  /**
   * Met à jour les quêtes de niveau (logique spéciale)
   * CRITICAL: Met à jour la progression même si le niveau actuel > target
   */
  async updateLevelQuests(level) {
    let hasUpdates = false;
    const newlyCompleted = [];


    for (const section of this.sections) {
      for (const quest of section.quests) {
        if (quest.type === QUEST_TYPES.LEVEL_REACHED && quest.status === QUEST_STATUS.ACTIVE) {
          // Pour les quêtes de niveau, mettre à jour la progression pour refléter le niveau actuel
          // CRITICAL: Mettre à jour la progression à chaque fois qu'elle est inférieure au niveau actuel
          // La progression doit refléter le niveau actuel (jusqu'au target maximum)
          const newProgress = Math.min(level, quest.target); // Ne pas dépasser le target
          const shouldUpdate = newProgress > quest.progress; // Mettre à jour si le niveau actuel > progression actuelle
          
          if (shouldUpdate) {
            // CRITICAL: Mettre directement la progression au niveau actuel (ou au target si niveau > target)
            const previousProgress = quest.progress;
            quest.progress = newProgress;
            
            // Vérifier si la quête vient d'être complétée (progression atteint le target)
            const wasCompleted = !quest.isCompleted() && newProgress >= quest.target;
            if (wasCompleted) {
              quest.status = QUEST_STATUS.COMPLETED;
              quest.completedAt = new Date().toISOString();
              newlyCompleted.push(quest);
              this.completedQuests.push(quest);
              
              // Émettre un événement QUEST_COMPLETED
              questEventEmitter.emit({
                id: `quest_completed_${quest.id}`,
                type: 'QUEST_COMPLETED',
                payload: { quest: quest.toJSON() },
                metadata: { timestamp: Date.now() },
              });
            }
            
            hasUpdates = true;

          }
        }
      }
    }

    if (hasUpdates) {
      await this.saveQuests();
      await this.checkAndRenewSections();
    }

    return newlyCompleted;
  }

  /**
   * Vérifie et renouvelle les sections complétées
   */
  async checkAndRenewSections() {
    for (let i = 0; i < this.sections.length; i++) {
      const section = this.sections[i];
      if (section.isCompleted() && !section.completedAt) {
        // Marquer la section comme complétée
        section.completedAt = new Date().toISOString();

        // Générer une nouvelle section du même type avec le générateur personnalisé
        const scope = section.type === 'weekly' ? QUEST_SCOPES.WEEKLY : QUEST_SCOPES.MONTHLY;
        // Passer toutes les sections existantes sauf celle qui est complétée
        const otherSections = this.sections.filter((s, idx) => idx !== i);
        const newSection = await generatePersonalizedSection(scope, otherSections);
        this.sections[i] = newSection;

        await this.saveQuests();
      }
    }
  }

  /**
   * Retourne toutes les quêtes actives
   * CRITICAL: Vérifie et met à jour les quêtes de niveau avant de retourner les quêtes actives
   */
  async getActiveQuests() {
    // Vérifier et mettre à jour les quêtes de niveau avant de retourner les quêtes actives
    await this.checkAndUpdateLevelQuests();
    const activeQuests = [];
    for (const section of this.sections) {
      activeQuests.push(...section.getActiveQuests());
    }
    return activeQuests;
  }

  /**
   * Retourne les quêtes complétées dans cette session (pour l'écran de félicitations)
   */
  getCompletedQuestsInSession() {
    return [...this.completedQuests];
  }

  /**
   * Réinitialise la liste des quêtes complétées dans cette session
   */
  clearCompletedQuestsInSession() {
    this.completedQuests = [];
  }

  /**
   * Retourne toutes les sections
   * CRITICAL: Vérifie et met à jour les quêtes de niveau avant de retourner les sections
   */
  async getSections() {
    // Vérifier et mettre à jour les quêtes de niveau à chaque récupération
    await this.checkAndUpdateLevelQuests();
    // Retourner les sections directement (pas de copie) pour que les modifications soient visibles
    return this.sections;
  }

  /**
   * Retourne une section par son ID
   */
  getSectionById(sectionId) {
    return this.sections.find(s => s.id === sectionId);
  }

  /**
   * Désinitialise le moteur (pour les tests ou changement d'utilisateur)
   * CRITICAL: Nettoie toutes les données pour permettre une réinitialisation propre
   */
  async deinitialize() {
    // Se désabonner des événements
    this.eventUnsubscribers.forEach(unsubscribe => unsubscribe());
    this.eventUnsubscribers = [];
    
    // Réinitialiser les sections et l'état
    this.sections = [];
    this.completedQuests = [];
    this.isInitialized = false;
    this.currentUserId = null;
  }
}

// Instance singleton
export const questEngine = new QuestEngine();
