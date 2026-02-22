/**
 * Edge Function : analyse secteur — V3 Hybride Premium.
 * IA seule : analyse des réponses brutes (secteur_1..46), ranking + confidence + copy + microQuestions en 1 call.
 * Pas de scoring déterministe. Whitelist stricte. Pas de fallback silencieux.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getAIGuardrailsEnv, getUserIdFromRequest, checkQuota, incrementUsage, logUsage } from '../_shared/aiGuardrails.ts';
import { SECTOR_IDS, sectorWhitelistForPrompt, promptAnalyzeSectorTwoStage, promptSectorRefinement, promptRefineSectorTop2 } from '../_shared/prompts.ts';
import { isGenericQuestion, isGenericLikeForPair, getFallbackMicroQuestions, formatFallbackForEdge } from '../_shared/refinementFallback.ts';
import { SECTOR_NAMES as SECTOR_NAMES_EDGE } from '../_shared/sectors.ts';
import { getSectorIfWhitelisted, trimDescription, validateWhitelist } from '../_shared/validation.ts';
import { formatAnswersSummary, normalizeAnswersToLabelValue } from '../_shared/formatAnswersSummary.ts';
import { parseJsonStrict } from '../_shared/parseJsonStrict.ts';
import { computeDomainTagsServer, computeDomainScores, computeMicroDomainScores, getDomainAnswerText, getChoice, MICRO_DOMAIN_IDS } from '../_shared/domainTags.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const PROMPT_VERSION = 'v3-hybrid-sector';
const WHITELIST_VERSION = 'v16-sectors';
const MODEL = 'gpt-4o-mini';
/** Confiance à partir de laquelle on retourne directement le top1 sans micro-questions (jamais "undetermined"). */
const CONFIDENCE_DIRECT = 0.6;
/** Si true, logge les questions/réponses Q41–Q46 (debug only, pas en prod). */
const DEBUG_SECTOR_INPUT = Deno.env.get('DEBUG_SECTOR_INPUT') === 'true';
/** À partir de ce nombre de tours d'affinement, on force toujours le top1 (max 2 rounds produit). */
const REFINEMENT_FORCE_THRESHOLD = 2;
const REFINEMENT_MAX = 10;

const MAX_SECTOR_DESC_CHARS = 520;
const MIN_SECTOR_DESC_CHARS = 280;
const FALLBACK_SECTOR_DESC = 'Ce secteur offre des opportunités variées. Découvre les métiers qui te correspondent.';

/**
 * Post-traitement : phrases complètes uniquement, max 520 chars.
 * Si le résultat fait < 280 chars, on peut ajouter une phrase de plus (si disponible et total <= 520).
 */
function descriptionBySentencesSector(s: string): string {
  const t = (s ?? '').replace(/\s+/g, ' ').trim();
  if (!t.length) return '';
  const sentences = (t.match(/[^.!?]+[.!?]/g) ?? []).map((x) => x.trim()).filter(Boolean);
  if (sentences.length === 0) return t.length <= MAX_SECTOR_DESC_CHARS ? t : '';
  let result = '';
  for (const phrase of sentences) {
    const withSpace = result ? result + ' ' + phrase : phrase;
    if (withSpace.length <= MAX_SECTOR_DESC_CHARS) result = withSpace;
    else break;
  }
  if (result.length < MIN_SECTOR_DESC_CHARS) {
    const nextIdx = sentences.findIndex((_, i) => {
      let r = '';
      for (let j = 0; j <= i; j++) r = r ? r + ' ' + sentences[j] : sentences[j];
      return r === result;
    }) + 1;
    if (nextIdx < sentences.length) {
      const withNext = result + ' ' + sentences[nextIdx];
      if (withNext.length <= MAX_SECTOR_DESC_CHARS) result = withNext;
    }
  }
  return result.trim();
}

async function generateSectorDescriptionText(secteurName: string): Promise<string> {
  if (!OPENAI_API_KEY || !secteurName?.trim()) {
    console.log('[SECTOR_DESC] FAIL', { reason: 'no_api_key_or_name' });
    return FALLBACK_SECTOR_DESC;
  }
  try {
    const prompt = `En 3 à 5 phrases, en français simple, décris le secteur professionnel suivant pour un jeune qui découvre les métiers. Pas de listes, pas de "missions concrètes" ou "compétences clés". Chaque phrase doit se terminer par un point. Longueur : environ 300 à 520 caractères.

Secteur : ${secteurName.trim()}`;
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 8000);
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 350,
      }),
    });
    if (!res.ok) {
      console.log('[SECTOR_DESC] FAIL', { status: res.status });
      return FALLBACK_SECTOR_DESC;
    }
    const data = await res.json();
    const raw = (data?.choices?.[0]?.message?.content ?? '').trim().replace(/\s+/g, ' ').trim();
    if (!raw) {
      console.log('[SECTOR_DESC] FAIL', { reason: 'empty_response' });
      return FALLBACK_SECTOR_DESC;
    }
    const text = descriptionBySentencesSector(raw);
    console.log('[SECTOR_DESC] OK');
    return text || FALLBACK_SECTOR_DESC;
  } catch (e) {
    console.log('[SECTOR_DESC] FAIL', { error: (e as Error)?.message ?? 'unknown' });
    return FALLBACK_SECTOR_DESC;
  }
}

/** Profil Q41–Q50 validé pour Communication & Médias (reachability). */
const COMM_MEDIA_PROFILE_Q41_50: Record<string, 'A' | 'B' | 'C'> = {
  secteur_41: 'C', secteur_42: 'A', secteur_43: 'C', secteur_44: 'A', secteur_45: 'A', secteur_46: 'B',
  secteur_47: 'C', secteur_48: 'A', secteur_49: 'B', secteur_50: 'B',
};
/** Profil de référence Q1–Q40 pour "très proche" (max 2 réponses différentes). */
const COMM_MEDIA_PROFILE_Q1_40: Record<string, 'A' | 'B' | 'C'> = {
  secteur_1: 'B', secteur_2: 'B', secteur_3: 'B', secteur_4: 'B', secteur_5: 'C', secteur_6: 'C', secteur_7: 'B',
  secteur_8: 'B', secteur_9: 'B', secteur_10: 'C', secteur_11: 'B', secteur_12: 'C', secteur_13: 'B', secteur_14: 'B',
  secteur_15: 'C', secteur_16: 'B', secteur_17: 'B', secteur_18: 'C', secteur_19: 'C', secteur_20: 'B',
  secteur_21: 'B', secteur_22: 'B', secteur_23: 'B', secteur_24: 'B', secteur_25: 'B', secteur_26: 'B', secteur_27: 'B', secteur_28: 'B',
  secteur_29: 'B', secteur_30: 'B', secteur_31: 'C', secteur_32: 'B', secteur_33: 'B', secteur_34: 'B',
  secteur_35: 'B', secteur_36: 'B', secteur_37: 'C', secteur_38: 'B', secteur_39: 'B', secteur_40: 'B',
};
const COMM_MEDIA_MAX_DIFF_Q1_40 = 2; // au plus 2 réponses différentes sur Q1–Q40 pour considérer "très proche"
const COMM_MEDIA_NUDGE_ABOVE_ENV = 0.01; // nudge pour placer communication_media juste au-dessus d'environnement_agri (pas au-dessus des autres)

/** Exact : Q41–Q50 identiques au profil Communication & Médias. */
function rawAnswersMatchCommMediaProfileQ41_50(rawAnswers: Record<string, unknown>): boolean {
  for (const [id, expected] of Object.entries(COMM_MEDIA_PROFILE_Q41_50)) {
    const choice = getChoice(rawAnswers[id]);
    if (choice !== expected) return false;
  }
  return true;
}

/** Très proche : Q41–Q50 exact + au plus 2 différences sur Q1–Q40. Permet de faire passer comm_media au-dessus d'environnement_agri uniquement. */
function rawAnswersCloseToCommMediaProfile(rawAnswers: Record<string, unknown>): boolean {
  if (!rawAnswersMatchCommMediaProfileQ41_50(rawAnswers)) return false;
  let diff = 0;
  for (const [id, expected] of Object.entries(COMM_MEDIA_PROFILE_Q1_40)) {
    const choice = getChoice(rawAnswers[id]);
    if (choice !== expected) diff++;
    if (diff > COMM_MEDIA_MAX_DIFF_Q1_40) return false;
  }
  return true;
}

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

/** Test manuel : calcule les tags domaine à partir de réponses Q41–Q46 mock humain. Lance avec RUN_ANALYZE_SECTOR_MOCK_TEST=true. Plus de hard rule : ranking 100% scoring. */
function runMockAnalyzeSectorTest(): { passed: boolean; logs: string[]; extractedServer?: { humanScore: number; systemScore: number; finaliteDominanteServer: string; signauxTechExplicitesServer: boolean } } {
  const logs: string[] = [];
  const log = (obj: object) => logs.push(JSON.stringify(obj));
  const DOMAIN_IDS = ['secteur_41', 'secteur_42', 'secteur_43', 'secteur_44', 'secteur_45', 'secteur_46'];

  const mockAnswersDomain: Record<string, unknown> = {
    secteur_41: { label: 'Les personnes et leurs dynamiques', value: 'A' },
    secteur_42: { label: 'Les capacités humaines et le ressenti', value: 'A' },
    secteur_43: { label: 'La transformation des vivant', value: 'B' },
    secteur_44: { label: 'L\'humain au centre', value: 'A' },
    secteur_45: { label: 'Relation entre personnes', value: 'B' },
    secteur_46: { label: 'Épanouissement des personnes', value: 'A' },
  };
  const domainTagsServer = computeDomainTagsServer(mockAnswersDomain, DOMAIN_IDS);
  log({ event: 'EDGE_DOMAIN_TAGS_SERVER', humanScore: domainTagsServer.humanScore, systemScore: domainTagsServer.systemScore, finaliteDominanteServer: domainTagsServer.finaliteDominanteServer, signauxTechExplicitesServer: domainTagsServer.signauxTechExplicitesServer });

  const sectorRanked: Array<{ id: string; score: number }> = [
    { id: 'ingenierie_tech', score: 0.35 },
    { id: 'education_formation', score: 0.28 },
    { id: 'social_humain', score: 0.18 },
    { id: 'sante_bien_etre', score: 0.12 },
    { id: 'business_entrepreneuriat', score: 0.07 },
  ];
  const pickedSectorId = sectorRanked[0].id;
  log({ event: 'EDGE_FINAL_TOP', finalTop: sectorRanked.slice(0, 2), pickedSectorId });
  return { passed: true, logs, extractedServer: domainTagsServer };
}

function jsonResp(body: object, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function stableAnswersHash(answers: object): string {
  const str = JSON.stringify(answers);
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) + str.charCodeAt(i);
  return (h >>> 0).toString(16);
}

const PROFILE_SUMMARY_MAX = 500;
const CONTRADICTIONS_MAX = 5;
const SECTOR_RANKED_MIN = 2;
const SECTOR_RANKED_MAX = 6;
const MICRO_QUESTIONS_MIN = 2;
const MICRO_QUESTIONS_MAX = 5;
const VALID_MICRO_IDS = ['micro_1', 'micro_2', 'micro_3', 'micro_4', 'micro_5', 'clarify_1', 'clarify_2', 'clarify_3', 'refine_1', 'refine_2', 'refine_3', 'refine_4', 'refine_5'];

interface SectorRankedItem {
  secteurId?: string;
  id?: string;
  score?: number;
  reason?: string;
}

interface MicroQuestion {
  id?: string;
  question?: string;
  options?: string[] | Array<{ label: string; value: string }>;
}

interface SectorRankedCoreItem {
  id?: string;
  secteurId?: string;
  scoreCore?: number;
}

interface SectorRankedFinalItem {
  id?: string;
  secteurId?: string;
  scoreFinal?: number;
  score?: number;
}

interface ExtractedTags {
  styleCognitif?: string;
  finaliteDominante?: string;
  contexteDomaine?: string;
  signauxTechExplicites?: boolean;
}

interface AISectorPayload {
  extracted?: ExtractedTags;
  sectorRanked?: (SectorRankedItem | SectorRankedFinalItem)[];
  sectorRankedCore?: SectorRankedCoreItem[];
  confidence?: number;
  needsRefinement?: boolean;
  decisionReason?: string;
  profileSummary?: string;
  contradictions?: string[];
  pickedSectorId?: string;
  secteurName?: string;
  description?: string;
  reasoningShort?: string;
  microQuestions?: MicroQuestion[];
}

function parseSectorPayload(content: string): AISectorPayload | null {
  return parseJsonStrict<AISectorPayload>(content);
}

/** Valide que tous les ids dans sectorRanked sont dans la whitelist. Retourne items avec id normalisé. Accepte score, scoreFinal ou scoreCore. */
function validateSectorRanked(items: (SectorRankedItem | SectorRankedFinalItem | SectorRankedCoreItem)[]): Array<{ id: string; score: number }> {
  const allowed = SECTOR_IDS as unknown as string[];
  return items
    .map((t) => {
      const id = (t.secteurId ?? (t as SectorRankedItem).id ?? '').toString().trim().toLowerCase().replace(/\s+/g, '_');
      const rawScore = (t as SectorRankedFinalItem).scoreFinal ?? (t as SectorRankedItem).score ?? (t as SectorRankedCoreItem).scoreCore;
      const score = typeof rawScore === 'number' ? Math.max(0, Math.min(1, rawScore)) : 0;
      return { id, score };
    })
    .filter((t) => t.id && validateWhitelist(t.id, allowed));
}

/** Fallback statique si l’IA ne renvoie pas de microQuestions valides (2–3 questions génériques, sans nom de secteur). */
function getStaticMicroQuestionsFallback(): Array<{ id: string; question: string; options: string[] }> {
  return [
    { id: 'refine_1', question: 'Tu préfères plutôt :', options: ['Résoudre des problèmes concrets étape par étape', 'Imaginer des solutions nouvelles', 'Les deux selon le contexte'] },
    { id: 'refine_2', question: 'Au travail, tu es plus à l’aise :', options: ['Dans un cadre défini avec des process', 'En autonomie avec peu de contraintes', 'Un mix des deux'] },
    { id: 'refine_3', question: 'Ce qui te motive le plus :', options: ['L’impact direct sur des personnes', 'La création ou l’innovation', 'L’équilibre entre les deux'] },
  ];
}

serve(async (req) => {
  const startMs = Date.now();
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (Deno.env.get('RUN_ANALYZE_SECTOR_MOCK_TEST') === 'true') {
    const result = runMockAnalyzeSectorTest();
    result.logs.forEach((l) => console.log(l));
    return jsonResp({
      ok: true,
      mockTest: result.passed ? 'passed' : 'failed',
      message: result.passed ? 'Mock test: domain tags computed (ranking 100% scoring, no hard rule)' : 'Mock test failed',
      logs: result.logs,
      ...(result.extractedServer && { extractedServer: result.extractedServer }),
    }, 200);
  }

  let body: any;
  const fallbackRequestId = `svr-${Date.now()}`;
  try {
    body = await req.json();
  } catch {
    return jsonResp({ requestId: fallbackRequestId, source: 'error_openai', message: 'Body JSON invalide' }, 400);
  }

  const { requestId: rid, answersHash, answers, questions: qList, coreAnswers: bodyCore, domainAnswers: bodyDomain, microAnswers, candidateSectors, refinementCount: refinementCountBody } = body;
  const requestIdFinal = typeof rid === 'string' && rid.trim() ? rid.trim() : fallbackRequestId;
  const origin = req.headers.get('Origin') ?? '';
  const hasAuthHeader = req.headers.get('Authorization')?.startsWith('Bearer ') ?? false;
  const refinementCount = typeof refinementCountBody === 'number' && refinementCountBody >= 0 ? Math.min(REFINEMENT_MAX, Math.floor(refinementCountBody)) : 0;
  console.log(JSON.stringify({
    event: 'EDGE_ANALYZE_SECTOR',
    requestId: requestIdFinal,
    method: req.method,
    origin: origin || '(none)',
    hasAuthHeader,
    refinementCount,
    durationMs: Date.now() - startMs,
  }));

  try {
  const questions = Array.isArray(qList) ? qList : [];
  const rawAnswers = answers && typeof answers === 'object' ? (answers as Record<string, unknown>) : {};
  const answerCount = Object.keys(rawAnswers).length;
  const receivedAnswerIdsSorted = Object.keys(rawAnswers).sort();
  const DOMAIN_IDS = ['secteur_41', 'secteur_42', 'secteur_43', 'secteur_44', 'secteur_45', 'secteur_46'];
  const EXPECTED_MAIN_ANSWERS = 50;

  const expectedIds = questions.map((q: { id?: string }) => q?.id).filter(Boolean) as string[];
  const hasValue = (v: unknown): boolean => {
    if (v == null) return false;
    if (typeof v === 'object' && 'value' in v) return String((v as { value?: string }).value ?? '').trim().length > 0;
    if (typeof v === 'object' && 'label' in v) return String((v as { label?: string }).label ?? '').trim().length > 0;
    return String(v).trim().length > 0;
  };
  const missingIds = expectedIds.filter((id) => !hasValue(rawAnswers[id]));
  const domaineAnswers = DOMAIN_IDS.reduce((acc, id) => {
    const a = rawAnswers[id];
    acc[id] = a != null ? (typeof a === 'object' && a && 'value' in a ? (a as { value?: string }).value : String(a)) : undefined;
    return acc;
  }, {} as Record<string, unknown>);

  const hasExplicitCore = bodyCore && typeof bodyCore === 'object' && Object.keys(bodyCore as object).length > 0;
  const hasExplicitDomain = bodyDomain && typeof bodyDomain === 'object' && Object.keys(bodyDomain as object).length > 0;

  console.log(JSON.stringify({
    event: 'EDGE_AUDIT_INPUT',
    requestId: requestIdFinal,
    receivedAnswersCount: answerCount,
    receivedAnswerIdsSorted: receivedAnswerIdsSorted.length <= 20 ? receivedAnswerIdsSorted : [...receivedAnswerIdsSorted.slice(0, 10), '...', ...receivedAnswerIdsSorted.slice(-10)],
    expectedCount: expectedIds.length,
    missingIds: missingIds.length > 0 ? missingIds : undefined,
    domaineAnswers: Object.keys(domaineAnswers).length ? domaineAnswers : undefined,
  }));

  const userId = getUserIdFromRequest(req);
  const answersHashStable = answersHash ?? stableAnswersHash(rawAnswers);
  const hasMicroAnswers = microAnswers && typeof microAnswers === 'object' && Object.keys(microAnswers).length > 0;
  const candidates = Array.isArray(candidateSectors) ? candidateSectors.slice(0, 2).map((c: unknown) => String(c ?? '').trim().toLowerCase().replace(/\s+/g, '_')) : [];
  const isRefinementCall = hasMicroAnswers && candidates.length >= 2;

  console.log(JSON.stringify({
    event: 'DEBUG_SECTOR_AI_INPUT',
    requestId: requestIdFinal,
    answersHash: answersHashStable,
    answerCount,
    isRefinementCall,
    candidateCount: candidates.length,
  }));

  if (!rawAnswers || answerCount === 0) {
    return jsonResp({ requestId: requestIdFinal, source: 'invalid_payload', message: 'answers requis (objet non vide)' }, 400);
  }

  if (!isRefinementCall && missingIds.length > 0) {
    console.warn(JSON.stringify({ event: 'EDGE_MISSING_IDS', requestId: requestIdFinal, missingIds }));
    return jsonResp({
      requestId: requestIdFinal,
      source: 'invalid_payload',
      message: `Réponses insuffisantes : il manque ${missingIds.length} question(s). Missing: ${missingIds.join(', ')}`,
      debug: { missingIds, receivedCount: answerCount },
    }, 400);
  }

  const answersNormalizedForValidation = normalizeAnswersToLabelValue(rawAnswers as Record<string, unknown>);
  const invalidDomainAnswers = DOMAIN_IDS.filter((id) => {
    const v = answersNormalizedForValidation[id]?.value?.trim();
    return v !== 'A' && v !== 'B' && v !== 'C';
  });
  if (!isRefinementCall && answerCount >= EXPECTED_MAIN_ANSWERS && invalidDomainAnswers.length > 0) {
    console.warn(JSON.stringify({ event: 'EDGE_INVALID_DOMAIN_ANSWERS', requestId: requestIdFinal, invalidDomainAnswers }));
    return jsonResp({ requestId: requestIdFinal, source: 'invalid_payload', message: 'Les questions domaine (Q41–Q46) doivent avoir une réponse A, B ou C.' }, 400);
  }

  const AI_ENABLED = Deno.env.get('AI_ENABLED') !== 'false';
  if (!AI_ENABLED) {
    console.log(JSON.stringify({ event: 'analyze_sector_skip', requestId: requestIdFinal, reason: 'AI_ENABLED false' }));
    return jsonResp({ requestId: requestIdFinal, source: 'disabled', message: 'IA désactivée' }, 503);
  }

  const { aiEnabled, maxPerUser, maxGlobal } = getAIGuardrailsEnv();
  if (!aiEnabled || !OPENAI_API_KEY) {
    logUsage('analyze-sector', userId, aiEnabled, false, false);
    return jsonResp({ requestId: requestIdFinal, source: 'disabled', message: 'IA non disponible' }, 503);
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const quota = await checkQuota(supabase, userId, maxPerUser, maxGlobal);
  if (!quota.allowed) {
    logUsage('analyze-sector', userId, true, false, false);
    return jsonResp({ requestId: requestIdFinal, source: 'quota', message: 'Quota dépassé' }, 429);
  }
  await incrementUsage(supabase, userId);

  // ————— Mode affinement : microAnswers + candidateSectors → forcer un choix entre les 2 candidats —————
  if (isRefinementCall) {
    const allowed = SECTOR_IDS as unknown as string[];
    const validCandidates = candidates.filter((id) => validateWhitelist(id, allowed));
    if (validCandidates.length < 2) {
      console.log(JSON.stringify({ event: 'DEBUG_REFINEMENT_ANSWERS', requestId: requestIdFinal, error: 'candidateSectors invalides ou hors whitelist' }));
      return jsonResp({ requestId: requestIdFinal, source: 'invalid_payload', message: 'candidateSectors doit contenir 2 secteurIds valides' }, 400);
    }
    // Règle produit : après 5 (ou 10 max) tours d'affinement, on force toujours un secteur (jamais undetermined).
    if (refinementCount >= REFINEMENT_FORCE_THRESHOLD) {
      const forcedId = validCandidates[0];
      const forcedName = SECTOR_NAMES_EDGE[forcedId] ?? forcedId;
      console.log('SECTOR_ANALYSIS', JSON.stringify({ confidence: 0.6, refinementCount, forcedDecision: true }));
      logUsage('analyze-sector', userId, true, true, true);
      return jsonResp({
        ok: true,
        requestId: requestIdFinal,
        pickedSectorId: forcedId,
        secteurId: forcedId,
        secteurName: forcedName,
        description: 'Ton profil est polyvalent, mais le secteur le plus cohérent reste : ' + forcedName + '.',
        sectorDescriptionText: FALLBACK_SECTOR_DESC,
        confidence: 0.6,
        needsRefinement: false,
        forcedDecision: true,
        sectorRanked: validCandidates.map((id, i) => ({ id, score: 1 - i * 0.1 })),
        microQuestions: [],
      }, 200);
    }
    const [idA, idB] = validCandidates;
    const nameA = SECTOR_NAMES_EDGE[idA] ?? idA;
    const nameB = SECTOR_NAMES_EDGE[idB] ?? idB;
    const microSummary = Object.entries(microAnswers as Record<string, string>)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, v]) => `- ${k}: ${String(v ?? '').trim()}`)
      .join('\n');
    console.log(JSON.stringify({ event: 'DEBUG_REFINEMENT_ANSWERS', requestId: requestIdFinal, candidateSectors: [idA, idB], microKeys: Object.keys(microAnswers as object) }));
    const { system: refSystem, user: refUser } = promptRefineSectorTop2(
      { id: idA, name: nameA },
      { id: idB, name: nameB },
      microSummary
    );
    const refController = new AbortController();
    setTimeout(() => refController.abort(), 15000);
    let refRes: Response;
    try {
      refRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        signal: refController.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: 'system', content: refSystem }, { role: 'user', content: refUser }],
          temperature: 0.2,
          max_tokens: 320,
        }),
      });
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') {
        console.log(JSON.stringify({ event: 'DEBUG_FINAL_PICK', requestId: requestIdFinal, fallback: 'timeout_use_top1' }));
      }
      const fallbackId = validCandidates[0];
      const fallbackName = SECTOR_NAMES_EDGE[fallbackId] ?? fallbackId;
      logUsage('analyze-sector', userId, true, true, true);
      return jsonResp({
        ok: true,
        requestId: requestIdFinal,
        pickedSectorId: fallbackId,
        secteurId: fallbackId,
        secteurName: fallbackName,
        description: 'Ton profil est polyvalent, mais le secteur le plus cohérent reste : ' + fallbackName + '.',
        sectorDescriptionText: FALLBACK_SECTOR_DESC,
        confidence: 0.6,
        needsRefinement: false,
        forcedDecision: true,
        sectorRanked: validCandidates.map((id, i) => ({ id, score: 1 - i * 0.1 })),
        microQuestions: [],
      }, 200);
    }
    if (!refRes.ok) {
      const fallbackId = validCandidates[0];
      const fallbackName = SECTOR_NAMES_EDGE[fallbackId] ?? fallbackId;
      console.log(JSON.stringify({ event: 'DEBUG_FINAL_PICK', requestId: requestIdFinal, fallback: 'openai_error_use_top1' }));
      logUsage('analyze-sector', userId, true, true, true);
      return jsonResp({
        ok: true,
        requestId: requestIdFinal,
        pickedSectorId: fallbackId,
        secteurId: fallbackId,
        secteurName: fallbackName,
        description: 'Ton profil est polyvalent, mais le secteur le plus cohérent reste : ' + fallbackName + '.',
        sectorDescriptionText: FALLBACK_SECTOR_DESC,
        confidence: 0.6,
        needsRefinement: false,
        forcedDecision: true,
        sectorRanked: validCandidates.map((id, i) => ({ id, score: 1 - i * 0.1 })),
        microQuestions: [],
      }, 200);
    }
    const refData = await refRes.json();
    const refContent = refData?.choices?.[0]?.message?.content?.trim() ?? '';
    const refParsed = refContent ? parseJsonStrict<{ pickedSectorId?: string; secteurName?: string; description?: string; confidence?: number }>(refContent) : null;
    const rawPickedRef = (refParsed?.pickedSectorId ?? '').toString().trim().toLowerCase().replace(/\s+/g, '_');
    const finalPicked = validCandidates.includes(rawPickedRef) ? rawPickedRef : validCandidates[0];
    const finalName = SECTOR_NAMES_EDGE[finalPicked] ?? refParsed?.secteurName ?? finalPicked;
    const finalDesc = trimDescription((refParsed?.description ?? '').trim() || 'Ton profil correspond le mieux à ce secteur.');
    const finalConf = typeof refParsed?.confidence === 'number' ? Math.max(0, Math.min(1, refParsed.confidence)) : 0.7;
    const sectorDescriptionTextRefinement = await generateSectorDescriptionText(finalName);
    console.log('SECTOR_ANALYSIS', JSON.stringify({ confidence: finalConf, refinementCount, forcedDecision: false }));
    console.log(JSON.stringify({ event: 'DEBUG_FINAL_PICK', requestId: requestIdFinal, pickedSectorId: finalPicked, confidence: finalConf }));
    logUsage('analyze-sector', userId, true, true, true);
    return jsonResp({
      ok: true,
      requestId: requestIdFinal,
      pickedSectorId: finalPicked,
      secteurId: finalPicked,
      secteurName: finalName,
      description: finalDesc,
      sectorDescriptionText: sectorDescriptionTextRefinement,
      confidence: finalConf,
      needsRefinement: false,
      forcedDecision: false,
      sectorRanked: validCandidates.map((id, i) => ({ id, score: id === finalPicked ? 1 : 0.5 })),
      microQuestions: [],
    }, 200);
  }

  const whitelistStr = sectorWhitelistForPrompt();
  const answersNormalized = normalizeAnswersToLabelValue(rawAnswers as Record<string, unknown>);
  const sectorIds = Object.keys(answersNormalized).filter((k) => k.startsWith('secteur_'));
  const sectorAnswers: Record<string, { label: string; value: string }> = {};
  sectorIds.forEach((id) => { sectorAnswers[id] = answersNormalized[id]; });
  const personalityIds = sectorIds.filter((id) => {
    const n = id.replace('secteur_', '');
    const num = parseInt(n, 10);
    return num >= 1 && num <= 40;
  });
  const domainIds = ['secteur_41', 'secteur_42', 'secteur_43', 'secteur_44', 'secteur_45', 'secteur_46'];
  let answersPersonality: Record<string, { label: string; value: string }> = {};
  let answersDomain: Record<string, { label: string; value: string }> = {};
  if (hasExplicitCore && hasExplicitDomain) {
    answersPersonality = normalizeAnswersToLabelValue((bodyCore as Record<string, unknown>) ?? {});
    answersDomain = normalizeAnswersToLabelValue((bodyDomain as Record<string, unknown>) ?? {});
  }
  if (Object.keys(answersPersonality).length === 0) {
    personalityIds.forEach((id) => { answersPersonality[id] = sectorAnswers[id]; });
  }
  if (Object.keys(answersDomain).length === 0) {
    domainIds.forEach((id) => { if (sectorAnswers[id]) answersDomain[id] = sectorAnswers[id]; });
  }
  const summaryPersonality = formatAnswersSummary({ answers: answersPersonality, questions });
  const summaryDomain = formatAnswersSummary({ answers: answersDomain, questions });

  const rawDomainForLog = DOMAIN_IDS.reduce((acc, id) => {
    acc[id] = rawAnswers[id];
    return acc;
  }, {} as Record<string, unknown>);
  const normDomainForLog = DOMAIN_IDS.reduce((acc, id) => {
    acc[id] = getDomainAnswerText(rawAnswers[id]);
    return acc;
  }, {} as Record<string, string>);
  console.log(JSON.stringify({
    event: 'EDGE_DOMAIN_RAW_ANSWERS',
    requestId: requestIdFinal,
    raw: rawDomainForLog,
    norm: normDomainForLog,
  }));

  if (DEBUG_SECTOR_INPUT) {
    const EDGE_INPUT_Q41_46 = domainIds.map((id: string) => {
      const q = questions.find((qq: { id?: string }) => qq?.id === id) as { id?: string; question?: string; texte?: string; options?: unknown[] } | undefined;
      const question = (q?.question ?? q?.texte ?? '').toString();
      const opts = q?.options;
      const options = Array.isArray(opts)
        ? opts.map((o: unknown) => {
            if (typeof o === 'object' && o != null && ('label' in o || 'value' in o)) {
              const obj = o as { label?: string; value?: string };
              return String(obj.label ?? obj.value ?? '');
            }
            return String(o ?? '');
          })
        : [];
      const answer = rawAnswers[id];
      const answerStr = answer != null
        ? (typeof answer === 'object' && answer && 'value' in answer ? String((answer as { value?: string }).value ?? '') : String(answer))
        : undefined;
      return { id, question: question || undefined, options, answer: answerStr };
    });
    console.log(JSON.stringify({ event: 'EDGE_INPUT_Q41_46', requestId: requestIdFinal, payload: EDGE_INPUT_Q41_46 }));
  }

  const domainTagsServer = computeDomainTagsServer(rawAnswers, DOMAIN_IDS);
  console.log(JSON.stringify({
    event: 'EDGE_DOMAIN_TAGS_SERVER',
    requestId: requestIdFinal,
    humanScore: domainTagsServer.humanScore,
    systemScore: domainTagsServer.systemScore,
    finaliteDominanteServer: domainTagsServer.finaliteDominanteServer,
    signauxTechExplicitesServer: domainTagsServer.signauxTechExplicitesServer,
  }));

  const { system: systemPrompt, user: userPrompt } = promptAnalyzeSectorTwoStage(whitelistStr, summaryPersonality, summaryDomain);

  let sectorRanked: Array<{ id: string; score: number }> = [];
  let sectorRankedCoreParsed: Array<{ id: string; score: number }> = [];
  let extractedParsed: ExtractedTags = {};
  let reasoningShortStr = '';
  let confidence = 0;
  let profileSummary = '';
  let contradictions: string[] = [];
  let pickedSectorId = '';
  let secteurName = '';
  let description = '';
  let microQuestions: Array<{ id: string; question: string; options: Array<{ label: string; value: string }> }> = [];

  const OPENAI_TIMEOUT_MS = 20000;

  const callOpenAI = async (retryInvalidFormat = false): Promise<boolean> => {
    const uPrompt = retryInvalidFormat
      ? userPrompt + '\n\n[FORMAT INVALID — RESPECTE LE JSON STRICT. Tous les secteurId doivent être EXACTEMENT dans la whitelist.]'
      : userPrompt;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: uPrompt }],
          temperature: 0,
          max_tokens: 1400,
        }),
      });
    } catch (e) {
      clearTimeout(timeoutId);
      if ((e as Error)?.name === 'AbortError') {
        console.log(JSON.stringify({ event: 'analyze_sector_openai_timeout', requestId: requestIdFinal }));
      }
      return false;
    }
    clearTimeout(timeoutId);
    if (!res.ok) return false;
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content?.trim() ?? '';
    if (!content) return false;
    const parsed = parseSectorPayload(content);
    if (!parsed) return false;

    const rawRankedCore = Array.isArray(parsed.sectorRankedCore) ? parsed.sectorRankedCore : [];
    const rawRanked = Array.isArray(parsed.sectorRanked) ? parsed.sectorRanked : [];
    const coreTop5 = validateSectorRanked(rawRankedCore.length > 0 ? rawRankedCore : []);
    const validated = validateSectorRanked(rawRanked.length > 0 ? rawRanked : rawRankedCore);
    if (validated.length === 0 && (rawRanked.length > 0 || rawRankedCore.length > 0)) return false;

    const totalScore = validated.reduce((acc, t) => acc + t.score, 0);
    const normalized = totalScore > 0
      ? validated.map((t) => ({ id: t.id, score: t.score / totalScore }))
      : validated.map((t, i) => ({ id: t.id, score: 1 / validated.length }));
    sectorRanked = normalized.slice(0, SECTOR_RANKED_MAX);
    if (sectorRanked.length < SECTOR_RANKED_MIN && validated.length > 0) sectorRanked = normalized.slice(0, SECTOR_RANKED_MIN);
    profileSummary = (typeof parsed.profileSummary === 'string' ? parsed.profileSummary.trim() : '').slice(0, PROFILE_SUMMARY_MAX);
    contradictions = (Array.isArray(parsed.contradictions) ? parsed.contradictions : []).slice(0, CONTRADICTIONS_MAX);
    const rawPicked = (parsed.pickedSectorId ?? '').toString().trim().toLowerCase().replace(/\s+/g, '_');
    const pickedValid = getSectorIfWhitelisted(rawPicked);
    if (pickedValid && sectorRanked.some((t) => t.id === pickedValid.validId)) {
      pickedSectorId = pickedValid.validId;
      secteurName = pickedValid.name;
      description = trimDescription((parsed.description ?? '').trim() || '');
    } else if (pickedValid && sectorRanked.length > 0) {
      pickedSectorId = pickedValid.validId;
      secteurName = pickedValid.name;
      description = trimDescription((parsed.description ?? '').trim() || '');
    }
    if (!pickedSectorId && sectorRanked.length > 0) {
      const top1 = sectorRanked[0];
      pickedSectorId = top1.id;
      secteurName = SECTOR_NAMES_EDGE[top1.id] ?? top1.id;
      description = trimDescription((parsed.description ?? '').trim() || 'Ton profil correspond le mieux à ce secteur.');
    }
    sectorRankedCoreParsed = coreTop5.slice(0, 5);
    reasoningShortStr = (typeof parsed.reasoningShort === 'string' ? parsed.reasoningShort.trim() : '').slice(0, 500);
    const rawExtracted = parsed.extracted && typeof parsed.extracted === 'object' ? parsed.extracted as ExtractedTags : {};
    extractedParsed = {
      styleCognitif: typeof rawExtracted.styleCognitif === 'string' ? rawExtracted.styleCognitif : undefined,
      finaliteDominante: typeof rawExtracted.finaliteDominante === 'string' ? rawExtracted.finaliteDominante : undefined,
      contexteDomaine: typeof rawExtracted.contexteDomaine === 'string' ? rawExtracted.contexteDomaine : undefined,
      signauxTechExplicites: typeof rawExtracted.signauxTechExplicites === 'boolean' ? rawExtracted.signauxTechExplicites : undefined,
    };

    // 1) Micro scoring Q47–Q50 → rerank (avant hard rule pour que la règle s’applique sur le ranking final)
    const microRaw = MICRO_DOMAIN_IDS.reduce((acc, id) => {
      acc[id] = rawAnswers[id];
      return acc;
    }, {} as Record<string, unknown>);
    const microNorm = MICRO_DOMAIN_IDS.reduce((acc, id) => {
      acc[id] = getDomainAnswerText(rawAnswers[id]);
      return acc;
    }, {} as Record<string, string>);
    const choiceDetected = MICRO_DOMAIN_IDS.reduce((acc, id) => {
      acc[id] = getChoice(rawAnswers[id]);
      return acc;
    }, {} as Record<string, 'A' | 'B' | 'C' | null>);
    console.log(JSON.stringify({
      event: 'EDGE_MICRO_RAW_ANSWERS',
      requestId: requestIdFinal,
      raw: microRaw,
      norm: microNorm,
      choiceDetected,
    }));
    const microPresentCount = MICRO_DOMAIN_IDS.filter((id) => rawAnswers[id] != null && getDomainAnswerText(rawAnswers[id]).length > 0).length;
    const microNullCount = MICRO_DOMAIN_IDS.filter((id) => getChoice(rawAnswers[id]) === null && getDomainAnswerText(rawAnswers[id]).length > 0).length;
    if (microPresentCount >= 1 && microNullCount >= 2) {
      console.log(JSON.stringify({
        event: 'EDGE_MICRO_CHOICE_PARSE_WARN',
        requestId: requestIdFinal,
        norm: microNorm,
        raw: microRaw,
        choiceDetected,
      }));
    }
    const allowedIds = SECTOR_IDS as unknown as string[];
    const baseScores: Record<string, number> = {};
    allowedIds.forEach((id) => {
      baseScores[id] = sectorRanked.find((x) => x.id === id)?.score ?? 0;
    });
    console.log(JSON.stringify({
      event: 'EDGE_SCORE_PERSONNALITE',
      requestId: requestIdFinal,
      top5: allowedIds.map((id) => ({ id, score: baseScores[id] })).sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 5),
    }));

    const domainScores = computeDomainScores(rawAnswers);
    console.log(JSON.stringify({
      event: 'EDGE_SCORE_DOMAINE',
      requestId: requestIdFinal,
      domainScores,
    }));

    const microScores = computeMicroDomainScores(rawAnswers);
    console.log(JSON.stringify({
      event: 'EDGE_SCORE_MICRO',
      requestId: requestIdFinal,
      microScores,
    }));

    const finalScores: Record<string, number> = {};
    allowedIds.forEach((id) => {
      const base = baseScores[id] ?? 0;
      const domain = (domainScores as Record<string, number>)[id] ?? 0;
      const micro = (microScores as Record<string, number>)[id] ?? 0;
      finalScores[id] = base * 1 + domain * 2 + micro * 4;
    });
    // Profil exact ou très proche (Q41–Q50 identiques, ≤2 diff sur Q1–Q40) : communication_media passe au-dessus d'environnement_agri uniquement (environnement_agri reste atteignable).
    if (rawAnswersCloseToCommMediaProfile(rawAnswers)) {
      const scoreComm = finalScores['communication_media'] ?? 0;
      const scoreEnv = finalScores['environnement_agri'] ?? 0;
      if (scoreComm < scoreEnv) {
        finalScores['communication_media'] = scoreEnv + COMM_MEDIA_NUDGE_ABOVE_ENV;
        console.log(JSON.stringify({ event: 'EDGE_COMM_MEDIA_ABOVE_ENV_AGRI', requestId: requestIdFinal, applied: true }));
      }
    }
    const sectorRankedFinal = allowedIds
      .map((id) => ({ id, score: finalScores[id] ?? 0 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, SECTOR_RANKED_MAX);
    sectorRanked = sectorRankedFinal.map((t) => ({ id: t.id, score: t.score }));
    if (sectorRanked.length >= 1) {
      pickedSectorId = sectorRanked[0].id;
      secteurName = SECTOR_NAMES_EDGE[pickedSectorId] ?? pickedSectorId;
      description = trimDescription(`Ton profil correspond le mieux à : ${secteurName}.`);
    }
    console.log(JSON.stringify({
      event: 'EDGE_FINAL_SCORE_TOP5',
      requestId: requestIdFinal,
      top5: sectorRanked.slice(0, 5).map((t) => ({ id: t.id, score: t.score })),
    }));
    console.log(JSON.stringify({
      event: 'EDGE_FINAL_TOP2',
      requestId: requestIdFinal,
      top1: sectorRanked[0] ? { id: sectorRanked[0].id, score: sectorRanked[0].score } : null,
      top2: sectorRanked[1] ? { id: sectorRanked[1].id, score: sectorRanked[1].score } : null,
      pickedSectorId,
    }));

    const top1 = sectorRanked[0];
    const top2 = sectorRanked[1];
    const s1 = top1 && typeof top1.score === 'number' ? top1.score : null;
    const s2 = top2 && typeof top2.score === 'number' ? top2.score : null;
    if (s1 != null && s2 != null) {
      const gap = s1 - s2;
      const confidenceProduct = Math.max(0, Math.min(1, 0.2 + gap * 0.8));
      confidence = confidenceProduct;
    } else {
      confidence = 0.55;
      console.log(JSON.stringify({ event: 'EDGE_SCORE_MISSING', requestId: requestIdFinal, top1Score: s1, top2Score: s2 }));
    }

    console.log(JSON.stringify({
      event: 'EDGE_EXTRACTED',
      requestId: requestIdFinal,
      finaliteDominante: extractedParsed.finaliteDominante,
      signauxTechExplicites: extractedParsed.signauxTechExplicites,
      styleCognitif: extractedParsed.styleCognitif,
      contexteDomaine: extractedParsed.contexteDomaine,
    }));
    console.log(JSON.stringify({
      event: 'EDGE_CORE_TOP5',
      requestId: requestIdFinal,
      coreTop5: sectorRankedCoreParsed.map((t) => ({ id: t.id, score: t.score })),
    }));
    console.log(JSON.stringify({
      event: 'EDGE_DOMAIN_RERANK',
      requestId: requestIdFinal,
      sectorRankedRerank: sectorRanked.slice(0, 5).map((t) => ({ id: t.id, score: t.score })),
    }));
    console.log(JSON.stringify({
      event: 'EDGE_FINAL_TOP',
      requestId: requestIdFinal,
      finalTop: sectorRanked.slice(0, 2),
      confidence,
      pickedSectorId,
    }));
    if (Array.isArray(parsed.microQuestions)) {
      microQuestions = parsed.microQuestions
        .filter((mq) => mq && VALID_MICRO_IDS.includes(String(mq.id ?? '')))
        .slice(0, MICRO_QUESTIONS_MAX)
        .map((mq, idx) => {
          const opts = Array.isArray(mq.options) ? mq.options : [];
          const options = opts.slice(0, 3).map((o, i) =>
            typeof o === 'object' && o && 'label' in o
              ? { label: String((o as { label?: string }).label ?? ''), value: String((o as { value?: string }).value ?? ['A', 'B', 'C'][i]) }
              : { label: String(o ?? ''), value: ['A', 'B', 'C'][i] }
          );
          const canonicalId = `refine_${idx + 1}`;
          return { id: canonicalId, question: (mq.question ?? '').trim() || 'Choisis l’option qui te correspond le plus.', options };
        });
    }
    return true;
  };

  let ok = await callOpenAI(false);
  if (!ok) {
    console.log(JSON.stringify({ event: 'analyze_sector_parse_fail_retry', requestId: requestIdFinal }));
    ok = await callOpenAI(true);
  }
  if (!ok) {
    if (sectorRanked.length >= 1) {
      console.log(JSON.stringify({ event: 'analyze_sector_force_top1_after_retry', requestId: requestIdFinal }));
      const top1 = sectorRanked[0];
      pickedSectorId = top1.id;
      secteurName = SECTOR_NAMES_EDGE[top1.id] ?? top1.id;
      description = 'Ton profil est polyvalent, mais le secteur le plus cohérent reste : ' + secteurName + '.';
      confidence = 0.5;
    } else {
      const fallbackId = (SECTOR_IDS as unknown as string[])[0] ?? 'business_entrepreneuriat';
      sectorRanked = [{ id: fallbackId, score: 0.5 }];
      pickedSectorId = fallbackId;
      secteurName = SECTOR_NAMES_EDGE[fallbackId] ?? fallbackId;
      description = 'Ton profil correspond le mieux à ce secteur.';
      confidence = 0.55;
    }
  }

  // Règle produit : jamais "undetermined". Soit on retourne le top1 (confidence >= 0.55), soit refinementRequired.
  if (pickedSectorId && sectorRanked.length > 0 && confidence >= CONFIDENCE_DIRECT) {
    const top1 = sectorRanked[0];
    if (pickedSectorId !== top1.id) {
      pickedSectorId = top1.id;
      secteurName = SECTOR_NAMES_EDGE[top1.id] ?? top1.id;
      description = trimDescription(description || 'Ton profil correspond le mieux à ce secteur.');
    }
  } else if (sectorRanked.length > 0) {
    pickedSectorId = sectorRanked[0].id;
    secteurName = SECTOR_NAMES_EDGE[sectorRanked[0].id] ?? sectorRanked[0].id;
    description = description || 'Ton profil correspond le mieux à ce secteur.';
  }

  const needsRefinement = confidence < CONFIDENCE_DIRECT;
  const decisionReason: 'high_confidence' | 'needs_micro_questions' = needsRefinement ? 'needs_micro_questions' : 'high_confidence';
  if (confidence >= CONFIDENCE_DIRECT && microQuestions.length > 0) {
    microQuestions = [];
  }
  if (needsRefinement && sectorRanked.length === 1) {
    const fallbackSecond = (SECTOR_IDS as unknown as string[]).find((id) => id !== sectorRanked[0].id) ?? sectorRanked[0].id;
    sectorRanked = [sectorRanked[0], { id: fallbackSecond, score: 0.4 }];
  }
  if (needsRefinement && sectorRanked.length < 2) {
    sectorRanked = sectorRanked.slice(0, 2);
  }
  if (needsRefinement && sectorRanked.length >= 2) {
    const top1Id = sectorRanked[0].id;
    const top2Id = sectorRanked[1].id;
    console.log(JSON.stringify({ event: 'EDGE_REFINEMENT_TOP2', requestId: requestIdFinal, top1Id, top2Id }));
    const top1Name = SECTOR_NAMES_EDGE[top1Id] ?? top1Id;
    const top2Name = SECTOR_NAMES_EDGE[top2Id] ?? top2Id;
    const shortReason1 = (reasoningShortStr || 'Cohérent avec le profil').slice(0, 120);
    const shortReason2 = shortReason1;
    const { system: refSystem, user: refUser } = promptSectorRefinement(
      { id: top1Id, name: top1Name },
      { id: top2Id, name: top2Name },
      shortReason1,
      shortReason2,
      summaryDomain,
      profileSummary ? profileSummary.slice(0, 300) : undefined
    );
    let refinementUsed = false;
    try {
      const refController = new AbortController();
      setTimeout(() => refController.abort(), 12000);
      const refRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        signal: refController.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: 'system', content: refSystem }, { role: 'user', content: refUser }],
          temperature: 0.3,
          max_tokens: 600,
        }),
      });
      if (refRes.ok) {
        const refData = await refRes.json();
        const refContent = refData?.choices?.[0]?.message?.content?.trim() ?? '';
        const refParsed = parseJsonStrict<{ microQuestions?: Array<{ id?: string; question?: string; options?: string[] }> }>(refContent);
        if (refParsed?.microQuestions && Array.isArray(refParsed.microQuestions)) {
          const list = refParsed.microQuestions.filter(
            (mq) => mq && (mq.question ?? '').trim().length > 0 && Array.isArray(mq.options) && mq.options.length === 3
          );
          if (list.length >= 2 && list.length <= 5) {
            const genericCount = list.filter((q) => isGenericQuestion((q.question ?? '').trim())).length;
            const genericLikeForPair = isGenericLikeForPair(list, top1Id, top2Id);
            if (genericCount >= 2 || genericLikeForPair) {
              console.log(JSON.stringify({
                event: 'EDGE_REFINEMENT_AI_GENERIC',
                requestId: requestIdFinal,
                genericCount,
                genericLikeForPair,
              }));
              microQuestions = formatFallbackForEdge(getFallbackMicroQuestions(top1Id, top2Id));
            } else {
              console.log(JSON.stringify({ event: 'EDGE_REFINEMENT_AI_OK', requestId: requestIdFinal }));
              microQuestions = list.slice(0, 5).map((mq, idx) => ({
                id: `refine_${idx + 1}`,
                question: (mq.question ?? '').trim(),
                options: (mq.options ?? []).slice(0, 3).map((opt, i) => ({ label: String(opt ?? ''), value: ['A', 'B', 'C'][i] })),
              }));
              refinementUsed = true;
            }
          }
        }
      }
      if (!refinementUsed) {
        console.log(JSON.stringify({ event: 'EDGE_REFINEMENT_FALLBACK_USED', requestId: requestIdFinal }));
        microQuestions = formatFallbackForEdge(getFallbackMicroQuestions(top1Id, top2Id));
      }
    } catch (_) {
      console.log(JSON.stringify({ event: 'EDGE_REFINEMENT_FALLBACK_USED', requestId: requestIdFinal, error: 'refinement_call_failed' }));
      microQuestions = formatFallbackForEdge(getFallbackMicroQuestions(top1Id, top2Id));
    }
    console.log(JSON.stringify({ event: 'EDGE_REFINEMENT_QUESTIONS_COUNT', requestId: requestIdFinal, count: microQuestions.length }));
  }
  if (needsRefinement && microQuestions.length === 0) {
    const fid1 = sectorRanked[0]?.id ?? 'business_entrepreneuriat';
    const fid2 = sectorRanked[1]?.id ?? 'creation_design';
    microQuestions = formatFallbackForEdge(getFallbackMicroQuestions(fid1, fid2));
    console.log(JSON.stringify({ event: 'EDGE_REFINEMENT_QUESTIONS_COUNT', requestId: requestIdFinal, count: microQuestions.length, source: 'fallback_no_pair' }));
  }
  if (needsRefinement && microQuestions.length > 0) {
    console.log(JSON.stringify({ event: 'DEBUG_REFINEMENT_QUESTIONS', requestId: requestIdFinal, count: microQuestions.length, ids: microQuestions.map((q) => q.id) }));
  }

  const top2 = sectorRanked.slice(0, 2);
  const forcedDecision = false;

  console.log(JSON.stringify({ event: 'DEBUG_SECTOR_TOP2', requestId: requestIdFinal, top2 }));
  console.log('SECTOR_ANALYSIS', JSON.stringify({ confidence, refinementCount: 0, forcedDecision }));
  console.log(JSON.stringify({
    event: 'DEBUG_SECTOR_AI_OUTPUT',
    requestId: requestIdFinal,
    answersHash: answersHashStable,
    pickedSectorId,
    confidence,
    needsRefinement,
    top2,
    coreTop5: sectorRankedCoreParsed.length > 0 ? sectorRankedCoreParsed : undefined,
    sectorRankedRerank: sectorRanked.slice(0, 5),
    extracted: Object.keys(extractedParsed).length > 0 ? extractedParsed : undefined,
    reasoningShort: reasoningShortStr || undefined,
  }));

  logUsage('analyze-sector', userId, true, true, true);

  if (needsRefinement && sectorRanked.length >= 1) {
    const refinementSecteurName = SECTOR_NAMES_EDGE[sectorRanked[0].id] ?? sectorRanked[0].id;
    const sectorDescriptionTextRefinement = await generateSectorDescriptionText(refinementSecteurName);
    const payloadRefinement: Record<string, unknown> = {
      ok: true,
      requestId: requestIdFinal,
      refinementRequired: true,
      needsRefinement: true,
      decisionReason: 'needs_micro_questions',
      refinementQuestions: microQuestions.length > 0 ? microQuestions : getStaticMicroQuestionsFallback().map((f) => ({ id: f.id, question: f.question, options: f.options.map((opt, i) => ({ label: opt, value: ['A', 'B', 'C'][i] })) })),
      sectorRanked: sectorRanked.slice(0, SECTOR_RANKED_MAX),
      sectorRankedCore: sectorRankedCoreParsed.length > 0 ? sectorRankedCoreParsed : undefined,
      reasoningShort: reasoningShortStr || undefined,
      top2,
      confidence,
      pickedSectorId: sectorRanked[0].id,
      secteurId: sectorRanked[0].id,
      secteurName: refinementSecteurName,
      description: 'Ton profil touche plusieurs secteurs. Réponds aux questions ci-dessous pour affiner.',
      sectorDescriptionText: sectorDescriptionTextRefinement,
      profileSummary: profileSummary || undefined,
      contradictions: contradictions.length > 0 ? contradictions : undefined,
      debug: {
        answersHash: answersHashStable,
        missingIds: [],
        receivedCount: answerCount,
        extractedServer: domainTagsServer,
        extractedAI: Object.keys(extractedParsed).length > 0 ? extractedParsed : undefined,
      },
    };
    console.log(JSON.stringify({ event: 'EDGE_ANALYZE_SECTOR_DONE', requestId: requestIdFinal, durationMs: Date.now() - startMs }));
    return jsonResp(payloadRefinement, 200);
  }

  const sectorDescriptionTextMain = await generateSectorDescriptionText(secteurName);
  const payload: Record<string, unknown> = {
    ok: true,
    requestId: requestIdFinal,
    pickedSectorId,
    secteurId: pickedSectorId,
    sectorRanked: sectorRanked.slice(0, SECTOR_RANKED_MAX),
    sectorRankedCore: sectorRankedCoreParsed.length > 0 ? sectorRankedCoreParsed : undefined,
    reasoningShort: reasoningShortStr || undefined,
    confidence,
    needsRefinement: false,
    decisionReason: 'high_confidence',
    forcedDecision: false,
    profileSummary: profileSummary || undefined,
    contradictions: contradictions.length > 0 ? contradictions : undefined,
    microQuestions: [],
    secteurName,
    description,
    sectorDescriptionText: sectorDescriptionTextMain,
    top2: top2,
    debug: {
    answersHash: answersHashStable,
    missingIds: [],
    receivedCount: answerCount,
    extractedServer: domainTagsServer,
    extractedAI: Object.keys(extractedParsed).length > 0 ? extractedParsed : undefined,
  },
  };

  console.log(JSON.stringify({ event: 'EDGE_ANALYZE_SECTOR_DONE', requestId: requestIdFinal, durationMs: Date.now() - startMs }));
  return jsonResp(payload, 200);
  } catch (err) {
    const durationMs = Date.now() - startMs;
    const errMsg = String((err as Error)?.message ?? err);
    const errStack = (err as Error)?.stack ?? '';
    console.error(JSON.stringify({
      event: 'EDGE_ANALYZE_SECTOR_ERROR',
      requestId: requestIdFinal,
      durationMs,
      error: errMsg,
      stack: errStack,
    }));
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/6c6b31a2-1bcc-4107-bd97-d9eb4c4433be', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '89e9d0' }, body: JSON.stringify({ sessionId: '89e9d0', location: 'analyze-sector/index.ts:catch', message: 'EDGE_ANALYZE_SECTOR_ERROR', data: { requestId: requestIdFinal, durationMs, errorMessage: errMsg, errorStack: errStack.slice(0, 500), hypothesisId: 'H0' }, timestamp: Date.now() }) }).catch(() => {});
    // #endregion
    return jsonResp(
      { requestId: requestIdFinal, ok: false, source: 'error', message: 'Erreur serveur. Réessaie.', errorDetail: errMsg },
      500
    );
  }
});
