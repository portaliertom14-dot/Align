/**
 * Edge Function : 5 questions personnalisées pour régénération métier.
 * Entrée : sectorId, variant, rawAnswers30, previousTopJobs.
 * Sortie : { questions: [ { id, title, choices: { A, B, C } }, ... ] } (5 questions).
 * Chaque choix A/B/C = texte court. C peut être "Les deux" / "Ça dépend".
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getAIGuardrailsEnv, getUserIdFromRequest, checkQuota, incrementUsage, logUsage } from '../_shared/aiGuardrails.ts';
import { getSectorIfWhitelisted } from '../_shared/validation.ts';
import { getJobTitlesForSector } from '../_shared/jobsBySectorTitles.ts';
import { parseJsonStrict } from '../_shared/parseJsonStrict.ts';
import { SECTOR_NAMES } from '../_shared/sectors.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const MODEL = 'gpt-4o-mini';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function corsOptions(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

function jsonResp(body: object, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

interface QuestionItem {
  id: string;
  title: string;
  choices: { A: string; B: string; C: string };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return corsOptions();

  let body: { sectorId?: string; variant?: string; rawAnswers30?: Record<string, unknown>; previousTopJobs?: { title?: string; score?: number }[] };
  try {
    body = await req.json();
  } catch {
    return jsonResp({ error: 'Body JSON invalide' }, 400);
  }

  const sectorIdRaw = (body.sectorId ?? '').trim();
  const sector = getSectorIfWhitelisted(sectorIdRaw);
  if (!sector) {
    console.error('[REFINE_JOB_Q] FAIL', { sectorId: sectorIdRaw, reason: 'secteur invalide' });
    return jsonResp({ error: 'Secteur invalide' }, 400);
  }
  const sectorId = sector.validId;
  const sectorName = SECTOR_NAMES[sectorId] ?? sectorId;
  const jobTitles = getJobTitlesForSector(sectorId);
  const previousTop = (body.previousTopJobs ?? []).slice(0, 3).map((j) => j?.title ?? '').filter(Boolean);
  const rawAnswers30 = (body.rawAnswers30 && typeof body.rawAnswers30 === 'object') ? body.rawAnswers30 : {};

  const answersSummary = Object.entries(rawAnswers30)
    .filter(([k]) => k.startsWith('metier_'))
    .map(([k, v]) => {
      const val = (v as { value?: string })?.value;
      return `${k}=${val ?? '?'}`;
    })
    .join(', ');

  const userId = getUserIdFromRequest(req);
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { aiEnabled, maxPerUser, maxGlobal } = getAIGuardrailsEnv();
  if (aiEnabled && OPENAI_API_KEY) {
    const quota = await checkQuota(supabase, userId, maxPerUser, maxGlobal);
    if (!quota.allowed) {
      logUsage('refine-job-questions', userId, true, false, false);
      return jsonResp({ error: 'Quota dépassé' }, 429);
    }
    await incrementUsage(supabase, userId);
  }

  if (!OPENAI_API_KEY) {
    return jsonResp({ error: 'OpenAI non configuré' }, 503);
  }

  const prompt = `Tu génères exactement 5 questions à choix multiples pour affiner le métier d'un utilisateur dans le secteur "${sectorName}".

Métiers du secteur (exemples): ${jobTitles.slice(0, 15).join(', ')}.
Réponses quiz métier déjà données (metier_1..30): ${answersSummary || 'aucune'}.
Métier actuellement proposé (à affiner): ${previousTop[0] || 'non défini'}.

Règles:
- Chaque question a 3 choix: A, B, C. C peut être "Les deux" ou "Ça dépend" pour éviter de forcer.
- Questions courtes, concrètes (rythme, équipe, oral/écrit, impact, processus...).
- IDs: refine_regen_1 à refine_regen_5.
- Réponds UNIQUEMENT en JSON valide, sans markdown, avec cette structure exacte:
{
  "questions": [
    { "id": "refine_regen_1", "title": "Tu préfères...", "choices": { "A": "...", "B": "...", "C": "..." } },
    ... (5 éléments)
  ]
}`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 1200,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('[REFINE_JOB_Q] FAIL', { sectorId, status: res.status, err: errText });
    return jsonResp({ error: 'Génération questions indisponible' }, 502);
  }

  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    console.error('[REFINE_JOB_Q] FAIL', { sectorId, reason: 'invalid content' });
    return jsonResp({ error: 'Réponse OpenAI invalide' }, 502);
  }

  const parsed = parseJsonStrict<{ questions?: QuestionItem[] }>(content);
  const list = parsed?.questions;
  if (!Array.isArray(list) || list.length < 5) {
    console.error('[REFINE_JOB_Q] FAIL', { sectorId, reason: 'format questions invalide', count: list?.length });
    return jsonResp({ error: 'Format questions invalide' }, 502);
  }

  const normalized = list.slice(0, 5).map((q, i) => ({
    id: (q?.id && typeof q.id === 'string') ? q.id : `refine_regen_${i + 1}`,
    title: typeof q?.title === 'string' ? q.title : `Question ${i + 1}`,
    choices: {
      A: typeof (q?.choices as any)?.A === 'string' ? (q.choices as any).A : '',
      B: typeof (q?.choices as any)?.B === 'string' ? (q.choices as any).B : '',
      C: typeof (q?.choices as any)?.C === 'string' ? (q.choices as any).C : '',
    },
  }));

  console.log('[REFINE_JOB_Q] OK', { sectorId });
  return jsonResp({ ok: true, questions: normalized }, 200);
});
