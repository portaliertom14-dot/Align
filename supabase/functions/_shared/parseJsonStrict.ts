/**
 * Parsing JSON robuste pour réponses IA — strip texte autour, try/catch.
 * Utilisé par analyze-sector et analyze-job.
 */

/**
 * Extrait et parse un JSON depuis une chaîne qui peut contenir du markdown ou du texte autour.
 * - Strip ```json ... ``` ou ``` ... ```
 * - Cherche le premier { et le dernier } pour isoler un bloc JSON
 * - Try/catch avec retour null si invalide
 */
export function parseJsonStrict<T = unknown>(content: string): T | null {
  if (!content || typeof content !== 'string') return null;
  let cleaned = content.trim();
  // Strip markdown code blocks
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/g, '').trim();
  // Fallback: find first { and last } to extract a single JSON object
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}
