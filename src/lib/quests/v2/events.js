/**
 * Système d'événements pour les quêtes
 * Toute progression utilisateur émet un événement unique et standardisé
 * Les quêtes écoutent ces événements et se mettent à jour uniquement via ceux-ci
 */

/**
 * Types d'événements disponibles
 */
export const QUEST_EVENT_TYPES = {
  STAR_EARNED: 'STAR_EARNED',                    // Étoile gagnée (payload: { amount: number })
  LESSON_COMPLETED: 'LESSON_COMPLETED',           // Leçon complétée (payload: { moduleId: string })
  MODULE_COMPLETED: 'MODULE_COMPLETED',           // Module complété (payload: { moduleId: string, score: number })
  LEVEL_REACHED: 'LEVEL_REACHED',                 // Niveau atteint (payload: { level: number })
  TIME_SPENT: 'TIME_SPENT',                       // Temps passé (payload: { minutes: number })
  PERFECT_SERIES: 'PERFECT_SERIES',               // Série parfaite (payload: { moduleId: string })
};

/**
 * Structure d'un événement
 */
export class QuestEvent {
  constructor(type, payload = {}, metadata = {}) {
    this.id = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.type = type;
    this.payload = payload;
    this.metadata = {
      timestamp: Date.now(),
      ...metadata,
    };
  }
}

/**
 * Système de gestion des événements
 * Pattern Observer : les listeners s'abonnent aux événements
 */
class EventEmitter {
  constructor() {
    this.listeners = new Map();
    this.eventHistory = []; // Historique pour debug/audit
  }

  /**
   * S'abonner à un type d'événement
   * @param {string} eventType - Type d'événement
   * @param {Function} callback - Fonction appelée quand l'événement est émis
   * @returns {Function} Fonction pour se désabonner
   */
  on(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType).push(callback);

    // Retourner une fonction de désabonnement
    return () => {
      const callbacks = this.listeners.get(eventType);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  /**
   * Émettre un événement
   * @param {QuestEvent} event - Événement à émettre
   */
  async emit(event) {
    // Ajouter à l'historique
    this.eventHistory.push(event);
    // Garder seulement les 100 derniers événements
    if (this.eventHistory.length > 100) {
      this.eventHistory.shift();
    }

    // Notifier tous les listeners de ce type d'événement
    const callbacks = this.listeners.get(event.type) || [];
    const promises = callbacks.map(callback => {
      try {
        return Promise.resolve(callback(event));
      } catch (error) {
        console.error(`[QuestEvents] Erreur dans le listener pour ${event.type}:`, error);
        return Promise.resolve();
      }
    });

    await Promise.all(promises);
  }

  /**
   * Obtenir l'historique des événements (pour debug)
   */
  getHistory() {
    return [...this.eventHistory];
  }

  /**
   * Vider l'historique
   */
  clearHistory() {
    this.eventHistory = [];
  }
}

// Instance singleton
export const questEventEmitter = new EventEmitter();

/**
 * Helpers pour émettre des événements
 */
export const emitQuestEvent = {
  starEarned: (amount) => {
    const event = new QuestEvent(QUEST_EVENT_TYPES.STAR_EARNED, { amount });
    return questEventEmitter.emit(event);
  },

  lessonCompleted: (moduleId) => {
    const event = new QuestEvent(QUEST_EVENT_TYPES.LESSON_COMPLETED, { moduleId });
    return questEventEmitter.emit(event);
  },

  moduleCompleted: (moduleId, score) => {
    const event = new QuestEvent(QUEST_EVENT_TYPES.MODULE_COMPLETED, { moduleId, score });
    return questEventEmitter.emit(event);
  },

  levelReached: (level) => {
    const event = new QuestEvent(QUEST_EVENT_TYPES.LEVEL_REACHED, { level });
    return questEventEmitter.emit(event);
  },

  timeSpent: (minutes) => {
    const event = new QuestEvent(QUEST_EVENT_TYPES.TIME_SPENT, { minutes });
    return questEventEmitter.emit(event);
  },

  perfectSeries: (moduleId) => {
    const event = new QuestEvent(QUEST_EVENT_TYPES.PERFECT_SERIES, { moduleId });
    return questEventEmitter.emit(event);
  },
};
