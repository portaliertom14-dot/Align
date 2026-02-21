/**
 * Tests V3 Hybride Premium — fixtures secteur + 2 cas de décision.
 * 1) Confiance haute → pickedSectorId déterminé
 * 2) Undetermined + microQuestions non vides
 *
 * Run: cd supabase/functions && deno test _shared/fixturesV3.test.ts --allow-read
 */

import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import { getCandidateJobIdsForSector } from './clusters.ts';
import { SECTOR_UNDETERMINED } from './sectors.ts';
import { getSectorIfWhitelisted, validateWhitelist } from './validation.ts';
import { parseJsonStrict } from './parseJsonStrict.ts';
import { SECTOR_IDS } from './sectors.ts';
import {
  FIXTURE_SECTOR_TECH,
  FIXTURE_SECTOR_CREA,
  FIXTURE_SECTOR_AMBIVALENT,
  FIXTURE_SECTOR_SPORT,
  FIXTURE_SECTOR_EDUCATION,
  EXPECTED_SECTOR_TECH,
  EXPECTED_SECTOR_CREA,
  EXPECTED_SECTOR_SPORT,
  EXPECTED_SECTOR_EDUCATION,
  EXPECTED_SECTOR_UNDETERMINED,
  MIN_CONFIDENCE_DETERMINED,
  MAX_CONFIDENCE_UNDETERMINED,
  DOMAIN_QUESTION_IDS_FIXTURE,
} from './fixturesV3.ts';

const EXPECTED_ANSWERS_COUNT = 46;

Deno.test('fixture tech: 46 réponses secteur (dont Q41–Q46)', () => {
  const keys = Object.keys(FIXTURE_SECTOR_TECH).filter((k) => k.startsWith('secteur_'));
  assertEquals(keys.length, EXPECTED_ANSWERS_COUNT);
  DOMAIN_QUESTION_IDS_FIXTURE.forEach((id) => assertEquals(FIXTURE_SECTOR_TECH[id] != null, true));
});

Deno.test('fixture crea: 46 réponses secteur (dont Q41–Q46)', () => {
  const keys = Object.keys(FIXTURE_SECTOR_CREA).filter((k) => k.startsWith('secteur_'));
  assertEquals(keys.length, EXPECTED_ANSWERS_COUNT);
  DOMAIN_QUESTION_IDS_FIXTURE.forEach((id) => assertEquals(FIXTURE_SECTOR_CREA[id] != null, true));
});

Deno.test('fixture ambivalent: 46 réponses secteur (dont Q41–Q46)', () => {
  const keys = Object.keys(FIXTURE_SECTOR_AMBIVALENT).filter((k) => k.startsWith('secteur_'));
  assertEquals(keys.length, EXPECTED_ANSWERS_COUNT);
  DOMAIN_QUESTION_IDS_FIXTURE.forEach((id) => assertEquals(FIXTURE_SECTOR_AMBIVALENT[id] != null, true));
});

Deno.test('fixture sport: 46 réponses, Q41–Q46 présentes → attendu sport_evenementiel ou top1 après refinement', () => {
  const keys = Object.keys(FIXTURE_SECTOR_SPORT).filter((k) => k.startsWith('secteur_'));
  assertEquals(keys.length, EXPECTED_ANSWERS_COUNT);
  DOMAIN_QUESTION_IDS_FIXTURE.forEach((id) => assertEquals(FIXTURE_SECTOR_SPORT[id] != null, true));
  assertEquals(validateWhitelist(EXPECTED_SECTOR_SPORT, SECTOR_IDS as unknown as string[]), true);
});

Deno.test('fixture education: 46 réponses, Q41–Q46 présentes → attendu education_formation', () => {
  const keys = Object.keys(FIXTURE_SECTOR_EDUCATION).filter((k) => k.startsWith('secteur_'));
  assertEquals(keys.length, EXPECTED_ANSWERS_COUNT);
  DOMAIN_QUESTION_IDS_FIXTURE.forEach((id) => assertEquals(FIXTURE_SECTOR_EDUCATION[id] != null, true));
  assertEquals(validateWhitelist(EXPECTED_SECTOR_EDUCATION, SECTOR_IDS as unknown as string[]), true);
});

Deno.test('tech → ingenierie_tech: candidats métier contient developpeur et length >= 3', () => {
  const candidateJobIds = getCandidateJobIdsForSector(EXPECTED_SECTOR_TECH);
  assertEquals(candidateJobIds.length >= 3, true);
  assertEquals(candidateJobIds.includes('developpeur'), true);
});

Deno.test('crea → creation_design: candidats métier contient graphiste et length >= 3', () => {
  const candidateJobIds = getCandidateJobIdsForSector(EXPECTED_SECTOR_CREA);
  assertEquals(candidateJobIds.length >= 3, true);
  assertEquals(candidateJobIds.includes('graphiste'), true);
});

Deno.test('undetermined: constante et non dans whitelist secteur', () => {
  assertEquals(EXPECTED_SECTOR_UNDETERMINED, 'undetermined');
  assertEquals(SECTOR_UNDETERMINED, 'undetermined');
  const w = getSectorIfWhitelisted('undetermined');
  assertEquals(w, null);
});

Deno.test('règles confidence: seuils définis', () => {
  assertEquals(MIN_CONFIDENCE_DETERMINED, 0.60);
  assertEquals(MAX_CONFIDENCE_UNDETERMINED, 0.40);
});

// ——— 2 fixtures décision (output API) ———

/** Mock réponse IA confiance haute → secteur déterminé */
const MOCK_SECTOR_RESPONSE_HIGH = JSON.stringify({
  sectorRanked: [
    { secteurId: 'ingenierie_tech', score: 0.92, reason: 'Profil technique et structuré' },
    { secteurId: 'data_ia', score: 0.75, reason: 'Intérêt pour la donnée' },
    { secteurId: 'sciences_recherche', score: 0.6, reason: 'Rigueur analytique' },
  ],
  confidence: 0.85,
  pickedSectorId: 'ingenierie_tech',
  profileSummary: 'Profil orienté logique et construction.',
  contradictions: [],
  secteurName: 'Ingénierie & Tech',
  description: 'Tu aimes concevoir et structurer.',
  microQuestions: [],
});

Deno.test('fixture décision: confiance haute → pickedSectorId déterminé', () => {
  const parsed = parseJsonStrict(MOCK_SECTOR_RESPONSE_HIGH);
  assertEquals(parsed !== null, true);
  assertEquals((parsed as { confidence: number }).confidence > MIN_CONFIDENCE_DETERMINED, true);
  const picked = (parsed as { pickedSectorId: string }).pickedSectorId;
  assertEquals(validateWhitelist(picked, SECTOR_IDS as unknown as string[]), true);
  assertEquals(picked, EXPECTED_SECTOR_TECH);
  const mq = (parsed as { microQuestions: unknown[] }).microQuestions;
  assertEquals(Array.isArray(mq) && mq.length === 0, true);
});

/** Mock réponse IA undetermined + microQuestions */
const MOCK_SECTOR_RESPONSE_UNDETERMINED = JSON.stringify({
  sectorRanked: [
    { secteurId: 'creation_design', score: 0.52, reason: 'Créatif' },
    { secteurId: 'communication_media', score: 0.48, reason: 'Média' },
  ],
  confidence: 0.35,
  pickedSectorId: 'undetermined',
  profileSummary: 'Profil équilibré entre création et communication.',
  contradictions: ['Préférence pour structure et liberté'],
  secteurName: 'Secteur non déterminé',
  description: 'Réponds aux questions pour affiner.',
  microQuestions: [
    { id: 'micro_1', question: 'Tu préfères travailler sur quoi en priorité ?', options: [{ label: 'Projets visuels', value: 'A' }, { label: 'Contenus écrits', value: 'B' }, { label: 'Les deux', value: 'C' }] },
    { id: 'micro_2', question: 'Ton environnement idéal ?', options: [{ label: 'Agence / studio', value: 'A' }, { label: 'Média / rédaction', value: 'B' }, { label: 'Indépendant', value: 'C' }] },
  ],
});

Deno.test('fixture décision: undetermined + microQuestions non vides', () => {
  const parsed = parseJsonStrict(MOCK_SECTOR_RESPONSE_UNDETERMINED);
  assertEquals(parsed !== null, true);
  const confidence = (parsed as { confidence: number }).confidence;
  assertEquals(confidence < MIN_CONFIDENCE_DETERMINED, true);
  assertEquals((parsed as { pickedSectorId: string }).pickedSectorId, SECTOR_UNDETERMINED);
  const mq = (parsed as { microQuestions: unknown[] }).microQuestions;
  assertEquals(Array.isArray(mq) && mq.length >= 2, true);
  assertEquals((mq[0] as { id: string }).id, 'micro_1');
});

Deno.test('validateWhitelist: id dans liste', () => {
  assertEquals(validateWhitelist('ingenierie_tech', SECTOR_IDS as unknown as string[]), true);
  assertEquals(validateWhitelist('creation_design', SECTOR_IDS as unknown as string[]), true);
});

Deno.test('validateWhitelist: id hors liste', () => {
  assertEquals(validateWhitelist('tech', SECTOR_IDS as unknown as string[]), false);
  assertEquals(validateWhitelist('undetermined', SECTOR_IDS as unknown as string[]), false);
});

Deno.test('parseJsonStrict: strip markdown', () => {
  const wrapped = '```json\n{"a":1}\n```';
  const parsed = parseJsonStrict(wrapped);
  assertEquals(parsed !== null && (parsed as { a: number }).a === 1, true);
});
