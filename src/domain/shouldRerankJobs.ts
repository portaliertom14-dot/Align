/**
 * Heuristique : faut-il appeler le reranker IA ?
 * true si ambiguïté (gap serré, score top1 faible, ou top3 quasi égaux).
 */

const GAP_THRESHOLD = 0.02;
const TOP1_MIN_SCORE = 0.78;
const TOP3_QUASI_EQUAL_GAP = 0.03;

export interface RankedJob {
  job: string;
  score: number;
}

/**
 * Retourne true si le classement cosine est ambigu :
 * - gap(top1, top2) < 0.02
 * - OU top1.score < 0.78
 * - OU top3 a des scores quasi égaux (gap top1-top3 < 0.03)
 */
export function shouldRerank(top10: RankedJob[]): boolean {
  if (!Array.isArray(top10) || top10.length < 2) return false;
  const s0 = top10[0]?.score ?? 0;
  const s1 = top10[1]?.score ?? 0;
  const s2 = top10[2]?.score ?? 0;

  if (s0 < TOP1_MIN_SCORE) return true;
  if (Math.abs(s0 - s1) < GAP_THRESHOLD) return true;
  if (top10.length >= 3 && Math.abs(s0 - s2) < TOP3_QUASI_EQUAL_GAP) return true;
  return false;
}
