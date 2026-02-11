/**
 * Phrase de feedback après une mini-série (module complété).
 * Texte statique local — l’IA ne génère plus de feedback (scope Align IA).
 */

const TEMPLATES = [
  'Tu progresses à ton rythme, continue comme ça.',
  'Chaque module te rapproche de ta voie, bravo.',
  'Ton engagement paie, on continue ensemble.',
  'Tu as bien avancé, la suite t\'attend.',
  'Belle régularité, tu es sur la bonne voie.',
  'Un pas de plus vers ce qui te correspond.',
];

/**
 * Retourne une phrase de feedback statique (templates locaux).
 *
 * @param {{ seriesType?: string, choice?: string, result?: string }} params - ignorés, conservés pour compat API
 * @returns {Promise<{ feedback: string }>}
 */
export async function getCompletionFeedback({ seriesType, choice, result } = {}) {
  const idx = Math.floor(Math.random() * TEMPLATES.length);
  return { feedback: TEMPLATES[idx] };
}
