/**
 * Normalisation canonique des titres de métiers (identique au client src/domain/normalizeJobKey.ts).
 * NFD + remove diacritics, lower, trim, apostrophes, espaces, ponctuation.
 */

function removeAccents(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '');
}

export function normalizeJobKey(input: string): string {
  if (input == null || typeof input !== 'string') return '';
  let s = input.trim();
  s = s.replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'");
  s = s.replace(/\u201C|\u201D|\u201E|\u2033/g, "'");
  s = s.toLowerCase();
  s = removeAccents(s);
  s = s.replace(/\s+/g, ' ');
  s = s.replace(/[^\p{L}\p{N}\s\-']/gu, '');
  return s.trim();
}
