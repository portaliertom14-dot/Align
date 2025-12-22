/**
 * Système de progression dynamique Align
 * Calcule le niveau à partir de l'XP
 */

/**
 * Calcule le niveau à partir de l'XP total
 * Formule simple : niveau = Math.floor(xp / XP_PER_LEVEL)
 * @param {number} xp - XP total de l'utilisateur
 * @returns {number} Niveau actuel
 */
export function calculateLevel(xp) {
  const XP_PER_LEVEL = 100; // 100 XP par niveau
  return Math.floor(xp / XP_PER_LEVEL);
}

/**
 * Calcule l'XP nécessaire pour le prochain niveau
 * @param {number} currentLevel - Niveau actuel
 * @returns {number} XP nécessaire pour le niveau suivant
 */
export function getXPForNextLevel(currentLevel) {
  const XP_PER_LEVEL = 100;
  return (currentLevel + 1) * XP_PER_LEVEL;
}

/**
 * Calcule l'XP nécessaire pour le prochain niveau à partir de l'XP actuel
 * @param {number} currentXP - XP actuel
 * @returns {number} XP nécessaire pour le niveau suivant
 */
export function getXPNeededForNextLevel(currentXP) {
  const currentLevel = calculateLevel(currentXP);
  return getXPForNextLevel(currentLevel);
}







