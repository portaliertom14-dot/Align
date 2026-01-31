/**
 * Système de gestion des modules
 * Gère le déblocage progressif, les cycles et la persistence
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUser } from '../../services/auth';
import { getUserProgress, updateUserProgress } from '../userProgressSupabase';
import { ModulesState, MODULE_STATE, MODULE_CONFIG, validateModulesState } from './moduleModel';

const STORAGE_KEY_PREFIX = '@align_modules_state';

/**
 * Classe du système de modules
 */
class ModuleSystem {
  constructor() {
    this.state = null;
    this.isInitialized = false;
    this.currentUserId = null;
  }

  /**
   * Initialise le système de modules
   */
  async initialize() {
    try {
      const user = await getCurrentUser();
      if (!user || !user.id) {
        console.log('[ModuleSystem] Aucun utilisateur connecté');
        return false;
      }

      // Vérifier si l'utilisateur a changé
      if (this.isInitialized && this.currentUserId !== user.id) {
        console.log('[ModuleSystem] Changement d\'utilisateur détecté, réinitialisation...');
        await this.deinitialize();
      }

      if (this.isInitialized) {
        return true; // Déjà initialisé pour cet utilisateur
      }

      this.currentUserId = user.id;

      // Charger l'état
      await this.loadState();

      this.isInitialized = true;
      console.log('[ModuleSystem] ✅ Initialisé avec succès');
      console.log('[ModuleSystem] État actuel:', this.state.getSummary());
      return true;
    } catch (error) {
      console.error('[ModuleSystem] Erreur lors de l\'initialisation:', error);
      return false;
    }
  }

  /**
   * Charge l'état depuis le stockage
   * Priorité: Supabase > AsyncStorage > Nouvel état
   */
  async loadState() {
    try {
      const user = await getCurrentUser();
      if (!user || !user.id) {
        this.state = new ModulesState();
        return;
      }

      // 1. Essayer de charger depuis Supabase
      const supabaseState = await this.loadFromSupabase();
      if (supabaseState && supabaseState.userId === user.id) {
        this.state = ModulesState.fromJSON(supabaseState);
        console.log('[ModuleSystem] 📥 État chargé depuis Supabase');
        return;
      }

      // 2. Fallback: charger depuis AsyncStorage
      const storageKey = `${STORAGE_KEY_PREFIX}_${user.id}`;
      const dataJson = await AsyncStorage.getItem(storageKey);

      if (dataJson) {
        const parsed = JSON.parse(dataJson);
        
        // Vérifier que les données correspondent à l'utilisateur actuel
        if (parsed.userId && parsed.userId !== user.id) {
          console.warn('[ModuleSystem] Données d\'un autre utilisateur, réinitialisation');
          this.state = await this.initializeNewState(user.id);
          return;
        }

        this.state = ModulesState.fromJSON(parsed);
        console.log('[ModuleSystem] Données chargées depuis AsyncStorage');
        
        // Synchroniser avec Supabase en arrière-plan
        this.saveToSupabase(this.state).catch(err => {
          console.warn('[ModuleSystem] Erreur sync Supabase (non-bloquant):', err.message);
        });
      } else {
        // 3. Première initialisation
        this.state = await this.initializeNewState(user.id);
      }
    } catch (error) {
      console.error('[ModuleSystem] Erreur lors du chargement:', error);
      this.state = new ModulesState();
    }
  }

  /**
   * Initialise un nouvel état pour un utilisateur
   */
  async initializeNewState(userId) {
    console.log('[ModuleSystem] Initialisation d\'un nouvel état');
    
    const state = new ModulesState({ userId });
    await this.saveState(state);
    return state;
  }

  /**
   * Sauvegarde l'état
   */
  async saveState(state = null) {
    try {
      const stateToSave = state || this.state;
      if (!stateToSave) return;

      const user = await getCurrentUser();
      if (!user || !user.id) return;

      stateToSave.lastUpdated = new Date().toISOString();
      stateToSave.userId = user.id;

      // Valider avant sauvegarde
      const validation = validateModulesState(stateToSave);
      if (!validation.valid) {
        console.error('[ModuleSystem] État invalide:', validation.errors);
        // Continuer quand même mais logger l'erreur
      }

      // Sauvegarder dans AsyncStorage
      const storageKey = `${STORAGE_KEY_PREFIX}_${user.id}`;
      await AsyncStorage.setItem(storageKey, JSON.stringify(stateToSave.toJSON()));

      // Sauvegarder dans Supabase
      await this.saveToSupabase(stateToSave);

      console.log('[ModuleSystem] ✅ État sauvegardé');
    } catch (error) {
      console.error('[ModuleSystem] Erreur lors de la sauvegarde:', error);
    }
  }

  /**
   * Sauvegarde dans Supabase
   */
  async saveToSupabase(state) {
    try {
      const user = await getCurrentUser();
      if (!user || !user.id) return;

      // CRITIQUE: Convertir 1-3 → 0-2 pour Supabase
      // Module 1 (1-3) → Index 0 (0-2)
      // Module 2 (1-3) → Index 1 (0-2)
      // Module 3 (1-3) → Index 2 (0-2)
      const dbIndex = state.currentModuleIndex - 1;
      
      // Valider que l'index est dans la plage 0-2
      if (dbIndex < 0 || dbIndex > 2) {
        console.error('[ModuleSystem] ❌ currentModuleIndex invalide:', state.currentModuleIndex, '→ dbIndex:', dbIndex);
        return;
      }

      // BUG FIX: Convertir maxUnlockedModuleIndex (1-3) → (0-2) pour Supabase
      const maxUnlockedDbIndex = state.maxUnlockedModuleIndex - 1;
      
      // Sauvegarder dans user_progress (utiliser current_module_index et max_unlocked_module_index)
      // CRITICAL FIX: Ne pas inclure xp/etoiles/niveau pour éviter d'écraser les valeurs existantes
      // La logique de fusion dans updateUserProgress préservera les valeurs existantes
      // NOTE: user est déjà vérifié à la ligne 160, pas besoin de re-vérifier
      await updateUserProgress({
        currentModuleIndex: dbIndex,
        maxUnlockedModuleIndex: maxUnlockedDbIndex, // BUG FIX: Sauvegarder max_unlocked_module_index
        // TODO: Ajouter colonne cycles_completed si nécessaire
        // cyclesCompleted: state.totalCyclesCompleted,
      });
      
      console.log('[ModuleSystem] 🔍 updateUserProgress appelé avec:', {
        currentModuleIndex: dbIndex,
        maxUnlockedModuleIndex: maxUnlockedDbIndex, // BUG FIX: Log maxUnlockedModuleIndex
        note: 'xp/etoiles/niveau NON inclus pour préserver les valeurs existantes'
      });

      console.log('[ModuleSystem] ✅ État synchronisé avec Supabase (module', state.currentModuleIndex, '→ index', dbIndex, ', maxUnlocked:', state.maxUnlockedModuleIndex, '→', maxUnlockedDbIndex + ')');
    } catch (error) {
      // Ne pas bloquer si Supabase échoue (AsyncStorage est le fallback)
      console.warn('[ModuleSystem] ⚠️ Erreur Supabase (non-bloquant):', error.message);
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
      
      // Vérifier si current_module_index existe
      if (typeof userProgress.currentModuleIndex === 'number') {
        // CRITIQUE: Convertir 0-2 → 1-3 pour le système de modules
        // Index 0 (0-2) → Module 1 (1-3)
        // Index 1 (0-2) → Module 2 (1-3)
        // Index 2 (0-2) → Module 3 (1-3)
        const dbIndex = userProgress.currentModuleIndex;
        const moduleIndex = dbIndex + 1;
        
        // Valider que l'index est dans la plage 0-2
        if (dbIndex < 0 || dbIndex > 2) {
          console.error('[ModuleSystem] ❌ currentModuleIndex invalide depuis Supabase:', dbIndex);
          return null;
        }
        
        console.log('[ModuleSystem] 📥 current_module_index depuis Supabase:', dbIndex, '→ module', moduleIndex);
        
        // BUG FIX: Charger aussi max_unlocked_module_index depuis Supabase
        const maxUnlockedDbIndex = userProgress.maxUnlockedModuleIndex ?? userProgress.max_unlocked_module_index ?? dbIndex;
        const maxUnlockedModuleIndex = maxUnlockedDbIndex + 1; // Convertir 0-2 → 1-3
        
        // Reconstruire l'état depuis current_module_index et max_unlocked_module_index
        const state = new ModulesState({
          userId: user.id,
          currentModuleIndex: moduleIndex,
          maxUnlockedModuleIndex: maxUnlockedModuleIndex, // BUG FIX: Inclure maxUnlockedModuleIndex
          totalCyclesCompleted: userProgress.cyclesCompleted || 0,
        });

        return state.toJSON();
      }

      return null;
    } catch (error) {
      console.warn('[ModuleSystem] ⚠️ Erreur chargement Supabase:', error.message);
      return null;
    }
  }

  /**
   * Vérifie si le système est prêt (initialisé avec un utilisateur)
   * @returns {boolean}
   */
  isReady() {
    return this.isInitialized && this.state !== null;
  }

  /**
   * Récupère l'état actuel
   * @throws {Error} Si le système n'est pas initialisé
   */
  getState() {
    if (!this.state) {
      throw new Error('[ModuleSystem] Système non initialisé. Appelez initialize() d\'abord.');
    }
    return this.state;
  }

  /**
   * Récupère le module actuel
   */
  getCurrentModule() {
    return this.getState().getCurrentModule();
  }

  /**
   * Récupère un module par index
   */
  getModule(index) {
    return this.getState().getModule(index);
  }

  /**
   * Récupère tous les modules
   * @returns {Array} Liste des modules ou tableau vide si non initialisé
   */
  getAllModules() {
    // SAFE: Retourner un tableau vide si non initialisé (évite crash FeedScreen)
    if (!this.isReady()) {
      console.warn('[ModuleSystem] getAllModules appelé avant initialisation - retour tableau vide');
      return [];
    }
    return this.getState().modules;
  }

  /**
   * Vérifie si un module peut être joué
   */
  canPlayModule(index) {
    return this.getState().canPlayModule(index);
  }

  /**
   * Marque le module actuel comme complété
   * Retourne les informations sur la complétion
   */
  async completeCurrentModule() {
    try {
      const state = this.getState();
      const currentIndex = state.currentModuleIndex;
      
      console.log(`[ModuleSystem] Tentative de complétion du module ${currentIndex}`);

      // Compléter le module
      const result = state.completeCurrentModule();

      if (!result.success) {
        console.error('[ModuleSystem] Échec de la complétion');
        return {
          success: false,
          completedModuleIndex: currentIndex,
          cycleCompleted: false,
          nextModuleIndex: currentIndex,
        };
      }

      // Sauvegarder l'état
      await this.saveState();

      const returnData = {
        success: true,
        completedModuleIndex: currentIndex,
        cycleCompleted: result.cycleCompleted,
        nextModuleIndex: state.currentModuleIndex,
        totalCyclesCompleted: state.totalCyclesCompleted,
      };

      console.log('[ModuleSystem] Complétion réussie:', returnData);
      return returnData;
    } catch (error) {
      console.error('[ModuleSystem] Erreur lors de la complétion:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Réinitialise le système
   */
  async reset() {
    try {
      const state = this.getState();
      state.reset();
      await this.saveState();
      console.log('[ModuleSystem] ✅ Système réinitialisé');
      return true;
    } catch (error) {
      console.error('[ModuleSystem] Erreur lors de la réinitialisation:', error);
      return false;
    }
  }

  /**
   * Récupère un résumé de l'état
   */
  getSummary() {
    return this.getState().getSummary();
  }

  /**
   * Désinitialise le système
   */
  async deinitialize() {
    this.state = null;
    this.isInitialized = false;
    this.currentUserId = null;
  }
}

// Instance singleton
export const moduleSystem = new ModuleSystem();

/**
 * API publique
 */

/**
 * Initialise le système de modules
 */
export async function initializeModuleSystem() {
  return await moduleSystem.initialize();
}

/**
 * Vérifie si le système de modules est prêt (initialisé)
 * @returns {boolean}
 */
export function isModuleSystemReady() {
  return moduleSystem.isReady();
}

/**
 * Récupère l'état actuel des modules
 */
export function getModulesState() {
  return moduleSystem.getState();
}

/**
 * Récupère le module actuel (celui qui est déverrouillé)
 */
export function getCurrentModule() {
  return moduleSystem.getCurrentModule();
}

/**
 * Récupère un module par son index
 */
export function getModule(index) {
  return moduleSystem.getModule(index);
}

/**
 * Récupère tous les modules
 */
export function getAllModules() {
  return moduleSystem.getAllModules();
}

/**
 * Vérifie si un module peut être joué
 */
export function canPlayModule(index) {
  return moduleSystem.canPlayModule(index);
}

/**
 * Marque le module actuel comme complété
 */
export async function completeCurrentModule() {
  return await moduleSystem.completeCurrentModule();
}

/**
 * Réinitialise le système de modules
 */
export async function resetModuleSystem() {
  return await moduleSystem.reset();
}

/**
 * Récupère un résumé de l'état des modules
 */
export function getModulesSummary() {
  return moduleSystem.getSummary();
}

// Export des constantes
export { MODULE_STATE, MODULE_CONFIG };
