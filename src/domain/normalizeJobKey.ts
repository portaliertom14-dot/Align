/**
 * Normalisation canonique des titres de métiers pour comparaison / whitelist.
 * Utilisée pour matcher "Producteur" vs "producteur", "Officier d'armée" vs "officier d'armee".
 */

/**
 * Retire les accents (diacritiques) en décomposant en NFD puis en supprimant les marques combinantes.
 */
function removeAccents(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '');
}

/**
 * Normalise une chaîne pour usage comme clé de comparaison (whitelist, dedup).
 * - trim
 * - toLowerCase
 * - remove accents (NFD + remove diacritics)
 * - apostrophes typographiques → '
 * - espaces multiples → un seul
 * - ponctuation non alphanum supprimée (sauf espaces et tirets)
 *
 * Exemples:
 * - "Producteur" => "producteur"
 * - "Officier d'armée" => "officier d'armee"
 * - "CEO / Dirigeant d'entreprise" => "ceo dirigeant d'entreprise"
 */
export function normalizeJobKey(input: string): string {
  if (input == null || typeof input !== 'string') return '';
  let s = input.trim();
  // Apostrophes typographiques → ASCII
  s = s.replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'");
  s = s.replace(/\u201C|\u201D|\u201E|\u2033/g, "'");
  s = s.toLowerCase();
  s = removeAccents(s);
  // Espaces multiples → un seul
  s = s.replace(/\s+/g, ' ');
  // Enlever ponctuation sauf espaces et tirets (alphanum + espace + tiret)
  s = s.replace(/[^\p{L}\p{N}\s\-']/gu, '');
  return s.trim();
}
