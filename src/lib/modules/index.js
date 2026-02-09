/**
 * Point d'entrée principal du système de modules
 * Gère le déblocage progressif par groupe de 3 modules
 * 
 * ARCHITECTURE:
 * - moduleModel.js : Modèle de données et logique métier
 * - moduleSystem.js : Système de gestion (persistence, états)
 * - moduleIntegration.js : Intégration avec quêtes et XP
 * 
 * USAGE:
 * 
 * 1. Initialisation (App.js):
 *    import { initializeModules } from './lib/modules';
 *    await initializeModules();
 * 
 * 2. Afficher les modules (écran Feed):
 *    import { getAllModules, MODULE_STATE } from './lib/modules';
 *    const modules = getAllModules();
 *    modules.forEach(module => {
 *      console.log(`Module ${module.index}: ${module.state}`);
 *    });
 * 
 * 3. Vérifier si un module est jouable:
 *    import { canStartModule } from './lib/modules';
 *    const canPlay = canStartModule(2); // false si Module 1 pas complété
 * 
 * 4. Compléter un module:
 *    import { handleModuleCompletion } from './lib/modules';
 *    const result = await handleModuleCompletion({
 *      moduleId: 'module_2_serie_1',
 *      score: 85,
 *      correctAnswers: 8,
 *      totalQuestions: 10,
 *    });
 * 
 * 5. Navigation après complétion:
 *    import { navigateAfterModuleCompletion } from './lib/modules';
 *    navigateAfterModuleCompletion(navigation, result);
 */

// Export du système principal
export {
  initializeModuleSystem,
  isModuleSystemReady,
  getModulesState,
  getCurrentModule,
  getModule,
  getAllModules,
  canPlayModule,
  completeCurrentModule,
  resetModuleSystem,
  getModulesSummary,
} from './moduleSystem';

// Export de l'intégration
export {
  initializeModules,
  handleModuleCompletion,
  navigateAfterModuleCompletion,
  getNextRouteAfterModuleCompletion,
  setPostModuleNavigationLock,
  isPostModuleNavigationLocked,
  getModuleDisplayInfo,
  getCycleInfo,
  canStartModule,
  MODULE_REWARDS,
  CYCLE_COMPLETION_BONUS,
} from './moduleIntegration';

// Export des modèles et constantes
export {
  Module,
  ModulesState,
  MODULE_STATE,
  MODULE_CONFIG,
  validateModulesState,
} from './moduleModel';

/**
 * API SIMPLIFIÉE
 */

/**
 * Initialise le système de modules
 */
import { initializeModules as init } from './moduleIntegration';
export const initialize = init;

/**
 * Gère la complétion d'un module
 */
import { handleModuleCompletion as complete } from './moduleIntegration';
export const completeModule = complete;

/**
 * Récupère tous les modules
 */
import { getAllModules as getAll } from './moduleSystem';
export const getModules = getAll;

/**
 * Navigation après complétion
 */
import { navigateAfterModuleCompletion as navigate } from './moduleIntegration';
export const navigateAfterCompletion = navigate;

/**
 * CONSTANTES
 */
export const ModuleStates = {
  LOCKED: 'locked',
  UNLOCKED: 'unlocked',
  COMPLETED: 'completed',
};

export const ModuleConfig = {
  TOTAL_MODULES: 3,
  MIN_INDEX: 1,
  MAX_INDEX: 3,
};

/**
 * DOCUMENTATION
 */
export const MODULE_SYSTEM_DOCS = {
  version: '1.0.0',
  description: 'Système de déblocage progressif de modules par groupe de 3',
  features: [
    'Déblocage progressif (1 module jouable à la fois)',
    'États: locked, unlocked, completed',
    'Cycle infini (retour au Module 1 après Module 3)',
    'Intégration quêtes et XP',
    'Persistence Supabase + AsyncStorage',
    'Validation automatique des états',
  ],
  rules: [
    'Au départ: Module 1 unlocked, Modules 2 et 3 locked',
    'Module complété → Module suivant unlocked',
    'Module 3 complété → Retour au Module 1',
    'Un seul module unlocked à la fois',
    'Modules locked non cliquables',
  ],
  integration: {
    initialization: 'Appeler initialize() au démarrage',
    completion: 'Appeler completeModule() après chaque module',
    navigation: 'Utiliser navigateAfterCompletion() pour la navigation',
    display: 'Utiliser getModules() pour afficher les modules',
  },
};

export default {
  initialize,
  completeModule,
  getModules,
  navigateAfterCompletion,
  ModuleStates,
  ModuleConfig,
};
