/**
 * Reachability tests : vérifier que chaque secteur cible peut sortir top1
 * quand les signaux (Q41–Q46 + Q47–Q50) sont maximaux, sans appeler OpenAI.
 * Applique : sectorRanked de base (simulé) + microScores + rerank + hard rule.
 */

import { computeDomainTagsServer, computeMicroDomainScores, type MicroDomainScores } from '../_shared/domainTags.ts';
import { SECTOR_IDS } from '../_shared/sectors.ts';
import { validateWhitelist } from '../_shared/validation.ts';

const SECTOR_RANKED_MAX = 6;
const MICRO_BONUS_FACTOR = 4;
const DOMAIN_IDS = ['secteur_41', 'secteur_42', 'secteur_43', 'secteur_44', 'secteur_45', 'secteur_46'];

type SectorRankedItem = { id: string; score: number };

function applyMicroRerank(
  sectorRanked: SectorRankedItem[],
  microScores: MicroDomainScores
): SectorRankedItem[] {
  const withMicro = sectorRanked.map((t) => {
    const base = typeof t.score === 'number' ? t.score : 0;
    const add = (microScores as unknown as Record<string, number>)[t.id] ?? 0;
    return { id: t.id, score: base + add * MICRO_BONUS_FACTOR };
  });
  return [...withMicro].sort((a, b) => b.score - a.score).slice(0, SECTOR_RANKED_MAX);
}

function applyHardRule(
  sectorRanked: SectorRankedItem[],
  domainTagsServer: { finaliteDominanteServer: string; signauxTechExplicitesServer: boolean }
): SectorRankedItem[] {
  const allowed = SECTOR_IDS as unknown as string[];
  const isHumainDirect = domainTagsServer.finaliteDominanteServer === 'humain_direct';
  const hasTechSignals = domainTagsServer.signauxTechExplicitesServer === true;
  const bannedIds: string[] = isHumainDirect
    ? (hasTechSignals ? ['ingenierie_tech'] : ['ingenierie_tech', 'data_ia'])
    : [];

  if (!isHumainDirect || sectorRanked.length < 1 || bannedIds.length === 0) {
    return sectorRanked;
  }

  const pickedSectorId = sectorRanked[0].id;
  if (!bannedIds.includes(pickedSectorId)) return sectorRanked;

  const firstNonBanned = sectorRanked.find((t) => !bannedIds.includes(t.id));
  let newTop1Id: string | undefined = firstNonBanned?.id;
  if (!newTop1Id) {
    const fallbackOrder = ['education_formation', 'social_humain', 'sante_bien_etre'];
    newTop1Id = fallbackOrder.find((id) => validateWhitelist(id, allowed))
      ?? allowed.find((id) => !bannedIds.includes(id));
  }
  if (!newTop1Id) return sectorRanked;

  const newFirst = sectorRanked.find((t) => t.id === newTop1Id) ?? { id: newTop1Id, score: 0.5 };
  const rest = sectorRanked.filter((t) => t.id !== newTop1Id);
  return [newFirst, ...rest].slice(0, SECTOR_RANKED_MAX);
}

/** Réponses complètes Q1–Q40 (personnalité) : neutres pour ne pas biaiser. */
function basePersonalityAnswers(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (let i = 1; i <= 40; i++) {
    out[`secteur_${i}`] = { label: 'Option neutre', value: 'B' };
  }
  return out;
}

/** A) Sport : Q41–Q46 mouvement/performance, Q48=B (performance/business) → sport +2, business +1 ; Q49=A, Q50=C pour ne pas renforcer business/education. */
const PAYLOAD_SPORT: Record<string, unknown> = {
  ...basePersonalityAnswers(),
  secteur_41: { label: 'Les dynamiques et le mouvement', value: 'A' },
  secteur_42: { label: 'La performance et les capacités', value: 'A' },
  secteur_43: { label: 'L\'énergie et la structure', value: 'B' },
  secteur_44: { label: 'Le résultat et la compétition', value: 'A' },
  secteur_45: { label: 'Le terrain et l\'événement', value: 'B' },
  secteur_46: { label: 'L\'optimisation et la mesure', value: 'A' },
  secteur_47: { label: 'Technique et fabrication', value: 'A' },
  secteur_48: { label: 'Performance et business', value: 'B' },
  secteur_49: { label: 'Recherche et data', value: 'A' },
  secteur_50: { label: 'Santé et bien-être', value: 'C' },
};

/** B) Environnement : Q41–Q46 vivant/écosystèmes, Q50=B (environnement/nature) → env +3. */
const PAYLOAD_ENVIRONNEMENT: Record<string, unknown> = {
  ...basePersonalityAnswers(),
  secteur_41: { label: 'Le vivant et les écosystèmes', value: 'A' },
  secteur_42: { label: 'Les ressources et la nature', value: 'A' },
  secteur_43: { label: 'La transformation du vivant', value: 'B' },
  secteur_44: { label: 'La protection de l\'environnement', value: 'A' },
  secteur_45: { label: 'Les sols et les filières durables', value: 'B' },
  secteur_46: { label: 'La transition écologique', value: 'A' },
  secteur_47: { label: 'Data et recherche', value: 'B' },
  secteur_48: { label: 'Création et culture', value: 'C' },
  secteur_49: { label: 'Recherche et data', value: 'A' },
  secteur_50: { label: 'Environnement et nature', value: 'B' },
};

/** C) Droit / risque-règles : Q48=A (ordre/sécurité) → droit +1, defense +1 ; Q50 non A pour ne pas donner +2 à defense. */
const PAYLOAD_DROIT: Record<string, unknown> = {
  ...basePersonalityAnswers(),
  secteur_41: { label: 'Les règles et le cadre', value: 'A' },
  secteur_42: { label: 'La sécurité et la conformité', value: 'A' },
  secteur_43: { label: 'La logique et la structure', value: 'B' },
  secteur_44: { label: 'Le droit et la justice', value: 'A' },
  secteur_45: { label: 'L\'ordre et la protection', value: 'B' },
  secteur_46: { label: 'Le risque et l\'assurance', value: 'A' },
  secteur_47: { label: 'Humain et formation', value: 'C' },
  secteur_48: { label: 'Ordre et sécurité', value: 'A' },
  secteur_49: { label: 'Recherche et data', value: 'A' },
  // Q50 omis : éviter +2 à defense (Q50=A) ou sante (Q50=C), pour que droit reste top1 avec Q48=A.
};

Deno.test('reachability A) sport_evenementiel — signaux terrain/performance → top1 sport', () => {
  const rawAnswers = PAYLOAD_SPORT as Record<string, unknown>;
  const domainTagsServer = computeDomainTagsServer(rawAnswers, DOMAIN_IDS);
  const microScores = computeMicroDomainScores(rawAnswers);

  const baseRanked: SectorRankedItem[] = [
    { id: 'sport_evenementiel', score: 0.35 },
    { id: 'sante_bien_etre', score: 0.33 },
    { id: 'business_entrepreneuriat', score: 0.32 },
    { id: 'education_formation', score: 0.2 },
  ];
  let ranked = applyMicroRerank(baseRanked, microScores);
  ranked = applyHardRule(ranked, domainTagsServer);

  const top1 = ranked[0]?.id;
  const top3 = ranked.slice(0, 3).map((t) => ({ id: t.id, score: t.score }));

  console.log('[EDGE_MICRO_DOMAIN_SCORES] sport profile', microScores);
  console.log('[EDGE_AFTER_MICRO_RERANK] sport profile top3', top3);

  console.log('=== DEBUG SPORT PROFILE ===');
  console.log('ANS_41_46', {
    q41: rawAnswers['secteur_41'],
    q42: rawAnswers['secteur_42'],
    q43: rawAnswers['secteur_43'],
    q44: rawAnswers['secteur_44'],
    q45: rawAnswers['secteur_45'],
    q46: rawAnswers['secteur_46'],
  });
  console.log('ANS_47_50', {
    q47: rawAnswers['secteur_47'],
    q48: rawAnswers['secteur_48'],
    q49: rawAnswers['secteur_49'],
    q50: rawAnswers['secteur_50'],
  });
  console.log('DOMAIN_TAGS_SERVER', domainTagsServer);
  console.log('MICRO_SCORES', microScores);
  console.log('TOP5_AFTER_RERANK', ranked.slice(0, 5));

  if (top1 !== 'sport_evenementiel') {
    throw new Error(`Expected top1 sport_evenementiel, got ${top1}. top3=${JSON.stringify(top3)}`);
  }
});

Deno.test('reachability B) environnement_agri — signaux vivant/écosystèmes → top1 environnement_agri', () => {
  const rawAnswers = PAYLOAD_ENVIRONNEMENT as Record<string, unknown>;
  const domainTagsServer = computeDomainTagsServer(rawAnswers, DOMAIN_IDS);
  const microScores = computeMicroDomainScores(rawAnswers);

  const baseRanked: SectorRankedItem[] = [
    { id: 'environnement_agri', score: 0.32 },
    { id: 'business_entrepreneuriat', score: 0.35 },
    { id: 'education_formation', score: 0.28 },
    { id: 'industrie_artisanat', score: 0.2 },
  ];
  let ranked = applyMicroRerank(baseRanked, microScores);
  ranked = applyHardRule(ranked, domainTagsServer);

  const top1 = ranked[0]?.id;
  const top3 = ranked.slice(0, 3).map((t) => ({ id: t.id, score: t.score }));

  console.log('[EDGE_MICRO_DOMAIN_SCORES] env profile', microScores);
  console.log('[EDGE_AFTER_MICRO_RERANK] env profile top3', top3);

  if (top1 !== 'environnement_agri') {
    throw new Error(`Expected top1 environnement_agri, got ${top1}. top3=${JSON.stringify(top3)}`);
  }
});

Deno.test('reachability C) droit_justice_securite — signaux risque/règles → top1 droit', () => {
  const rawAnswers = PAYLOAD_DROIT as Record<string, unknown>;
  const domainTagsServer = computeDomainTagsServer(rawAnswers, DOMAIN_IDS);
  const microScores = computeMicroDomainScores(rawAnswers);

  const baseRanked: SectorRankedItem[] = [
    { id: 'droit_justice_securite', score: 0.5 },
    { id: 'defense_securite_civile', score: 0.45 },
    { id: 'sante_bien_etre', score: 0.2 },
  ];
  let ranked = applyMicroRerank(baseRanked, microScores);
  ranked = applyHardRule(ranked, domainTagsServer);

  const top1 = ranked[0]?.id;
  const top3 = ranked.slice(0, 3).map((t) => ({ id: t.id, score: t.score }));

  console.log('[EDGE_MICRO_DOMAIN_SCORES] droit profile', microScores);
  console.log('[EDGE_AFTER_MICRO_RERANK] droit profile top3', top3);

  if (top1 !== 'droit_justice_securite') {
    throw new Error(`Expected top1 droit_justice_securite, got ${top1}. top3=${JSON.stringify(top3)}`);
  }
});
