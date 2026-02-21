/**
 * Variante métier (sous-profil) pour un secteur.
 * Ex. droit_justice_securite peut afficher le track "Défense & Sécurité civile" si defense est très proche.
 */

import type { SectorId } from '../data/jobsBySector';

export type SectorVariant = 'default' | 'defense_track';

/** CONDITION 1 stricte : écart (top1 - top2) <= 0.5 => activation directe defense_track. */
export const THRESHOLD_GAP = 0.5;

/** CONDITION 2 élargie : écart <= 1.2 autorisé seulement si defenseScore >= MIN_DEFENSE_SCORE (garde-fou). */
export const THRESHOLD_GAP_WIDER = 1.2;
/** Score minimal du secteur Défense & Sécurité civile pour activer defense_track en condition 2 (réaliste en prod : 34–40). */
export const MIN_DEFENSE_SCORE = 36;

export interface SectorVariantParams {
  pickedSectorId: SectorId | string;
  ranked: Array<{ id: string; score: number }>;
}

/**
 * Détermine la variante d'affichage / whitelist métiers.
 * - Si secteur !== droit_justice_securite => "default"
 * - Si droit_justice_securite ET defense_securite_civile est top2 :
 *   - CONDITION 1 (stricte) : gap (top1 - top2) <= 0.5 => "defense_track"
 *   - CONDITION 2 (élargie + garde-fou) : gap <= 1.2 ET defenseScore >= MIN_DEFENSE_SCORE => "defense_track"
 * - Sinon => "default"
 */
export function getSectorVariant(params: SectorVariantParams): SectorVariant {
  const { pickedSectorId, ranked } = params;
  const picked = String(pickedSectorId ?? '').trim().toLowerCase();
  if (picked !== 'droit_justice_securite') {
    return 'default';
  }
  if (!Array.isArray(ranked) || ranked.length < 2) {
    return 'default';
  }
  const defenseIndex = ranked.findIndex(
    (r) => String(r?.id ?? '').trim().toLowerCase() === 'defense_securite_civile'
  );
  if (defenseIndex < 0 || defenseIndex > 1) {
    return 'default';
  }
  // Scores des deux premiers (ordre peut être [droit, defense] ou [defense, droit])
  const score0 = typeof ranked[0]?.score === 'number' ? ranked[0].score : 0;
  const score1 = typeof ranked[1]?.score === 'number' ? ranked[1].score : 0;
  const id0 = String(ranked[0]?.id ?? '').trim().toLowerCase();
  const id1 = String(ranked[1]?.id ?? '').trim().toLowerCase();
  const droitScore = id0 === 'droit_justice_securite' ? score0 : id1 === 'droit_justice_securite' ? score1 : 0;
  const defenseScore = id0 === 'defense_securite_civile' ? score0 : id1 === 'defense_securite_civile' ? score1 : 0;
  const gap = droitScore - defenseScore;

  // CONDITION 1 (stricte) : gap <= 1.0 => activation directe
  if (gap <= THRESHOLD_GAP) {
    return 'defense_track';
  }
  // CONDITION 2 (élargie mais sécurisée) : gap <= 1.2 ET score Défense suffisant
  if (gap <= THRESHOLD_GAP_WIDER && defenseScore >= MIN_DEFENSE_SCORE) {
    return 'defense_track';
  }
  return 'default';
}
