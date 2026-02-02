/**
 * Système de progression Align — linéaire simple
 * 1 niveau = 100 XP. Aucun bonus caché, aucun multiplicateur.
 */

const MAX_LEVEL = 1000; // Limite maximale de niveau
const XP_PER_LEVEL = 100; // XP fixe par niveau

/**
 * Calcule l'XP nécessaire pour passer d'un niveau au suivant (toujours 100)
 * @param {number} level - Niveau actuel (0-indexed)
 * @returns {number} XP nécessaire pour passer au niveau suivant
 */
function getXPForLevel(level) {
  return XP_PER_LEVEL;
}

/**
 * Calcule l'XP total nécessaire pour atteindre un niveau donné
 * Linéaire : niveau n = n * 100 XP total
 * @param {number} targetLevel - Niveau cible
 * @returns {number} XP total nécessaire
 */
export function getTotalXPForLevel(targetLevel) {
  if (targetLevel <= 0) return 0;
  return targetLevel * XP_PER_LEVEL;
}

/**
 * Calcule le niveau à partir de l'XP total
 * Linéaire : niveau = floor(xp / 100)
 * @param {number} xp - XP total de l'utilisateur
 * @returns {number} Niveau actuel (0-indexed, max 1000)
 */
export function calculateLevel(xp) {
  if (xp <= 0) return 0;
  return Math.min(Math.floor(xp / XP_PER_LEVEL), MAX_LEVEL);
}

/**
 * Calcule l'XP nécessaire pour le prochain niveau
 * @param {number} currentLevel - Niveau actuel
 * @returns {number} XP nécessaire pour le niveau suivant
 */
export function getXPForNextLevel(currentLevel) {
  if (currentLevel >= MAX_LEVEL) {
    return Infinity; // Niveau max atteint
  }
  return getXPForLevel(currentLevel);
}

/**
 * Calcule l'XP total nécessaire pour atteindre le prochain niveau
 * @param {number} currentXP - XP actuel (total accumulé)
 * @returns {number} XP total nécessaire pour le prochain niveau
 */
export function getXPNeededForNextLevel(currentXP) {
  const currentLevel = calculateLevel(currentXP);
  if (currentLevel >= MAX_LEVEL) {
    return Infinity;
  }
  return getTotalXPForLevel(currentLevel + 1);
}

/**
 * Calcule l'XP dans le niveau actuel (XP actuel - XP total du niveau actuel)
 * @param {number} currentXP - XP actuel (total accumulé)
 * @returns {number} XP dans le niveau actuel
 */
export function getXPInCurrentLevel(currentXP) {
  const currentLevel = calculateLevel(currentXP);
  if (currentLevel <= 0) {
    return currentXP;
  }
  const xpForCurrentLevel = getTotalXPForLevel(currentLevel);
  const xpInLevel = currentXP - xpForCurrentLevel;
  const result = Math.max(0, xpInLevel);
  
  return result;
}

/**
 * Calcule l'XP total nécessaire pour atteindre le prochain niveau
 * @param {number} currentXP - XP actuel (total accumulé)
 * @returns {number} XP total nécessaire pour le prochain niveau
 */
export function getTotalXPForNextLevel(currentXP) {
  const currentLevel = calculateLevel(currentXP);
  if (currentLevel >= MAX_LEVEL) {
    return Infinity;
  }
  const nextLevelXP = getTotalXPForLevel(currentLevel + 1);
  
  return nextLevelXP;
}

/**
 * Calcule l'XP nécessaire pour passer du niveau actuel au niveau suivant
 * (différence entre le total XP du niveau suivant et le total XP du niveau actuel)
 * @param {number} currentXP - XP actuel (total accumulé)
 * @returns {number} XP nécessaire pour passer au niveau suivant
 */
export function getXPNeededForCurrentLevel(currentXP) {
  const currentLevel = calculateLevel(currentXP);
  if (currentLevel >= MAX_LEVEL) {
    return Infinity;
  }
  const xpForCurrentLevel = getTotalXPForLevel(currentLevel);
  const xpForNextLevel = getTotalXPForLevel(currentLevel + 1);
  const xpNeeded = xpForNextLevel - xpForCurrentLevel;
  
  return xpNeeded;
}

/**
 * Réinitialise un niveau élevé (>= 100) au niveau de base
 * @param {number} currentLevel - Niveau actuel
 * @returns {number} Niveau réinitialisé (0 si >= 100)
 */
export function resetHighLevel(currentLevel) {
  if (currentLevel >= 100) {
    return 0;
  }
  return currentLevel;
}

/**
 * Calcule l'XP gagné après complétion d'un module en fonction du niveau de l'utilisateur
 * L'XP double tous les 10 niveaux pour rester proportionnel à la progression
 * @param {number} baseXP - XP de base (par défaut 50)
 * @param {number} userLevel - Niveau actuel de l'utilisateur
 * @returns {number} XP calculé avec le multiplicateur basé sur le niveau
 * 
 * Exemples:
 * - Niveaux 1-10: baseXP * 1 (50 XP)
 * - Niveaux 11-20: baseXP * 2 (100 XP)
 * - Niveaux 21-30: baseXP * 4 (200 XP)
 * - Niveaux 31-40: baseXP * 8 (400 XP)
 */
export function calculateXPForModule(baseXP = 50, userLevel = 0) {
  // Tous les 10 niveaux, l'XP double
  // Formule: baseXP * Math.pow(2, Math.floor((niveau - 1) / 10))
  const levelGroup = Math.floor((userLevel - 1) / 10);
  const multiplier = Math.pow(2, levelGroup);
  const calculatedXP = Math.floor(baseXP * multiplier);
  
  return calculatedXP;
}

// ============================================================================
// COMPATIBILITÉ AVEC L'ANCIEN SYSTÈME (DÉPRÉCIÉ)
// ============================================================================
// Ces fonctions sont maintenues pour la compatibilité mais redirigent vers le nouveau système

/**
 * @deprecated Utiliser calculateLevel(xp) à la place
 */
export function getCurrentLevel(xp) {
  console.warn('[progression.js] getCurrentLevel est déprécié, utilisez calculateLevel');
  return calculateLevel(xp);
}

/**
 * @deprecated Utiliser getTotalXPForLevel(level + 1) à la place
 */
export function getXPForLevelUp(level) {
  console.warn('[progression.js] getXPForLevelUp est déprécié, utilisez getTotalXPForLevel');
  return getTotalXPForLevel(level + 1);
}