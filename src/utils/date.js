/**
 * Utilitaires date pour l'écran DOB (Date de naissance).
 * Utilise Date natif pour les années bissextiles.
 */

/**
 * Nombre de jours dans le mois donné (avec années bissextiles).
 * @param {number} year - Année (ex: 2024)
 * @param {number} monthIndex - Mois 0-11 (0 = Janvier)
 * @returns {number} 1..31
 */
export function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}
