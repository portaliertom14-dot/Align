/**
 * Edge Function : analyse métier — V3 Hybride Premium.
 * Entrée : lockedSectorId + answers (metier_1..20). candidateJobIds = jobs du secteur (whitelist).
 * IA seule : choix 1 job dans la liste fermée + confidence. Pas de 12+8 ni scoring déterministe.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getAIGuardrailsEnv, getUserIdFromRequest, checkQuota, incrementUsage, logUsage } from '../_shared/aiGuardrails.ts';
import { JOB_NAMES, promptAnalyzeJobHybrid } from '../_shared/prompts.ts';
import { trimDescription, getSectorIfWhitelisted, getJobIfWhitelisted } from '../_shared/validation.ts';
import { getCandidateJobIdsForSector } from '../_shared/clusters.ts';
import { formatAnswersSummary, normalizeAnswersToLabelValue } from '../_shared/formatAnswersSummary.ts';
import { parseJsonStrict } from '../_shared/parseJsonStrict.ts';
import { validateWhitelist } from '../_shared/validation.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const PROMPT_VERSION = 'v3-hybrid-job';
const MODEL = 'gpt-4o-mini';
const REASON_SHORT_MAX = 140;
const CONFIDENCE_JOB_THRESHOLD = 0.55;
const MIN_CANDIDATES = 3;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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

interface JobRankedItem {
  jobId?: string;
  id?: string;
  score?: number;
  reason?: string;
}

interface AIJobPayload {
  jobRanked?: JobRankedItem[];
  confidence?: number;
  pickedJobId?: string;
  jobName?: string;
  reasonShort?: string;
  description?: string;
}

function parseJobPayload(content: string): AIJobPayload | null {
  return parseJsonStrict<AIJobPayload>(content);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200, headers: corsHeaders });

  let body: any;
  const fallbackRequestId = `svr-job-${Date.now()}`;
  try {
    body = await req.json();
  } catch {
    return jsonResp({ requestId: fallbackRequestId, source: 'invalid_payload', message: 'Body JSON invalide' }, 400);
  }

  const { requestId: rid, answersHash, answers, questions: qList, lockedSectorId: lockedSectorIdRaw } = body;
  const requestIdFinal = typeof rid === 'string' && rid.trim() ? rid.trim() : fallbackRequestId;
  const questions = Array.isArray(qList) ? qList : [];
  const rawAnswers = (body.answers ?? body.answers_job ?? {}) as Record<string, string>;
  const answerCount = Object.keys(rawAnswers).length;
  const userId = getUserIdFromRequest(req);
  const answersHashStable = answersHash ?? stableAnswersHash(rawAnswers);

  const lockedSector = typeof lockedSectorIdRaw === 'string' && lockedSectorIdRaw.trim()
    ? getSectorIfWhitelisted(lockedSectorIdRaw.trim())
    : null;
  const lockedSectorId = lockedSector?.validId ?? null;

  console.log(JSON.stringify({
    event: 'DEBUG_JOB_CANDIDATES',
    requestId: requestIdFinal,
    sectorId: lockedSectorId,
    candidateJobIds: lockedSectorId ? getCandidateJobIdsForSector(lockedSectorId) : [],
  }));

  if (!lockedSectorId) {
    logUsage('analyze-job', userId, true, true, false);
    return jsonResp({
      ok: true,
      requestId: requestIdFinal,
      pickedJobId: 'undetermined',
      jobRanked: [],
      confidence: 0,
      reasonShort: 'Secteur non verrouillé ou invalide. Complète d\'abord le quiz secteur.',
      description: 'Complète le quiz secteur pour verrouiller un secteur, puis refais le quiz métier.',
      debug: { answersHash: answersHashStable },
    }, 200);
  }

  const candidateJobIds = getCandidateJobIdsForSector(lockedSectorId);
  if (candidateJobIds.length < MIN_CANDIDATES) {
    console.log(JSON.stringify({
      event: 'DEBUG_JOB_CANDIDATES',
      requestId: requestIdFinal,
      sectorId: lockedSectorId,
      candidateJobIds,
      reason: 'pas_assez_de_metiers_configures',
    }));
    logUsage('analyze-job', userId, true, true, false);
    return jsonResp({
      ok: true,
      requestId: requestIdFinal,
      pickedJobId: 'undetermined',
      jobRanked: [],
      confidence: 0,
      reasonShort: 'Pas assez de métiers configurés dans ce secteur.',
      description: 'Pas assez de métiers configurés dans ce secteur.',
      debug: { answersHash: answersHashStable },
    }, 200);
  }

  if (!rawAnswers || answerCount === 0) {
    return jsonResp({ requestId: requestIdFinal, source: 'invalid_payload', message: 'answers requis (metier_1..20)' }, 400);
  }

  const AI_ENABLED = Deno.env.get('AI_ENABLED') !== 'false';
  if (!AI_ENABLED) {
    return jsonResp({ requestId: requestIdFinal, source: 'disabled', message: 'IA désactivée' }, 503);
  }

  const { aiEnabled, maxPerUser, maxGlobal } = getAIGuardrailsEnv();
  if (!aiEnabled || !OPENAI_API_KEY) {
    logUsage('analyze-job', userId, aiEnabled, false, false);
    return jsonResp({ requestId: requestIdFinal, source: 'disabled', message: 'IA non disponible' }, 503);
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const quota = await checkQuota(supabase, userId, maxPerUser, maxGlobal);
  if (!quota.allowed) {
    logUsage('analyze-job', userId, true, false, false);
    return jsonResp({ requestId: requestIdFinal, source: 'quota', message: 'Quota dépassé' }, 429);
  }
  await incrementUsage(supabase, userId);

  const candidateListStr = candidateJobIds
    .map((id) => `- ${id} → ${JOB_NAMES[id] ?? id}`)
    .join('\n');
  const jobAnswersNormalized = normalizeAnswersToLabelValue(rawAnswers as Record<string, unknown>);
  const metierIds = Object.keys(jobAnswersNormalized).filter((k) => k.startsWith('metier_'));
  const metierAnswers: Record<string, { label: string; value: string }> = {};
  metierIds.forEach((id) => { metierAnswers[id] = jobAnswersNormalized[id]; });
  const answersSummary = formatAnswersSummary({ answers: metierAnswers, questions });
  const { system: systemPrompt, user: userPrompt } = promptAnalyzeJobHybrid(candidateListStr, answersSummary, lockedSectorId);

  let parsed: AIJobPayload | null = null;
  const callOpenAI = async (retryInvalidFormat = false): Promise<boolean> => {
    const uPrompt = retryInvalidFormat
      ? userPrompt + '\n\n[FORMAT INVALID — RESPECTE LE JSON STRICT. pickedJobId doit être EXACTEMENT un jobId de la liste fournie.]'
      : userPrompt;
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: uPrompt }],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content?.trim() ?? '';
    if (!content) return false;
    parsed = parseJobPayload(content);
    return parsed !== null;
  };

  let ok = await callOpenAI(false);
  if (!ok) ok = await callOpenAI(true);
  if (!ok || !parsed) {
    logUsage('analyze-job', userId, true, true, false);
    return jsonResp({
      ok: true,
      requestId: requestIdFinal,
      pickedJobId: 'undetermined',
      jobRanked: [],
      confidence: 0,
      reasonShort: 'Réponse IA invalide. Tu peux réessayer le quiz métier.',
      description: 'Une erreur est survenue. Réessaie en complétant à nouveau le quiz métier.',
      debug: { answersHash: answersHashStable },
    }, 200);
  }

  const confidence = typeof parsed.confidence === 'number' ? Math.max(0, Math.min(1, parsed.confidence)) : 0;
  const rawPicked = (parsed.pickedJobId ?? '').toString().trim().toLowerCase().replace(/\s+/g, '_');
  const jobValid = getJobIfWhitelisted(rawPicked);
  const jobInList = jobValid && candidateJobIds.includes(jobValid.validId);

  if (!jobInList && jobValid) {
    // Retry 1 fois si hors liste
    ok = await callOpenAI(true);
    if (ok && parsed) {
      const raw2 = (parsed.pickedJobId ?? '').toString().trim().toLowerCase().replace(/\s+/g, '_');
      const job2 = getJobIfWhitelisted(raw2);
      if (job2 && candidateJobIds.includes(job2.validId)) {
        parsed.pickedJobId = job2.validId;
      }
    }
  }

  const jobRankedRaw = Array.isArray(parsed.jobRanked) ? parsed.jobRanked : [];
  const jobRanked = jobRankedRaw
    .slice(0, 3)
    .map((t) => {
      const id = (t.jobId ?? t.id ?? '').toString().trim().toLowerCase().replace(/\s+/g, '_');
      const score = typeof t.score === 'number' ? Math.max(0, Math.min(1, t.score)) : 0;
      return { id: validateWhitelist(id, candidateJobIds) ? id : null, score };
    })
    .filter((t): t is { id: string; score: number } => t.id !== null);

  console.log(JSON.stringify({
    event: 'DEBUG_JOB_AI_OUTPUT',
    requestId: requestIdFinal,
    answersHash: answersHashStable,
    pickedJobId: parsed.pickedJobId,
    confidence,
    top3: jobRanked,
  }));

  const finalJob = getJobIfWhitelisted((parsed.pickedJobId ?? '').toString().trim().toLowerCase().replace(/\s+/g, '_'));
  const finalJobInList = finalJob && candidateJobIds.includes(finalJob.validId);
  const useJob = confidence > CONFIDENCE_JOB_THRESHOLD && finalJobInList;

  if (!useJob) {
    logUsage('analyze-job', userId, true, true, false);
    return jsonResp({
      ok: true,
      requestId: requestIdFinal,
      pickedJobId: 'undetermined',
      jobRanked: jobRanked.length > 0 ? jobRanked : undefined,
      confidence,
      reasonShort: confidence <= CONFIDENCE_JOB_THRESHOLD
        ? 'Explorer les alternatives proposées.'
        : 'Réponse IA hors liste. Tu peux réessayer le quiz métier.',
      description: 'Ton profil correspond à plusieurs métiers. Explore les alternatives ci-dessous.',
      debug: { answersHash: answersHashStable },
    }, 200);
  }

  let reasonShort = (parsed.reasonShort ?? '').trim();
  if (reasonShort.length > REASON_SHORT_MAX) reasonShort = reasonShort.slice(0, REASON_SHORT_MAX - 1).trim() + '…';
  const description = trimDescription((parsed.description ?? '').trim() || reasonShort || 'Ce métier correspond à ton profil.');

  logUsage('analyze-job', userId, true, true, true);

  return jsonResp({
    ok: true,
    requestId: requestIdFinal,
    pickedJobId: finalJob!.validId,
    jobId: finalJob!.validId,
    jobRanked: jobRanked.length > 0 ? jobRanked : undefined,
    confidence,
    reasonShort,
    description,
    jobName: finalJob!.name,
    sectorIdLocked: lockedSectorId,
    debug: { answersHash: answersHashStable },
  }, 200);
});
