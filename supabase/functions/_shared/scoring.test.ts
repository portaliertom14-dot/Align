/**
 * Tests rapides scoring + clusters.
 * Run: cd supabase/functions && deno test _shared/scoring.test.ts --allow-read
 */

import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import { buildProfileFromMetierAnswers, scoreClusters, pickTopCandidates } from './scoring.ts';

Deno.test('profil tech => builder_tech top1', () => {
  const answers: Record<string, string> = {};
  const questions = [
    { id: 'metier_1', question: '?', options: ['maîtrises des outils précis (technique)', 'inventes des idées (créatif)', 'agis vite sur le terrain (opérationnel)'] },
    { id: 'metier_4', question: '?', options: ['analyser / résoudre', 'imaginer / créer', 'exécuter / livrer'] },
    { id: 'metier_12', question: '?', options: ['fais un diagnostic complet', 'trouves une solution créative', 'agis tout de suite pour limiter les dégâts'] },
  ];
  questions.forEach((q, i) => {
    const opt = q.options![0] as string;
    answers[q.id] = opt;
  });
  for (let i = 1; i <= 20; i++) {
    const id = `metier_${i}`;
    if (!answers[id]) answers[id] = 'maîtrises des outils précis (technique)';
  }
  const profile = buildProfileFromMetierAnswers(answers, questions);
  const scores = scoreClusters(profile);
  assertEquals(scores[0].clusterId, 'builder_tech');
});

Deno.test('profil créatif => creator top1', () => {
  const answers: Record<string, string> = {};
  const questions = [
    { id: 'metier_1', question: '?', options: ['maîtrises des outils précis', 'inventes des idées (créatif)', 'agis vite sur le terrain'] },
    { id: 'metier_4', question: '?', options: ['analyser / résoudre', 'imaginer / créer', 'exécuter / livrer'] },
  ];
  questions.forEach((q) => {
    answers[q.id] = (q.options as string[])[1];
  });
  for (let i = 1; i <= 20; i++) {
    const id = `metier_${i}`;
    if (!answers[id]) answers[id] = 'inventes des idées (créatif)';
  }
  const profile = buildProfileFromMetierAnswers(answers, questions);
  const scores = scoreClusters(profile);
  const top1 = scores[0].clusterId;
  const ok = top1 === 'creator_design' || top1 === 'creator_media';
  assertEquals(ok, true);
});

Deno.test('profil terrain => field_ops dans top 2', () => {
  const answers: Record<string, string> = {};
  const thirdOption = (a: string, b: string, c: string) => c;
  const questions = [
    { id: 'metier_1', question: '?', options: ['technique', 'créatif', 'agis vite sur le terrain (opérationnel)'] },
    { id: 'metier_2', question: '?', options: ['régulier, planifié', 'variable, inspirant', 'intense et rythmé'] },
    { id: 'metier_6', question: '?', options: ['faible — je préfère sécurité', 'moyen', 'élevé — j\'adore l\'action'] },
    { id: 'metier_12', question: '?', options: ['diagnostic complet', 'solution créative', 'agis tout de suite pour limiter les dégâts'] },
  ];
  for (const q of questions) {
    const opts = q.options as string[];
    answers[q.id] = opts[opts.length - 1];
  }
  for (let i = 1; i <= 20; i++) {
    const id = `metier_${i}`;
    if (!answers[id]) answers[id] = 'agis vite sur le terrain (opérationnel)';
  }
  const profile = buildProfileFromMetierAnswers(answers, questions);
  const scores = scoreClusters(profile);
  const topIds = scores.slice(0, 2).map((s) => s.clusterId);
  const ok = topIds.includes('field_ops');
  assertEquals(ok, true);
});

Deno.test('pickTopCandidates returns candidates from top clusters', () => {
  const answers = {} as Record<string, string>;
  for (let i = 1; i <= 20; i++) answers[`metier_${i}`] = 'maîtrises des outils précis (technique)';
  const questions = [{ id: 'metier_1', question: '?', options: ['maîtrises des outils précis (technique)', 'b', 'c'] }];
  const profile = buildProfileFromMetierAnswers(answers, questions);
  const scores = scoreClusters(profile);
  const groups = pickTopCandidates(scores, 3, 5);
  assertEquals(groups.length >= 1, true);
  assertEquals(groups[0].candidates.length >= 1, true);
});
