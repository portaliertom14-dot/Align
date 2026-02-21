/**
 * Edge Function : génération des modules dynamiques (10 chapitres × 2 modules × 12 questions).
 * Generate once, reuse forever — cache content_cache.
 *
 * Entrée : { traceId?, sectorId, jobTitle?, jobKey?, jobId? (legacy), version?, contentVersion?, personaCluster?, language? }
 * Résolution : jobTitle/jobKey (ou jobId legacy) → titre canonique whitelist (par secteur). Le métier utilisé est toujours le titre canon.
 * Sortie : { traceId, ok: boolean, error?: {code,message}, data?: {...}, durationMs }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  getAIGuardrailsEnv,
  getUserIdFromRequest,
  checkQuota,
  incrementUsage,
  logUsage,
} from '../_shared/aiGuardrails.ts';
import { promptGenerateDynamicModules } from '../_shared/prompts.ts';
import { getSectorWithFallback } from '../_shared/validation.ts';
import {
  validateDynamicModulesPayload,
  type DynamicModulesPayload,
} from '../_shared/dynamicModulesValidation.ts';
import {
  resolveJobForSector,
  getWhitelistSample,
} from '../_shared/jobsBySectorTitles.ts';
import { normalizeJobKey } from '../_shared/normalizeJobKey.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const OPENAI_TIMEOUT_MS = 55000;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  const startMs = Date.now();
  let traceId = `fn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const AI_ENABLED = Deno.env.get('AI_ENABLED') !== 'false';
  if (!AI_ENABLED) {
    console.log(JSON.stringify({ event: 'generate_dynamic_disabled', requestId: traceId, AI_ENABLED: false }));
    return jsonResponse({ ok: false, error: 'AI_DISABLED', requestId: traceId, traceId, durationMs: Date.now() - startMs }, 503);
  }

  try {
    const rawBody = await req.json();
    const parsed = rawBody as Record<string, unknown>;
    const body = (parsed && typeof parsed.body === 'object' && parsed.body !== null) ? (parsed.body as Record<string, unknown>) : parsed;
    const clientRequestId = typeof body.requestId === 'string' ? body.requestId.trim() : typeof body.traceId === 'string' ? body.traceId.trim() : '';
    if (clientRequestId) traceId = clientRequestId;

    const sectorIdRaw = typeof body.sectorId === 'string' ? body.sectorId.trim() : '';
    const jobTitleRaw = typeof body.jobTitle === 'string' ? body.jobTitle.trim() : '';
    const jobKeyRaw = typeof body.jobKey === 'string' ? body.jobKey.trim() : '';
    const jobIdLegacy = typeof body.jobId === 'string' ? body.jobId.trim() : '';

    const receivedJobTitle = jobTitleRaw || jobIdLegacy || '';
    const receivedJobKey = jobKeyRaw || (jobIdLegacy ? normalizeJobKey(jobIdLegacy) : '');

    console.log('generate_dynamic_start', { sectorId: sectorIdRaw, jobTitle: receivedJobTitle || undefined, jobKey: receivedJobKey || undefined, traceId });

    if (!sectorIdRaw) {
      return jsonResponse({
        ok: false,
        error: 'SECTOR_MISSING',
        message: 'sectorId requis',
        received: body.sectorId,
        requestId: traceId,
      }, 400);
    }
    if (!receivedJobTitle && !receivedJobKey) {
      return jsonResponse({
        ok: false,
        error: 'JOB_MISSING',
        message: 'jobTitle ou jobKey requis',
        received: { jobTitle: body.jobTitle, jobKey: body.jobKey, jobId: body.jobId },
        requestId: traceId,
      }, 400);
    }

    const payloadKeys = Object.keys(body);
    const payloadSizeBytes = new TextEncoder().encode(JSON.stringify(body)).length;
    const userId = getUserIdFromRequest(req);

    console.log('[AI_DYNAMIC_FN] IN', {
      traceId,
      userId: userId ? userId.substring(0, 8) : null,
      payloadKeys,
      payloadSizeBytes,
    });

    const personaClusterRaw = typeof body.personaCluster === 'string' ? body.personaCluster.trim() : '';
    const personaCluster = personaClusterRaw ? personaClusterRaw.slice(0, 8) : 'default';
    const contentVersion = typeof body.contentVersion === 'string' ? body.contentVersion.trim() : (typeof body.version === 'string' ? body.version.trim() : '') || 'v1';
    const language = (typeof body.language === 'string' ? body.language.trim() : 'fr') || 'fr';

    const sector = getSectorWithFallback(sectorIdRaw);
    const resolved = resolveJobForSector(sector.validId, receivedJobTitle || undefined, receivedJobKey || undefined);
    if (!resolved) {
      const normalizedJobTitle = normalizeJobKey(receivedJobTitle || receivedJobKey);
      const whitelistSample = getWhitelistSample(sector.validId, 5);
      console.log(JSON.stringify({
        event: 'generate_dynamic_job_invalid',
        requestId: traceId,
        sectorId: sector.validId,
        receivedJobTitle: receivedJobTitle || null,
        receivedJobKey: receivedJobKey || null,
        normalizedJobTitle: normalizedJobTitle || null,
        whitelistSample,
      }));
      return jsonResponse({
        ok: false,
        error: 'JOB_INVALID',
        message: 'métier non reconnu pour la préparation',
        receivedJobTitle: receivedJobTitle || null,
        receivedJobKey: receivedJobKey || null,
        normalizedJobTitle: normalizedJobTitle || null,
        sectorId: sector.validId,
        whitelistSample,
        requestId: traceId,
      }, 400);
    }
    if (sectorIdRaw !== sector.validId) {
      console.log(JSON.stringify({ event: 'generate_dynamic_sector_fallback', requestId: traceId, sectorIdReceived: sectorIdRaw, sectorIdUsed: sector.validId }));
    }

    if (!OPENAI_API_KEY || OPENAI_API_KEY.trim() === '') {
      return jsonResponse({ ok: false, error: 'missing_api_key', message: 'Clé API manquante', requestId: traceId, durationMs: Date.now() - startMs }, 500);
    }

    const { validId: sectorId, name: sectorLabel } = sector;
    const jobId = resolved.canonicalTitle;
    const jobLabel = resolved.canonicalTitle;
    const cacheKey = `dynamic_modules:${sectorId}:${jobId}:${contentVersion}:${language}:${personaCluster}`;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: row, error: selectError } = await supabase
      .from('content_cache')
      .select('json')
      .eq('key', cacheKey)
      .maybeSingle();

    if (selectError) {
      console.error('[AI_DYNAMIC_FN] content_cache select error:', selectError);
      return jsonResponse({ ok: false, error: 'db_error', message: 'Erreur cache', requestId: traceId, durationMs: Date.now() - startMs }, 500);
    }

    if (row?.json) {
      const cached = row.json as DynamicModulesPayload;
      const data = {
        source: 'ok',
        sectorId: cached.sectorId ?? sectorId,
        jobId: cached.jobId ?? jobId,
        personaCluster: cached.personaCluster ?? personaCluster,
        contentVersion: cached.contentVersion ?? contentVersion,
        language: cached.language ?? language,
        chapters: cached.chapters ?? [],
      };
      return jsonResponse({ requestId: traceId, traceId, ok: true, data, durationMs: Date.now() - startMs });
    }

    const { aiEnabled, maxPerUser, maxGlobal } = getAIGuardrailsEnv();
    if (!aiEnabled) {
      logUsage('generate-dynamic-modules', userId, aiEnabled, false, false);
      console.log(JSON.stringify({ event: 'generate_dynamic_disabled', requestId: traceId, AI_ENABLED: false }));
      return jsonResponse({ ok: false, error: 'AI_DISABLED', requestId: traceId, durationMs: Date.now() - startMs }, 503);
    }

    const quota = await checkQuota(supabase, userId, maxPerUser, maxGlobal);
    if (!quota.allowed) {
      logUsage('generate-dynamic-modules', userId, true, false, false);
      console.log(JSON.stringify({ event: 'generate_dynamic_quota', requestId: traceId }));
      return jsonResponse({ ok: false, error: 'QUOTA_EXCEEDED', requestId: traceId, traceId, durationMs: Date.now() - startMs }, 429);
    }
    await incrementUsage(supabase, userId);

    const { system: systemPrompt, user: userPrompt } = promptGenerateDynamicModules(
      sectorLabel,
      jobLabel
    );
    const promptTokensEstimate = Math.ceil((systemPrompt.length + userPrompt.length) / 4);

    const openaiStart = Date.now();
    console.log(JSON.stringify({ event: 'generate_dynamic_openai_before', requestId: traceId, model: 'gpt-4o-mini', promptTokensEstimate }));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

    let openaiRes: Response;
    try {
      openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.4,
          max_tokens: 16000,
        }),
      });
    } catch (openaiErr: unknown) {
      clearTimeout(timeoutId);
      const err = openaiErr as Error;
      const isTimeout = err?.name === 'AbortError' || err?.message?.includes?.('aborted');
      console.log(JSON.stringify({ event: 'generate_dynamic_openai_error', requestId: traceId, openaiCalled: true, latencyMs: Date.now() - openaiStart, isTimeout }));
      console.error('[AI_DYNAMIC_FN] OPENAI_ERR', { traceId, name: err?.name, message: err?.message, status: isTimeout ? 504 : 500 });
      logUsage('generate-dynamic-modules', userId, true, true, false);
      return jsonResponse(
        {
          ok: false,
          error: isTimeout ? 'timeout' : 'openai_error',
          message: isTimeout ? 'Requête OpenAI expirée' : (err?.message ?? 'Erreur OpenAI'),
          requestId: traceId,
          durationMs: Date.now() - startMs,
        },
        isTimeout ? 504 : 500
      );
    }
    clearTimeout(timeoutId);

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error('[AI_DYNAMIC_FN] OPENAI_ERR', {
        traceId,
        status: openaiRes.status,
        message: errText?.slice(0, 200),
      });
      logUsage('generate-dynamic-modules', userId, true, true, false);
      console.log(JSON.stringify({ event: 'generate_dynamic_openai_http_error', requestId: traceId, openaiCalled: true, latencyMs: Date.now() - openaiStart, status: openaiRes.status }));
      if (Date.now() - startMs >= OPENAI_TIMEOUT_MS - 5000) {
      return jsonResponse(
        { ok: false, error: 'timeout', message: 'Requête expirée', requestId: traceId, durationMs: Date.now() - startMs },
        504
      );
      }
      return jsonResponse({ ok: false, error: 'openai_api_error', message: `OpenAI API: ${openaiRes.status}`, requestId: traceId, durationMs: Date.now() - startMs }, 500);
    }

    const openaiLatencyMs = Date.now() - openaiStart;
    console.log(JSON.stringify({ event: 'generate_dynamic_openai_ok', requestId: traceId, openaiCalled: true, latencyMs: openaiLatencyMs }));

    const openaiData = await openaiRes.json();
    const content = openaiData?.choices?.[0]?.message?.content?.trim() ?? '';
    if (!content) {
      logUsage('generate-dynamic-modules', userId, true, true, false);
      console.log(JSON.stringify({ event: 'generate_dynamic_openai_empty', requestId: traceId, openaiCalled: true, latencyMs: Date.now() - openaiStart }));
      return jsonResponse({ ok: false, error: 'empty_response', message: 'Réponse OpenAI vide', requestId: traceId, durationMs: Date.now() - startMs }, 500);
    }

    const jsonStr = content.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
    let openaiParsed: { chapters?: unknown };
    try {
      openaiParsed = JSON.parse(jsonStr);
    } catch {
      logUsage('generate-dynamic-modules', userId, true, true, false);
      return jsonResponse({ ok: false, error: 'invalid_json', message: 'JSON invalide', requestId: traceId, durationMs: Date.now() - startMs }, 500);
    }

    const fullPayload: DynamicModulesPayload = {
      sectorId,
      jobId,
      personaCluster,
      contentVersion,
      language,
      chapters: Array.isArray(openaiParsed.chapters) ? openaiParsed.chapters : [],
    };
    const validated = validateDynamicModulesPayload(fullPayload);
    if (!validated) {
      logUsage('generate-dynamic-modules', userId, true, true, false);
      return jsonResponse({ ok: false, error: 'validation_failed', message: 'Payload invalide', requestId: traceId, durationMs: Date.now() - startMs }, 500);
    }

    logUsage('generate-dynamic-modules', userId, true, true, true);

    const { error: insertError } = await supabase
      .from('content_cache')
      .upsert({ key: cacheKey, version: contentVersion, json: validated }, { onConflict: 'key' });

    if (insertError) {
      console.error('[AI_DYNAMIC_FN] content_cache insert error:', insertError);
      return jsonResponse({ ok: false, error: 'db_insert_error', message: 'Erreur cache', requestId: traceId, durationMs: Date.now() - startMs }, 500);
    }

    const data = {
      source: 'ok',
      sectorId: validated.sectorId,
      jobId: validated.jobId,
      personaCluster: validated.personaCluster,
      contentVersion: validated.contentVersion,
      language: validated.language,
      chapters: validated.chapters,
    };
    return jsonResponse({ requestId: traceId, traceId, ok: true, data, durationMs: Date.now() - startMs });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[AI_DYNAMIC_FN] UNHANDLED', { traceId, name: err?.name, message: err?.message });
    const durationMs = Date.now() - startMs;
    return jsonResponse(
      { ok: false, error: 'internal_error', message: err?.message ?? 'Erreur interne', requestId: traceId, durationMs },
      500
    );
  }
});
