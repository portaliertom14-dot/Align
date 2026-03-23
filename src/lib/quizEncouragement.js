/**
 * Encouragements quiz (pas de bonne/mauvaise réponse — questions sur l'utilisateur).
 * Rotatif aléatoire à chaque réponse ; messages spéciaux à certaines questions (remplacent le rotatif).
 */

export const ROTATING_ENCOURAGEMENT_MESSAGES = [
  'Excellent 🔥',
  'Parfait 💪',
  'Incroyable ⚡',
  'Trop bien 🎯',
  'Continue comme ça 💫',
  'Genial 🙌',
  'Tu gères super bien 🚀',
  'Super rythme, continue 👏',
  'Top, on avance bien ✨',
  'Très bon feeling, continue 🌟',
  'Ça devient très intéressant 😎',
  'Belle avancée, bravo 🔥',
  'Tu traces, c’est parfait ⚡',
  'Tu avances fort, continue 💥',
  'On est sur du solide 💪',
  'Nickel, tu progresses bien 🎯',
];

/** Quiz secteur (~50 questions) — après avoir terminé la question N (1-based). */
export const SECTOR_SPECIAL_AFTER_QUESTION = {
  5: 'Tes réponses dessinent déjà un cap ✨',
  10: 'Ton profil prend forme 🔥',
  18: 'On affine ta direction, continue 💫',
  25: 'Tu y es presque, plus que 25 questions 💪',
  32: 'Ton profil devient très clair 🚀',
  40: 'Dernière ligne droite 🎯',
  45: 'Plus que 5 petites questions ⚡',
  48: 'Presque fini, tiens le cap 🙌',
};

/** Quiz métier (30 questions « métier » affichées ; numéro = carte affichée 1-based). */
export const METIER_SPECIAL_AFTER_QUESTION = {
  4: 'Tes préférences se précisent déjà ✨',
  8: 'Ton profil prend forme 🔥',
  12: 'On affine ton style de métier 💫',
  15: 'Tu y es presque, plus que 15 questions 💪',
  20: 'Ton profil devient très net 🚀',
  24: 'Dernière ligne droite 🎯',
  28: 'Plus que quelques petites questions ⚡',
  29: 'Dernier effort, on y est presque 🙌',
};

function pickRandomDifferentMessage(list, previousMessage) {
  if (!Array.isArray(list) || list.length === 0) return null;
  if (list.length === 1) return list[0];
  const filtered = list.filter((m) => m !== previousMessage);
  const safeList = filtered.length > 0 ? filtered : list;
  return safeList[Math.floor(Math.random() * safeList.length)];
}

export function pickRandomEncouragement(previousMessage = null) {
  return pickRandomDifferentMessage(ROTATING_ENCOURAGEMENT_MESSAGES, previousMessage);
}

/**
 * @param {number} completedQuestionNumber
 * @returns {string | null}
 */
export function getSectorSpecialMessage(completedQuestionNumber) {
  if (typeof completedQuestionNumber !== 'number' || completedQuestionNumber < 1) return null;
  return SECTOR_SPECIAL_AFTER_QUESTION[completedQuestionNumber] ?? null;
}

/**
 * @param {number} completedQuestionNumber
 * @returns {string | null}
 */
export function getMetierSpecialMessage(completedQuestionNumber) {
  if (typeof completedQuestionNumber !== 'number' || completedQuestionNumber < 1) return null;
  return METIER_SPECIAL_AFTER_QUESTION[completedQuestionNumber] ?? null;
}

/**
 * Message à afficher après une réponse (secteur, phase principale uniquement pour les spéciaux).
 */
export function resolveSectorEncouragement(completedQuestionNumber, isMainPhase, previousMessage = null) {
  if (isMainPhase) {
    const special = getSectorSpecialMessage(completedQuestionNumber);
    if (special && special !== previousMessage) return special;
  }
  return pickRandomEncouragement(previousMessage);
}

/**
 * Message après une réponse quiz métier.
 */
export function resolveMetierEncouragement(completedQuestionNumber, previousMessage = null) {
  const special = getMetierSpecialMessage(completedQuestionNumber);
  if (special && special !== previousMessage) return special;
  return pickRandomEncouragement(previousMessage);
}
