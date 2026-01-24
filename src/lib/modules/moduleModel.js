/**
 * Modèle de données pour le système de modules
 * Gère les états et la logique métier des modules
 */

/**
 * États possibles d'un module
 */
export const MODULE_STATE = {
  LOCKED: 'locked',         // Verrouillé, non accessible
  UNLOCKED: 'unlocked',     // Déverrouillé, jouable
  COMPLETED: 'completed',   // Terminé
};

/**
 * Configuration du système de modules
 */
export const MODULE_CONFIG = {
  TOTAL_MODULES: 3,         // Nombre total de modules par cycle
  MIN_INDEX: 1,             // Index minimum (Module 1)
  MAX_INDEX: 3,             // Index maximum (Module 3)
};

/**
 * Classe représentant un module
 */
export class Module {
  constructor(data = {}) {
    this.index = data.index || 1;                    // Index du module (1, 2, ou 3)
    this.state = data.state || MODULE_STATE.LOCKED;  // État actuel
    this.completedAt = data.completedAt || null;     // Date de complétion
    this.completionCount = data.completionCount || 0; // Nombre de fois complété
  }

  /**
   * Vérifie si le module est verrouillé
   */
  isLocked() {
    return this.state === MODULE_STATE.LOCKED;
  }

  /**
   * Vérifie si le module est déverrouillé
   */
  isUnlocked() {
    return this.state === MODULE_STATE.UNLOCKED;
  }

  /**
   * Vérifie si le module est complété
   */
  isCompleted() {
    return this.state === MODULE_STATE.COMPLETED;
  }

  /**
   * Vérifie si le module est cliquable
   */
  isClickable() {
    return this.state === MODULE_STATE.UNLOCKED;
  }

  /**
   * Déverrouille le module
   */
  unlock() {
    if (this.state === MODULE_STATE.LOCKED) {
      this.state = MODULE_STATE.UNLOCKED;
      return true;
    }
    return false;
  }

  /**
   * Verrouille le module
   */
  lock() {
    this.state = MODULE_STATE.LOCKED;
    this.completedAt = null;
  }

  /**
   * Marque le module comme complété
   */
  complete() {
    if (this.state === MODULE_STATE.UNLOCKED) {
      this.state = MODULE_STATE.COMPLETED;
      this.completedAt = new Date().toISOString();
      this.completionCount += 1;
      return true;
    }
    return false;
  }

  /**
   * Réinitialise le module
   */
  reset() {
    this.state = MODULE_STATE.LOCKED;
    this.completedAt = null;
    // Ne pas réinitialiser completionCount pour garder l'historique
  }

  /**
   * Convertit en JSON
   */
  toJSON() {
    return {
      index: this.index,
      state: this.state,
      completedAt: this.completedAt,
      completionCount: this.completionCount,
    };
  }

  /**
   * Crée depuis JSON
   */
  static fromJSON(data) {
    return new Module(data);
  }
}

/**
 * Classe représentant l'état complet du système de modules
 */
export class ModulesState {
  constructor(data = {}) {
    this.currentModuleIndex = data.currentModuleIndex || 1; // Index du module actif (1-3)
    this.totalCyclesCompleted = data.totalCyclesCompleted || 0; // Nombre de cycles complets
    this.userId = data.userId || null;
    
    // Initialiser les 3 modules
    if (data.modules && Array.isArray(data.modules)) {
      this.modules = data.modules.map(m => Module.fromJSON(m));
    } else {
      this.modules = this.initializeModules();
    }
    
    this.lastUpdated = data.lastUpdated || new Date().toISOString();
  }

  /**
   * Initialise les modules avec l'état par défaut
   * Module 1 unlocked, Modules 2 et 3 locked
   */
  initializeModules() {
    return [
      new Module({ index: 1, state: MODULE_STATE.UNLOCKED }),
      new Module({ index: 2, state: MODULE_STATE.LOCKED }),
      new Module({ index: 3, state: MODULE_STATE.LOCKED }),
    ];
  }

  /**
   * Récupère un module par son index
   */
  getModule(index) {
    if (index < MODULE_CONFIG.MIN_INDEX || index > MODULE_CONFIG.MAX_INDEX) {
      throw new Error(`Index de module invalide: ${index}. Doit être entre ${MODULE_CONFIG.MIN_INDEX} et ${MODULE_CONFIG.MAX_INDEX}.`);
    }
    return this.modules[index - 1]; // Les modules sont indexés à partir de 0 dans le tableau
  }

  /**
   * Récupère le module actuel (celui qui est déverrouillé)
   */
  getCurrentModule() {
    return this.getModule(this.currentModuleIndex);
  }

  /**
   * Vérifie si un module peut être joué
   * Un module est jouable si :
   * - C'est le module actuel (unlocked)
   * - OU c'est un module déjà complété (completed) - pour révision/amélioration
   */
  canPlayModule(index) {
    const module = this.getModule(index);
    // Jouable si : module actuel OU module complété
    // Pas jouable si : locked
    return index === this.currentModuleIndex || module.state === MODULE_STATE.COMPLETED;
  }

  /**
   * Marque le module actuel comme complété et déverrouille le suivant
   * Retourne true si le cycle est terminé
   */
  completeCurrentModule() {
    const currentModule = this.getCurrentModule();
    
    // Vérifier que le module peut être complété
    if (!currentModule.isUnlocked()) {
      console.warn(`[ModulesState] Module ${this.currentModuleIndex} n'est pas déverrouillé, impossible de le compléter`);
      return { success: false, cycleCompleted: false };
    }

    // Marquer comme complété
    currentModule.complete();
    console.log(`[ModulesState] ✅ Module ${this.currentModuleIndex} complété`);

    // Vérifier si c'est le dernier module du cycle
    const isFinalModule = this.currentModuleIndex === MODULE_CONFIG.MAX_INDEX;

    if (isFinalModule) {
      // Cycle terminé : revenir au Module 1
      console.log(`[ModulesState] 🔄 Cycle ${this.totalCyclesCompleted + 1} terminé, retour au Module 1`);
      this.completeCycle();
      return { success: true, cycleCompleted: true };
    } else {
      // Déverrouiller le module suivant
      this.unlockNextModule();
      return { success: true, cycleCompleted: false };
    }
  }

  /**
   * Déverrouille le module suivant
   */
  unlockNextModule() {
    const nextIndex = this.currentModuleIndex + 1;
    
    if (nextIndex > MODULE_CONFIG.MAX_INDEX) {
      console.warn(`[ModulesState] Pas de module suivant après le module ${this.currentModuleIndex}`);
      return;
    }

    const nextModule = this.getModule(nextIndex);
    nextModule.unlock();
    this.currentModuleIndex = nextIndex;
    
    console.log(`[ModulesState] 🔓 Module ${nextIndex} déverrouillé`);
  }

  /**
   * Complète un cycle et revient au Module 1
   */
  completeCycle() {
    // Incrémenter le compteur de cycles
    this.totalCyclesCompleted += 1;

    // Réinitialiser tous les modules
    this.modules.forEach(module => module.reset());

    // Déverrouiller le Module 1
    const module1 = this.getModule(1);
    module1.unlock();
    this.currentModuleIndex = 1;

    console.log(`[ModulesState] ✅ Cycle ${this.totalCyclesCompleted} complété, Module 1 déverrouillé`);
  }

  /**
   * Réinitialise complètement le système
   */
  reset() {
    this.currentModuleIndex = 1;
    this.totalCyclesCompleted = 0;
    this.modules = this.initializeModules();
    this.lastUpdated = new Date().toISOString();
    console.log(`[ModulesState] 🔄 Système réinitialisé`);
  }

  /**
   * Récupère un résumé de l'état actuel
   */
  getSummary() {
    return {
      currentModuleIndex: this.currentModuleIndex,
      totalCyclesCompleted: this.totalCyclesCompleted,
      modules: this.modules.map(m => ({
        index: m.index,
        state: m.state,
        isClickable: m.isClickable(),
        completionCount: m.completionCount,
      })),
    };
  }

  /**
   * Convertit en JSON
   */
  toJSON() {
    return {
      userId: this.userId,
      currentModuleIndex: this.currentModuleIndex,
      totalCyclesCompleted: this.totalCyclesCompleted,
      modules: this.modules.map(m => m.toJSON()),
      lastUpdated: this.lastUpdated,
    };
  }

  /**
   * Crée depuis JSON
   */
  static fromJSON(data) {
    return new ModulesState(data);
  }
}

/**
 * Validation de l'état des modules
 */
export function validateModulesState(state) {
  const errors = [];

  // Vérifier currentModuleIndex
  if (!state.currentModuleIndex || 
      state.currentModuleIndex < MODULE_CONFIG.MIN_INDEX || 
      state.currentModuleIndex > MODULE_CONFIG.MAX_INDEX) {
    errors.push(`currentModuleIndex invalide: ${state.currentModuleIndex}`);
  }

  // Vérifier modules
  if (!state.modules || !Array.isArray(state.modules) || state.modules.length !== MODULE_CONFIG.TOTAL_MODULES) {
    errors.push(`modules invalide: doit être un tableau de ${MODULE_CONFIG.TOTAL_MODULES} éléments`);
  }

  // Vérifier qu'un seul module est unlocked
  const unlockedCount = state.modules.filter(m => m.state === MODULE_STATE.UNLOCKED).length;
  if (unlockedCount !== 1) {
    errors.push(`Exactement 1 module doit être unlocked, trouvé: ${unlockedCount}`);
  }

  // Vérifier que le module unlocked correspond à currentModuleIndex
  const currentModule = state.modules[state.currentModuleIndex - 1];
  if (currentModule && currentModule.state !== MODULE_STATE.UNLOCKED) {
    errors.push(`Le module ${state.currentModuleIndex} doit être unlocked mais est ${currentModule.state}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
