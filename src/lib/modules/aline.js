/**
 * DEPRECATED: ALINE est remplacée par way (IA)
 * 
 * ⚠️ CONSERVÉ UNIQUEMENT POUR COMPATIBILITÉ
 * 
 * NE PLUS UTILISER : Utiliser wayGenerateModule() depuis way.js à la place
 */

import { wayGenerateModule, wayGenerateModulePool } from '../../services/way';
import { getUserProgress } from '../userProgress';

/**
 * Structure d'un profil utilisateur pour way
 */
export async function buildUserProfile() {
  const progress = await getUserProgress();
  
  return {
    secteur: progress.activeDirection || null,
    metier: progress.activeMetier || null,
    niveau: progress.currentLevel || 1,
    xp: progress.currentXP || 0,
    completedModules: progress.completedModules || [],
    cognitiveProfile: null, // way gère cela en interne
  };
}

/**
 * Génère les 3 modules initiaux personnalisés pour un nouveau profil
 * Utilise maintenant way au lieu de templates fixes
 */
export async function generateInitialModules(profile) {
  const modules = [];
  const { secteur, metier, niveau } = profile;

  try {
    // Générer 3 modules initiaux via way
    for (let i = 0; i < 3; i++) {
      const module = await wayGenerateModule(secteur, metier, niveau || 1);
      modules.push({
        ...module,
        isInitial: true,
        moduleNumber: i + 1,
      });
      
      // Petite pause entre les appels
      if (i < 2) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
  } catch (error) {
    console.error('Erreur lors de la génération des modules initiaux:', error);
    // En cas d'erreur, retourner des modules de base
    return [{
      id: `error_module_${Date.now()}`,
      titre: 'Module d\'exploration',
      objectif: 'Découvrir ton secteur',
      type: 'réflexion',
      consigne: 'Réfléchis à ce qui t\'attire dans ce secteur et explique pourquoi.',
      durée_estimée: 10,
      méthode_validation: 'Analyse de la réflexion',
      reward: { xp: 50, étoiles: 2 },
      difficulté: niveau || 1,
      isInitial: true,
    }];
  }

  return modules;
}

/**
 * Génère un nouveau module personnalisé selon le profil
 * DÉLÉGUÉ À way (IA)
 */
export async function generatePersonalizedModule() {
  const progress = await getUserProgress();
  
  try {
    return await wayGenerateModule(
      progress.activeDirection || progress.activeSerie,
      progress.activeMetier,
      progress.currentLevel || 1
    );
  } catch (error) {
    console.error('Erreur lors de la génération du module via way:', error);
    throw error;
  }
}

/**
 * Génère plusieurs modules en une fois (pool de modules)
 * Utilise way pour générer un pool
 */
export async function generateModulePool(count = 10) {
  const progress = await getUserProgress();
  
  try {
    return await wayGenerateModulePool(
      progress.activeDirection || progress.activeSerie,
      progress.activeMetier,
      progress.currentLevel || 1,
      count
    );
  } catch (error) {
    console.error('Erreur lors de la génération du pool de modules:', error);
    return [];
  }
}

/**
 * Adapte un module existant selon l'évolution du profil
 * (Pour les modules multi-jours ou à compléter plus tard)
 */
export function adaptModuleToEvolution(module, newProfile) {
  // way génère déjà des modules adaptés, cette fonction est moins nécessaire
  // mais conservée pour compatibilité
  if (newProfile.niveau > module.difficulté) {
    return {
      ...module,
      difficulté: newProfile.niveau,
      reward: {
        ...module.reward,
        xp: Math.floor(module.reward.xp * 1.3),
      },
    };
  }

  return module;
}






