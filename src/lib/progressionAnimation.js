/**
 * Système d'animation de progression XP/Étoiles
 * 
 * Règles strictes:
 * - Calculs AVANT animation (xpBeforeModule, xpAfterModule, etc.)
 * - Animation UNIQUEMENT sur la barre XP existante en haut à droite
 * - Aucun nouvel écran
 * - Animation purement visuelle
 */

/**
 * EventEmitter compatible React Native
 * Pattern Observer : les listeners s'abonnent aux événements
 */
class EventEmitter {
  constructor() {
    this.listeners = new Map();
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
      this.off(eventType, callback);
    };
  }

  /**
   * Se désabonner d'un type d'événement
   * @param {string} eventType - Type d'événement
   * @param {Function} callback - Fonction à retirer
   */
  off(eventType, callback) {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Émettre un événement
   * @param {string} eventType - Type d'événement
   * @param {*} data - Données à passer aux listeners
   */
  emit(eventType, data) {
    const callbacks = this.listeners.get(eventType) || [];
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`[ProgressionAnimation] Erreur dans le listener pour ${eventType}:`, error);
      }
    });
  }
}

/**
 * EventEmitter pour déclencher les animations depuis n'importe où
 */
export const progressionAnimationEmitter = new EventEmitter();

/**
 * Événements disponibles
 */
export const PROGRESSION_EVENTS = {
  ANIMATE_XP: 'animate_xp',
  ANIMATE_STARS: 'animate_stars',
};

/**
 * Structure des données d'animation
 */

/**
 * Déclenche l'animation XP/Étoiles après complétion d'un module
 * 
 * @param {ProgressionAnimationData} data - Données calculées AVANT l'animation
 */
export function triggerProgressionAnimation(data) {
  console.log('[ProgressionAnimation] Déclenchement animation:', data);
  
  // Émettre les événements pour XP et étoiles
  progressionAnimationEmitter.emit(PROGRESSION_EVENTS.ANIMATE_XP, {
    xpBefore: data.xpBeforeModule,
    xpAfter: data.xpAfterModule,
    levelBefore: data.levelBefore,
    levelAfter: data.levelAfter,
  });
  
  progressionAnimationEmitter.emit(PROGRESSION_EVENTS.ANIMATE_STARS, {
    starsBefore: data.starsBefore,
    starsAfter: data.starsAfter,
  });
}
