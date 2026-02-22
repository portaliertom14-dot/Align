/**
 * Edge Function : pick top3 métiers pour régénération (excluant l'ancien top1).
 * Entrée : sectorId, variant, rawAnswers30, refineAnswers5, excludeJobTitles (string[]).
 * Sortie : { topJobs: [ { title, score }, ... ] }. Tous les titres DOIVENT être dans la whitelist du secteur.
 * Si un titre retourné par l'IA est hors whitelist => 400 + log.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getAIGuardrailsEnv, getUserIdFromRequest, checkQuota, incrementUsage, logUsage } from '../_shared/aiGuardrails.ts';
import { getSectorIfWhitelisted } from '../_shared/validation.ts';
import { getJobTitlesForSector, resolveJobForSector } from '../_shared/jobsBySectorTitles.ts';
import { normalizeJobKey } from '../_shared/normalizeJobKey.ts';
import { parseJsonStrict } from '../_shared/parseJsonStrict.ts';

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

function buildWhitelistSet(titles: string[]): Map<string, string> {
  const keyToCanonical = new Map<string, string>();
  for (const t of titles) {
    const key = normalizeJobKey(t ?? '');
    if (key && !keyToCanonical.has(key)) keyToCanonical.set(key, t.trim());
  }
  return keyToCanonical;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return corsOptions();

  let body: {
    sectorId?: string;
    variant?: string;
    rawAnswers30?: Record<string, { value?: string }>;
    refineAnswers5?: Record<string, string>;
    excludeJobTitles?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return jsonResp({ error: 'Body JSON invalide' }, 400);
  }

  const sectorIdRaw = (body.sectorId ?? '').trim();
  const sector = getSectorIfWhitelisted(sectorIdRaw);
  if (!sector) return jsonResp({ error: 'Secteur invalide' }, 400);
  const sectorId = sector.validId;

  const allTitles = getJobTitlesForSector(sectorId);
  const excludeSet = new Set(
    (body.excludeJobTitles ?? [])
      .filter((t): t is string => typeof t === 'string' && t.trim() !== '')
      .map((t) => normalizeJobKey(t))
  );
  const allowedTitles = allTitles.filter((t) => !excludeSet.has(normalizeJobKey(t)));
  if (allowedTitles.length < 3) {
    return jsonResp({ error: 'Pas assez de métiers après exclusion' }, 400);
  }

  const keyToCanonical = buildWhitelistSet(allowedTitles);
  const rawAnswers30 = (body.rawAnswers30 && typeof body.rawAnswers30 === 'object') ? body.rawAnswers30 : {};
  const refineAnswers5 = (body.refineAnswers5 && typeof body.refineAnswers5 === 'object') ? body.refineAnswers5 : {};
  const answersStr = Object.entries({ ...rawAnswers30, ...refineAnswers5 })
    .filter(([, v]) => (typeof v === 'string' && (v === 'A' || v === 'B' || v === 'C')) || (v && (v as { value?: string }).value))
    .map(([k, v]) => `${k}=${typeof v === 'string' ? v : (v as { value?: string }).value ?? '?'}`)
    .join(', ');

  const userId = getUserIdFromRequest(req);
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { aiEnabled, maxPerUser, maxGlobal } = getAIGuardrailsEnv();
  if (aiEnabled && OPENAI_API_KEY) {
    const quota = await checkQuota(supabase, userId, maxPerUser, maxGlobal);
    if (!quota.allowed) {
      logUsage('refine-job-pick', userId, true, false, false);
      return jsonResp({ error: 'Quota dépassé' }, 429);
    }
    await incrementUsage(supabase, userId);
  }

  if (!OPENAI_API_KEY) return jsonResp({ error: 'OpenAI non configuré' }, 503);

  const whitelistStr = allowedTitles.map((t, i) => `${i + 1}. ${t}`).join('\n');
  const whitelistSample = allowedTitles.slice(0, 10);
  const prompt = `Tu choisis les 3 métiers les plus adaptés au profil, UNIQUEMENT parmi cette liste (titres exacts obligatoires):
${whitelistStr}

Réponses du quiz (metier_1..30 + questions d'affinage): ${answersStr}

Réponds en JSON valide uniquement, sans markdown:
{
  "ranked": [
    { "title": "<titre exact de la liste>", "score": <0-1>, "reason": "<phrase courte>" },
    { "title": "<titre exact>", "score": <0-1>, "reason": "<phrase courte>" },
    { "title": "<titre exact>", "score": <0-1>, "reason": "<phrase courte>" }
  ]
}`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.35,
      max_tokens: 400,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('[REFINE_JOB_PICK] FAIL', { sectorId, status: res.status, err: errText });
    return jsonResp({ error: 'Sélection indisponible' }, 502);
  }

  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    console.error('[REFINE_JOB_PICK] FAIL', { sectorId, reason: 'invalid content' });
    return jsonResp({ error: 'Réponse OpenAI invalide' }, 502);
  }

  const parsed = parseJsonStrict<{ ranked?: { title?: string; score?: number; reason?: string }[] }>(content);
  const rawList = parsed?.ranked ?? parsed?.topJobs;
  if (!Array.isArray(rawList) || rawList.length === 0) {
    console.error('[REFINE_JOB_PICK] FAIL', { sectorId, reason: 'format ranked invalide' });
    return jsonResp({ error: 'Format ranked invalide' }, 502);
  }

  const ranked: { title: string; score: number; reason?: string }[] = [];
  for (const r of rawList.slice(0, 3)) {
    const rawTitle = (r?.title ?? '').trim();
    if (!rawTitle) continue;
    let canonical = keyToCanonical.get(normalizeJobKey(rawTitle));
    if (!canonical) {
      const resolved = resolveJobForSector(sectorId, rawTitle);
      if (resolved) canonical = keyToCanonical.get(normalizeJobKey(resolved.canonicalTitle)) ?? undefined;
    }
    if (!canonical) {
      console.error('[REFINE_JOB_PICK] FAIL', { sectorId, jobTitle: rawTitle, whitelistSample });
      return jsonResp({
        error: 'Un métier retourné est hors whitelist',
        debug: { receivedTitle: rawTitle, sectorId },
        whitelistSample,
      }, 400);
    }
    ranked.push({
      title: canonical,
      score: typeof r?.score === 'number' ? r.score : 0.9,
      reason: typeof (r as any)?.reason === 'string' ? (r as any).reason : undefined,
    });
  }

  if (ranked.length === 0) return jsonResp({ error: 'Aucun métier valide retourné' }, 502);
  return jsonResp({ ok: true, ranked }, 200);
});
