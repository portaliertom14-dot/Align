/**
 * Script de Migration - Valeurs XP Corrompues (Ancien Système)
 * 
 * Détecte et corrige les comptes avec des valeurs d'XP astronomiques
 * issues de l'ancien système avec multiplicateurs exponentiels
 * 
 * Usage :
 * import { detectCorruptedXP, fixCorruptedXP } from './lib/migrateCorruptedXP';
 * 
 * // Détecter
 * const isCorrupted = await detectCorruptedXP();
 * if (isCorrupted) {
 *   await fixCorruptedXP({ strategy: 'recalculate' });
 * }
 */

import { getCurrentUser } from '../services/auth';
import { getUserProgress, updateUserProgress } from './userProgressSupabase';
import { calculateLevel, getTotalXPForLevel } from './xpSystem';

// ============================================================================
// CONSTANTES
// ============================================================================

/**
 * Seuils de détection de corruption
 */
const CORRUPTION_THRESHOLDS = {
  // XP > 1 million = suspect (niveau 100 = ~326k XP)
  XP_SUSPICIOUS: 1_000_000,
  
  // XP > 100 millions = très probablement corrompu
  XP_CORRUPTED: 100_000_000,
  
  // Niveau > 500 = anormal (progression attendue : ~niveau 100 max)
  LEVEL_SUSPICIOUS: 500,
  
  // Niveau > 900 = plafonné, XP corrompue
  LEVEL_CORRUPTED: 900,
};

/**
 * Stratégies de correction
 */
export const FIX_STRATEGIES = {
  // Recalculer l'XP depuis le niveau actuel (recommandé)
  RECALCULATE: 'recalculate',
  
  // Plafonner au niveau 100
  CAP_LEVEL_100: 'cap_100',
  
  // Plafonner au niveau 200
  CAP_LEVEL_200: 'cap_200',
  
  // Reset complet (niveau 1)
  RESET: 'reset',
};

// ============================================================================
// DÉTECTION
// ============================================================================

/**
 * Détecte si le compte actuel a des valeurs XP corrompues
 * @returns {Promise<Object|null>} Informations sur la corruption, ou null si OK
 */
export async function detectCorruptedXP() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return null;
    }
    
    const progress = await getUserProgress();
    const { currentXP, currentLevel } = progress;
    
    // Vérifier les seuils
    const isXPSuspicious = currentXP > CORRUPTION_THRESHOLDS.XP_SUSPICIOUS;
    const isXPCorrupted = currentXP > CORRUPTION_THRESHOLDS.XP_CORRUPTED;
    const isLevelSuspicious = currentLevel > CORRUPTION_THRESHOLDS.LEVEL_SUSPICIOUS;
    const isLevelCorrupted = currentLevel > CORRUPTION_THRESHOLDS.LEVEL_CORRUPTED;
    
    const isCorrupted = isXPCorrupted || isLevelCorrupted;
    
    if (!isCorrupted && !isXPSuspicious && !isLevelSuspicious) {
      return null; // Tout va bien
    }
    
    // Calculer l'XP attendue pour le niveau actuel
    const expectedXP = getTotalXPForLevel(currentLevel);
    const xpDiff = currentXP - expectedXP;
    const xpRatio = expectedXP > 0 ? currentXP / expectedXP : 0;
    
    return {
      isCorrupted,
      isSuspicious: isXPSuspicious || isLevelSuspicious,
      details: {
        currentXP,
        currentLevel,
        expectedXP,
        xpDiff,
        xpRatio,
        isXPCorrupted,
        isLevelCorrupted,
      },
      recommendation: isCorrupted 
        ? FIX_STRATEGIES.RECALCULATE 
        : 'monitor', // Surveiller mais ne pas corriger encore
    };
  } catch (error) {
    console.error('[detectCorruptedXP] Erreur:', error);
    return null;
  }
}

/**
 * Affiche un rapport de corruption dans la console
 * @param {Object} corruption - Résultat de detectCorruptedXP()
 */
export function logCorruptionReport(corruption) {
  if (!corruption) {
    console.log('✅ [XP] Aucune corruption détectée');
    return;
  }
  
  console.group('⚠️ [XP] CORRUPTION DÉTECTÉE');
  console.log('Statut:', corruption.isCorrupted ? '❌ CORROMPU' : '🟡 SUSPECT');
  console.log('Niveau actuel:', corruption.details.currentLevel);
  console.log('XP actuelle:', corruption.details.currentXP.toLocaleString());
  console.log('XP attendue:', corruption.details.expectedXP.toLocaleString());
  console.log('Différence:', corruption.details.xpDiff.toLocaleString());
  console.log('Ratio:', `${corruption.details.xpRatio.toFixed(2)}x`);
  console.log('Recommandation:', corruption.recommendation);
  console.groupEnd();
}

// ============================================================================
// CORRECTION
// ============================================================================

/**
 * Corrige les valeurs XP corrompues selon la stratégie choisie
 * @param {Object} options - Options de correction
 * @param {string} options.strategy - Stratégie (voir FIX_STRATEGIES)
 * @param {boolean} options.dryRun - Si true, simule sans appliquer
 * @returns {Promise<Object>} Résultat de la correction
 */
export async function fixCorruptedXP(options = {}) {
  const {
    strategy = FIX_STRATEGIES.RECALCULATE,
    dryRun = false,
  } = options;
  
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Utilisateur non connecté');
    }
    
    const progress = await getUserProgress();
    const { currentXP: oldXP, currentLevel: oldLevel } = progress;
    
    // Calculer les nouvelles valeurs selon la stratégie
    let newLevel = oldLevel;
    let newXP = oldXP;
    
    switch (strategy) {
      case FIX_STRATEGIES.RECALCULATE:
        // Recalculer l'XP depuis le niveau actuel
        // Limiter à 1000 max
        newLevel = Math.min(oldLevel, 1000);
        newXP = getTotalXPForLevel(newLevel);
        break;
        
      case FIX_STRATEGIES.CAP_LEVEL_100:
        // Plafonner au niveau 100
        newLevel = Math.min(oldLevel, 100);
        newXP = getTotalXPForLevel(newLevel);
        break;
        
      case FIX_STRATEGIES.CAP_LEVEL_200:
        // Plafonner au niveau 200
        newLevel = Math.min(oldLevel, 200);
        newXP = getTotalXPForLevel(newLevel);
        break;
        
      case FIX_STRATEGIES.RESET:
        // Reset complet
        newLevel = 1;
        newXP = 0;
        break;
        
      default:
        throw new Error(`Stratégie inconnue: ${strategy}`);
    }
    
    const result = {
      strategy,
      dryRun,
      before: {
        level: oldLevel,
        xp: oldXP,
      },
      after: {
        level: newLevel,
        xp: newXP,
      },
      changes: {
        levelDiff: newLevel - oldLevel,
        xpDiff: newXP - oldXP,
      },
      applied: false,
    };
    
    // Appliquer si pas en mode dry run
    if (!dryRun) {
      await updateUserProgress({
        currentLevel: newLevel,
        currentXP: newXP,
      });
      
      result.applied = true;
      console.log('✅ [fixCorruptedXP] Correction appliquée avec succès');
    } else {
      console.log('🔍 [fixCorruptedXP] Mode dry run - aucune modification appliquée');
    }
    
    // Log du résultat
    console.group('📊 [fixCorruptedXP] Résultat');
    console.log('Stratégie:', strategy);
    console.log('Dry run:', dryRun);
    console.log('Avant:', `Niveau ${oldLevel} - ${oldXP.toLocaleString()} XP`);
    console.log('Après:', `Niveau ${newLevel} - ${newXP.toLocaleString()} XP`);
    console.log('Changements:', 
      `Niveau ${result.changes.levelDiff >= 0 ? '+' : ''}${result.changes.levelDiff}, ` +
      `XP ${result.changes.xpDiff >= 0 ? '+' : ''}${result.changes.xpDiff.toLocaleString()}`
    );
    console.log('Appliqué:', result.applied);
    console.groupEnd();
    
    return result;
  } catch (error) {
    console.error('[fixCorruptedXP] Erreur:', error);
    throw error;
  }
}

// ============================================================================
// UTILITAIRES
// ============================================================================

/**
 * Vérifie et corrige automatiquement au chargement de l'app
 * (À appeler dans App.js ou au démarrage)
 * 
 * @param {Object} options - Options
 * @param {boolean} options.autoFix - Si true, corrige automatiquement
 * @param {string} options.strategy - Stratégie de correction
 * @returns {Promise<boolean>} true si correction appliquée
 */
export async function checkAndFixOnStartup(options = {}) {
  const {
    autoFix = false,
    strategy = FIX_STRATEGIES.RECALCULATE,
  } = options;
  
  try {
    const corruption = await detectCorruptedXP();
    
    if (!corruption) {
      return false; // Rien à corriger
    }
    
    logCorruptionReport(corruption);
    
    if (corruption.isCorrupted && autoFix) {
      console.warn('⚠️ [XP] Correction automatique activée');
      await fixCorruptedXP({ strategy });
      return true;
    }
    
    if (corruption.isCorrupted && !autoFix) {
      console.warn('⚠️ [XP] Corruption détectée mais autoFix désactivé');
      console.warn('   Appelez fixCorruptedXP() pour corriger');
    }
    
    return false;
  } catch (error) {
    console.error('[checkAndFixOnStartup] Erreur:', error);
    return false;
  }
}

/**
 * Affiche un tableau comparatif des stratégies de correction
 * @returns {Promise<Object>} Comparaison des stratégies
 */
export async function compareStrategies() {
  const progress = await getUserProgress();
  const { currentXP, currentLevel } = progress;
  
  const strategies = [
    {
      name: 'Recalculer (recommandé)',
      key: FIX_STRATEGIES.RECALCULATE,
      level: Math.min(currentLevel, 1000),
    },
    {
      name: 'Plafonner niveau 100',
      key: FIX_STRATEGIES.CAP_LEVEL_100,
      level: Math.min(currentLevel, 100),
    },
    {
      name: 'Plafonner niveau 200',
      key: FIX_STRATEGIES.CAP_LEVEL_200,
      level: Math.min(currentLevel, 200),
    },
    {
      name: 'Reset complet',
      key: FIX_STRATEGIES.RESET,
      level: 1,
    },
  ];
  
  const comparison = strategies.map(s => ({
    strategy: s.name,
    key: s.key,
    before: {
      level: currentLevel,
      xp: currentXP,
    },
    after: {
      level: s.level,
      xp: getTotalXPForLevel(s.level),
    },
    loss: {
      level: s.level - currentLevel,
      xp: getTotalXPForLevel(s.level) - currentXP,
    },
  }));
  
  console.table(comparison.map(c => ({
    'Stratégie': c.strategy,
    'Niveau avant': c.before.level,
    'Niveau après': c.after.level,
    'XP avant': c.before.xp.toLocaleString(),
    'XP après': c.after.xp.toLocaleString(),
    'Perte niveau': c.loss.level,
  })));
  
  return comparison;
}

// ============================================================================
// EXPORT PAR DÉFAUT
// ============================================================================

export default {
  // Détection
  detectCorruptedXP,
  logCorruptionReport,
  
  // Correction
  fixCorruptedXP,
  compareStrategies,
  
  // Utilitaires
  checkAndFixOnStartup,
  
  // Constantes
  CORRUPTION_THRESHOLDS,
  FIX_STRATEGIES,
};
