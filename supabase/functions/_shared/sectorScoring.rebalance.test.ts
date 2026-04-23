/**
 * Non-régression rééquilibrage scoring secteur (Q1–Q40 uniquement).
 * Vérifie:
 * - mappings inversés corrigés,
 * - rotation du trio Data/Ingénierie/Sciences sur les réponses A,
 * - renfort Business sur réponses C ciblées.
 */

import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import { buildSectorProfileFromSecteurAnswers, scoreSectors } from './sectorScoring.ts';

function top3For(questionId: string, choice: 'A' | 'B' | 'C'): string[] {
  const answers = { [questionId]: choice };
  const questions = [{ id: questionId, options: ['A', 'B', 'C'] }];
  const profile = buildSectorProfileFromSecteurAnswers(answers, questions);
  return scoreSectors(profile).slice(0, 3).map((s) => s.secteurId);
}

function includesAll(top: string[], expected: string[]): boolean {
  return expected.every((id) => top.includes(id));
}

Deno.test('rebalance: mappings inversés corrigés (Q16A, Q31A, Q37A, Q39C)', () => {
  const q16A = top3For('secteur_16', 'A');
  assertEquals(includesAll(q16A, ['sport_evenementiel', 'defense_securite_civile', 'sante_bien_etre']), true, `Q16A top3=${q16A.join(',')}`);

  const q31A = top3For('secteur_31', 'A');
  assertEquals(includesAll(q31A, ['defense_securite_civile', 'sport_evenementiel', 'sante_bien_etre']), true, `Q31A top3=${q31A.join(',')}`);

  const q37A = top3For('secteur_37', 'A');
  assertEquals(includesAll(q37A, ['business_entrepreneuriat', 'finance_assurance', 'sport_evenementiel']), true, `Q37A top3=${q37A.join(',')}`);

  const q39C = top3For('secteur_39', 'C');
  assertEquals(includesAll(q39C, ['business_entrepreneuriat', 'sport_evenementiel', 'communication_media']), true, `Q39C top3=${q39C.join(',')}`);
});

Deno.test('rebalance: rotation réponses A Q1–Q40 (trio dominant séparé)', () => {
  const q1A = top3For('secteur_1', 'A');
  const q13A = top3For('secteur_13', 'A');
  assertEquals(q1A.includes('data_ia') && q1A.includes('ingenierie_tech') && !q1A.includes('sciences_recherche'), true, `Q1A top3=${q1A.join(',')}`);
  assertEquals(q13A.includes('data_ia') && q13A.includes('ingenierie_tech') && !q13A.includes('sciences_recherche'), true, `Q13A top3=${q13A.join(',')}`);

  const q14A = top3For('secteur_14', 'A');
  const q26A = top3For('secteur_26', 'A');
  assertEquals(q14A.includes('ingenierie_tech') && q14A.includes('sciences_recherche') && !q14A.includes('data_ia'), true, `Q14A top3=${q14A.join(',')}`);
  assertEquals(q26A.includes('ingenierie_tech') && q26A.includes('sciences_recherche') && !q26A.includes('data_ia'), true, `Q26A top3=${q26A.join(',')}`);

  const q27A = top3For('secteur_27', 'A');
  const q40A = top3For('secteur_40', 'A');
  assertEquals(q27A.includes('sciences_recherche') && q27A.includes('data_ia') && !q27A.includes('ingenierie_tech'), true, `Q27A top3=${q27A.join(',')}`);
  assertEquals(q40A.includes('sciences_recherche') && q40A.includes('data_ia') && !q40A.includes('ingenierie_tech'), true, `Q40A top3=${q40A.join(',')}`);
});

Deno.test('rebalance: renfort Business sur réponses C ciblées', () => {
  const targets = ['secteur_3', 'secteur_8', 'secteur_14', 'secteur_20', 'secteur_25', 'secteur_35'];
  for (const qid of targets) {
    const top = top3For(qid, 'C');
    assertEquals(top.includes('business_entrepreneuriat'), true, `${qid}C top3=${top.join(',')}`);
  }
});

