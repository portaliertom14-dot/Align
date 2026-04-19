/** Texte générique renvoyé par l’edge quand la description longue n’est pas fournie (ne doit pas bloquer le fetch côté client). */
export const SECTOR_DESCRIPTION_PLACEHOLDER =
  'Ce secteur offre des opportunités variées. Découvre les métiers qui te correspondent.';

export function isSectorDescriptionPlaceholder(text) {
  const t = typeof text === 'string' ? text.trim() : '';
  return !t || t === SECTOR_DESCRIPTION_PLACEHOLDER;
}

const SHORT_PRODUCT_PREFIXES = [
  'ton profil correspond le mieux à :',
  'ton profil correspond le mieux à ce secteur',
  'ton profil est polyvalent, mais le secteur le plus cohérent reste :',
  'ton profil touche plusieurs secteurs',
];

/**
 * Phrases courtes générées par l’edge / le produit : ne pas les traiter comme une description riche
 * (sinon elles bloquent l’appel à sector-description alors qu’elles font ~50–120 caractères).
 */
export function isShortSectorProductDescription(text) {
  const t = typeof text === 'string' ? text.trim() : '';
  if (!t) return true;
  const lower = t.toLowerCase();
  if (SHORT_PRODUCT_PREFIXES.some((p) => lower.startsWith(p))) return true;
  if (lower === 'ton profil correspond le mieux à ce secteur.' || lower === 'ton profil correspond le mieux à ce secteur') return true;
  return false;
}

/** Description affichable : assez longue et pas une phrase produit ni le placeholder marketing. */
export function isRichSectorDescription(text) {
  const t = typeof text === 'string' ? text.trim() : '';
  if (t.length < 70) return false;
  if (isSectorDescriptionPlaceholder(t)) return false;
  if (isShortSectorProductDescription(t)) return false;
  return true;
}
