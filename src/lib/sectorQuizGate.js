/**
 * Paramètres du quiz métier après choix de secteur (InterludeSecteur s’affiche uniquement après paiement).
 * Même règle que l’interlude : affiner Droit vs Défense quand le secteur #2 est défense civile.
 *
 * @param {string} sectorId
 * @param {Array<{ id?: string } | unknown>} sectorRanked
 * @returns {boolean}
 */
export function computeNeedsDroitRefinement(sectorId, sectorRanked) {
  const top2Id =
    sectorRanked != null &&
    sectorRanked[1] != null &&
    typeof sectorRanked[1] === 'object' &&
    sectorRanked[1].id != null
      ? String(sectorRanked[1].id).trim().toLowerCase()
      : '';
  const sid = String(sectorId || '').trim().toLowerCase();
  return sid === 'droit_justice_securite' && top2Id === 'defense_securite_civile';
}
