/**
 * 🎯 Système XP V2 - Scalable et Durable
 * 
 * Règles fondamentales :
 * 1. UNE SEULE croissance progressive : sur l'XP requise par niveau
 * 2. XP gagnées FIXES (pas de multiplicateurs)
 * 3. Formule douce : XP_required(level) = baseXP + growth * (level ^ 1.5)
 * 4. Niveaux 1-indexed (minimum 1, pas de niveau 0)
 * 
 * @see SYSTEME_XP_V2.md pour la documentation complète
 */

// ============================================================================
// CONSTANTES
// ============================================================================

/**
 * Constantes de la formule XP
 * XP_required(level) = BASE_XP + GROWTH * (level ^ 1.5)
 */
const BASE_XP = 20;
const GROWTH = 8;

/**
 * Niveau maximum (plafond de sécurité)
 */
export const MAX_LEVEL = 999;

/**
 * Gains XP fixes (indépendants du niveau)
 * ⚠️ NE JAMAIS multiplier ces valeurs par le niveau
 */
export const XP_REWARDS = {
  QUIZ_COMPLETED: 15,           // Quiz terminé
  DAILY_SERIES: 10,             // Série quotidienne
  MODULE_COMPLETED: 25,         // Module complété
  QUEST_COMPLETED: 20,          // Quête terminée
  CHAPTER_COMPLETED: 50,        // Chapitre complété
};

// ============================================================================
// CALCUL DE L'XP REQUISE PAR NIVEAU
// ============================================================================

/**
 * Calcule l'XP requise pour ATTEINDRE un niveau donné (depuis le niveau précédent)
 * Formule : baseXP + growth * (level ^ 1.5)
 * 
 * Exemples :
 * - Niveau 1  : ~28 XP
 * - Niveau 5  : ~60 XP
 * - Niveau 10 : ~95 XP
 * - Niveau 20 : ~180 XP
 * - Niveau 50 : ~400 XP
 * - Niveau 100: ~800 XP
 * 
 * @param {number} level - Niveau cible (1-indexed)
 * @returns {number} XP requise pour atteindre ce niveau
 */
export function getXPRequiredForLevel(level) {
  if (level <= 0) return BASE_XP;
  if (level >= MAX_LEVEL) return Infinity;
  
  const xpRequired = BASE_XP + GROWTH * Math.pow(level, 1.5);
  return Math.round(xpRequired);
}

/**
 * Calcule l'XP TOTALE nécessaire pour atteindre un niveau donné
 * (Somme de toutes les XP requises depuis le niveau 0)
 * 
 * @param {number} targetLevel - Niveau cible
 * @returns {number} XP totale nécessaire
 */
export function getTotalXPForLevel(targetLevel) {
  if (targetLevel <= 0) return 0;
  if (targetLevel >= MAX_LEVEL) return Infinity;
  
  let totalXP = 0;
  for (let level = 1; level <= targetLevel; level++) {
    totalXP += getXPRequiredForLevel(level);
  }
  return totalXP;
}

// ============================================================================
// CALCUL DU NIVEAU DEPUIS L'XP TOTALE
// ============================================================================

/**
 * Calcule le niveau actuel à partir de l'XP totale accumulée
 * Utilise une recherche binaire pour performance optimale
 * 
 * @param {number} totalXP - XP totale accumulée
 * @returns {number} Niveau actuel (1-indexed, minimum 1)
 */
export function calculateLevel(totalXP) {
  if (totalXP <= 0) return 1; // Niveau minimum = 1
  
  // Recherche binaire pour trouver le niveau
  let low = 1;
  let high = MAX_LEVEL;
  let level = 1;
  
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const xpForMid = getTotalXPForLevel(mid);
    
    if (xpForMid <= totalXP) {
      level = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  
  return Math.min(level, MAX_LEVEL);
}

// ============================================================================
// UTILITAIRES POUR L'UI
// ============================================================================

/**
 * Calcule l'XP actuelle DANS le niveau en cours
 * (XP totale - XP totale du début du niveau)
 * 
 * @param {number} totalXP - XP totale accumulée
 * @returns {number} XP dans le niveau actuel
 */
export function getXPInCurrentLevel(totalXP) {
  if (totalXP <= 0) return 0;
  
  const currentLevel = calculateLevel(totalXP);
  const xpForLevelStart = getTotalXPForLevel(currentLevel); // XP totale pour atteindre le niveau actuel
  const xpInLevel = totalXP - xpForLevelStart;
  
  return Math.max(0, xpInLevel);
}

/**
 * Calcule l'XP nécessaire pour atteindre le prochain niveau
 * (depuis la position actuelle)
 * 
 * @param {number} totalXP - XP totale actuelle
 * @returns {number} XP requise pour le niveau suivant
 */
export function getXPNeededForNextLevel(totalXP) {
  const currentLevel = calculateLevel(totalXP);
  
  if (currentLevel >= MAX_LEVEL) {
    return Infinity;
  }
  
  // FIX: Pour passer du niveau N au niveau N+1, on a besoin de getXPRequiredForLevel(N+1)
  return getXPRequiredForLevel(currentLevel + 1);
}

/**
 * Calcule le pourcentage de progression dans le niveau actuel
 * 
 * @param {number} totalXP - XP totale actuelle
 * @returns {number} Pourcentage (0-100)
 */
export function getLevelProgressPercent(totalXP) {
  const xpInLevel = getXPInCurrentLevel(totalXP);
  const xpNeeded = getXPNeededForNextLevel(totalXP);
  
  if (xpNeeded === Infinity) return 100;
  if (xpNeeded === 0) return 0;
  
  return Math.min(100, Math.max(0, (xpInLevel / xpNeeded) * 100));
}

/**
 * IMPORTANT: Fonction utilitaire pour l'affichage
 * Retourne l'XP TOTALE nécessaire pour le niveau suivant
 * (pas l'XP restante, mais l'XP totale depuis le début)
 * 
 * @param {number} totalXP - XP totale actuelle  
 * @returns {number} XP totale pour le niveau suivant
 */
export function getTotalXPForNextLevel(totalXP) {
  const currentLevel = calculateLevel(totalXP);
  if (currentLevel >= MAX_LEVEL) {
    return Infinity;
  }
  return getTotalXPForLevel(currentLevel + 1);
}

// ============================================================================
// VALIDATION ET DEBUGGING
// ============================================================================

/**
 * Valide que l'XP actuelle est cohérente
 * (utile pour détecter les corruptions de données)
 */
export function validateXP(totalXP) {
  if (typeof totalXP !== 'number' || isNaN(totalXP)) {
    return { valid: false, reason: 'XP is not a number' };
  }
  
  if (totalXP < 0) {
    return { valid: false, reason: 'XP is negative' };
  }
  
  if (totalXP > getTotalXPForLevel(MAX_LEVEL)) {
    return { valid: false, reason: 'XP exceeds maximum level' };
  }
  
  return { valid: true };
}

/**
 * Affiche les statistiques de progression pour debug
 */
export function debugXPStats(totalXP) {
  const currentLevel = calculateLevel(totalXP);
  const xpInLevel = getXPInCurrentLevel(totalXP);
  const xpNeeded = getXPNeededForNextLevel(totalXP);
  const progress = getLevelProgressPercent(totalXP);
  
  console.log('=== XP Stats ===');
  console.log(`Total XP: ${totalXP}`);
  console.log(`Current Level: ${currentLevel}`);
  console.log(`XP in Level: ${xpInLevel}`);
  console.log(`XP Needed: ${xpNeeded}`);
  console.log(`Progress: ${progress.toFixed(1)}%`);
  console.log('================');
}
