/**
 * Tests structurels — scoring domaine Q41–Q50, accessibilité Tech/Data.
 * - Profil sans signaux tech forts → ingenierie_tech et data_ia ne doivent pas être top1 (scoring seul).
 * - Profil full tech → top1 ∈ {ingenierie_tech, data_ia}.
 * - Les 16 secteurs restent atteignables (scoring-based).
 *
 * Run: cd supabase/functions && deno test _shared/structural.test.ts --allow-read
 */

import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import { SECTOR_IDS } from './sectors.ts';
import { computeDomainScores, computeMicroDomainScores, type MicroDomainScores } from './domainTags.ts';

const SECTOR_IDS_LIST = SECTOR_IDS as unknown as string[];

/** Applique la formule Edge : base*1 + domain*2 + micro*4. Ici base = 0 pour tous (ranking pur domaine+micro). */
function applyWeightedScoringZeroBase(domain: MicroDomainScores, micro: MicroDomainScores): Array<{ id: string; score: number }> {
  const out: Array<{ id: string; score: number }> = [];
  for (const id of SECTOR_IDS_LIST) {
    const d = (domain as unknown as Record<string, number>)[id] ?? 0;
    const m = (micro as unknown as Record<string, number>)[id] ?? 0;
    out.push({ id, score: d * 2 + m * 4 });
  }
  out.sort((a, b) => b.score - a.score);
  return out;
}

Deno.test('structural: profil sans signaux tech forts → ingenierie_tech et data_ia ne sont pas top1', () => {
  const rawAnswers: Record<string, unknown> = {};
  rawAnswers['secteur_41'] = { value: 'A' };
  rawAnswers['secteur_42'] = { value: 'C' };
  rawAnswers['secteur_43'] = { value: 'A' };
  rawAnswers['secteur_44'] = { value: 'C' };
  rawAnswers['secteur_45'] = { value: 'C' };
  rawAnswers['secteur_46'] = { value: 'C' };
  rawAnswers['secteur_47'] = { value: 'C' };
  rawAnswers['secteur_48'] = { value: 'A' };
  rawAnswers['secteur_49'] = { value: 'A' };
  rawAnswers['secteur_50'] = { value: 'A' };

  const domain = computeDomainScores(rawAnswers);
  const micro = computeMicroDomainScores(rawAnswers);
  const ranked = applyWeightedScoringZeroBase(domain, micro);
  const top1 = ranked[0]?.id;

  assertEquals(top1 !== 'ingenierie_tech', true, 'top1 doit ne pas être ingenierie_tech sans signaux tech');
  assertEquals(top1 !== 'data_ia', true, 'top1 doit ne pas être data_ia sans signaux tech');
});

Deno.test('structural: profil full tech (Q41=B, Q43=B, Q48=C, Q49=C, Q50=C) → top1 ∈ {ingenierie_tech, data_ia}', () => {
  const rawAnswers: Record<string, unknown> = {};
  rawAnswers['secteur_41'] = { value: 'B' };
  rawAnswers['secteur_42'] = { value: 'B' };
  rawAnswers['secteur_43'] = { value: 'B' };
  rawAnswers['secteur_44'] = { value: 'B' };
  rawAnswers['secteur_45'] = { value: 'A' };
  rawAnswers['secteur_46'] = { value: 'B' };
  rawAnswers['secteur_47'] = { value: 'B' };
  rawAnswers['secteur_48'] = { value: 'C' };
  rawAnswers['secteur_49'] = { value: 'C' };
  rawAnswers['secteur_50'] = { value: 'C' };

  const domain = computeDomainScores(rawAnswers);
  const micro = computeMicroDomainScores(rawAnswers);
  const ranked = applyWeightedScoringZeroBase(domain, micro);
  const top1 = ranked[0]?.id;

  assertEquals(
    top1 === 'ingenierie_tech' || top1 === 'data_ia',
    true,
    `top1 doit être ingenierie_tech ou data_ia (got ${top1})`
  );
});

Deno.test('structural: les 16 secteurs sont présents dans le scoring domaine+micro', () => {
  const rawAnswers: Record<string, unknown> = {};
  for (let i = 41; i <= 50; i++) rawAnswers[`secteur_${i}`] = { value: 'B' };

  const domain = computeDomainScores(rawAnswers);
  const micro = computeMicroDomainScores(rawAnswers);

  const sectorIdsFromScores = new Set<string>([
    ...Object.keys(domain),
    ...Object.keys(micro),
  ]);
  assertEquals(SECTOR_IDS_LIST.length, 16);
  for (const id of SECTOR_IDS_LIST) {
    assertEquals(sectorIdsFromScores.has(id), true, `secteur ${id} doit être présent dans les scores`);
  }
});
