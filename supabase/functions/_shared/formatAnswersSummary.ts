/**
 * Format des réponses brutes pour l'IA — résumé stable et lisible, évite les bugs de matching.
 * Utilisé par analyze-sector et analyze-job.
 */

export function formatAnswersSummary(params: {
  answers: Record<string, { label?: string; value?: string }>;
  questions?: Array<{ id: string; question?: string; texte?: string }>;
}) {
  const { answers, questions } = params;
  const qMap = new Map<string, string>();
  (questions ?? []).forEach((q) => qMap.set(q.id, q.question ?? q.texte ?? ''));

  return Object.keys(answers)
    .sort((a, b) => a.localeCompare(b))
    .map((id) => {
      const q = qMap.get(id);
      const label = answers[id]?.label ?? '';
      const value = answers[id]?.value ?? '';
      const qText = q ? ` — ${q}` : '';
      return `- ${id}${qText}: ${label} (${value})`;
    })
    .join('\n');
}

/** Normalise les réponses payload (string ou { label, value }) vers le format attendu par formatAnswersSummary. */
export function normalizeAnswersToLabelValue(
  raw: Record<string, unknown>
): Record<string, { label: string; value: string }> {
  const out: Record<string, { label: string; value: string }> = {};
  for (const id of Object.keys(raw)) {
    const v = raw[id];
    if (v != null && typeof v === 'object' && 'label' in v) {
      out[id] = {
        label: String((v as { label?: string }).label ?? ''),
        value: String((v as { value?: string }).value ?? ''),
      };
    } else {
      const s = typeof v === 'string' ? v : String(v ?? '');
      out[id] = { label: s.trim(), value: '' };
    }
  }
  return out;
}
