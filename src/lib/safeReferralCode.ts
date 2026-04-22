/**
 * Code parrainage depuis l’URL : format restreint pour éviter stockage de payloads arbitraires.
 * Alphanumérique + tirets/underscores, longueur bornée.
 */
const MAX_LEN = 80;
const SAFE_REF_PATTERN = /^[a-zA-Z0-9_-]+$/;

export function sanitizeReferralCodeForStorage(raw: unknown): string | null {
  if (raw == null || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > MAX_LEN) return null;
  if (!SAFE_REF_PATTERN.test(trimmed)) return null;
  return trimmed;
}
