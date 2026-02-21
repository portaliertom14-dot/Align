/**
 * Affinage variant Droit : à partir des 5 réponses de l'écran RefineDroitTrack,
 * détermine si l'utilisateur vise le track "droit pur" (default) ou "Défense & Sécurité civile" (defense_track).
 * Ne modifie pas le scoring secteur 50Q ni domainTags.
 */

export type DroitVariant = 'default' | 'defense_track';

/** Ids des 5 questions d'affinage (fixes). */
export const REFINE_DROIT_QUESTION_IDS = ['refine_1', 'refine_2', 'refine_3', 'refine_4', 'refine_5'] as const;

/** Seuil à partir duquel on active defense_track (defenseScore >= 3). */
export const DEFENSE_TRACK_THRESHOLD = 3;

/**
 * Valeur d'une réponse : A = droit, B = defense, C = "ça dépend" (0.5 chaque).
 */
function getScoreForChoice(choice: string | null | undefined): { droit: number; defense: number } {
  const c = (choice ?? '').toString().trim().toUpperCase();
  if (c === 'A') return { droit: 1, defense: 0 };
  if (c === 'B') return { droit: 0, defense: 1 };
  if (c === 'C') return { droit: 0.5, defense: 0.5 };
  return { droit: 0, defense: 0 };
}

/**
 * Calcule le variant à partir des réponses aux 5 questions d'affinage.
 * @param answers - Objet { refine_1: 'A'|'B'|'C', ... } (value ou label)
 * @returns 'defense_track' si defenseScore >= 3, sinon 'default'
 */
export function computeDroitVariantFromRefinement(
  answers: Record<string, unknown>
): DroitVariant {
  let defenseScore = 0;
  for (const id of REFINE_DROIT_QUESTION_IDS) {
    const raw = answers[id];
    const choice =
      raw != null && typeof raw === 'object' && 'value' in (raw as object)
        ? (raw as { value?: string }).value
        : typeof raw === 'string'
          ? raw
          : undefined;
    const { defense } = getScoreForChoice(choice);
    defenseScore += defense;
  }
  return defenseScore >= DEFENSE_TRACK_THRESHOLD ? 'defense_track' : 'default';
}
