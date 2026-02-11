/**
 * Edge Function : génération des modules dynamiques (10 chapitres × 2 modules × 12 questions).
 * Generate once, reuse forever — cache content_cache.
 *
 * Entrée : { sectorId, jobId, personaCluster?, contentVersion?, language? }
 * - personaCluster : identifiant profil (8 car. max), absent => "default". Inclus dans la cache key.
 * Sortie : { source, sectorId, jobId, personaCluster, contentVersion, language, chapters } ou { source: "disabled"|"invalid"|"error" }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getAIGuardrailsEnv, getUserIdFromRequest, checkQuota, incrementUsage, logUsage } from '../_shared/aiGuardrails.ts';
import { promptGenerateDynamicModules } from '../_shared/prompts.ts';
import { getSectorIfWhitelisted, getJobIfWhitelisted } from '../_shared/validation.ts';
import { validateDynamicModulesPayload, type DynamicModulesPayload } from '../_shared/dynamicModulesValidation.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json200 = (body: object) =>
  new Response(JSON.stringify(body), { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  // Guard IA : aucun appel OpenAI si AI_ENABLED === "false" (string truthy en JS)
  const AI_ENABLED = Deno.env.get('AI_ENABLED') !== 'false';
  if (!AI_ENABLED) {
    return json200({ source: 'disabled' });
  }

  try {
    const body = (await req.json()) as {
      userId?: string;
      sectorId?: string;
      jobId?: string;
      personaCluster?: string;
      contentVersion?: string;
      language?: string;
    };
    const sectorIdRaw = typeof body.sectorId === 'string' ? body.sectorId.trim() : '';
    const jobIdRaw = typeof body.jobId === 'string' ? body.jobId.trim() : '';
    const personaClusterRaw = typeof body.personaCluster === 'string' ? body.personaCluster.trim() : '';
    const personaCluster = personaClusterRaw ? personaClusterRaw.slice(0, 8) : 'default';
    const contentVersion = typeof body.contentVersion === 'string' ? body.contentVersion.trim() : 'v1';
    const language = (typeof body.language === 'string' ? body.language.trim() : 'fr') || 'fr';

    if (!sectorIdRaw || !jobIdRaw) {
      return new Response(
        JSON.stringify({ error: 'sectorId et jobId requis' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const sector = getSectorIfWhitelisted(sectorIdRaw);
    const job = getJobIfWhitelisted(jobIdRaw);
    if (!sector || !job) {
      return json200({ source: 'invalid' });
    }

    const { validId: sectorId, name: sectorLabel } = sector;
    const { validId: jobId, name: jobLabel } = job;
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
      console.error('content_cache select error:', selectError);
      return json200({ source: 'error' });
    }

    if (row?.json) {
      const cached = row.json as DynamicModulesPayload;
      return json200({
        source: 'ok',
        sectorId: cached.sectorId ?? sectorId,
        jobId: cached.jobId ?? jobId,
        personaCluster: cached.personaCluster ?? personaCluster,
        contentVersion: cached.contentVersion ?? contentVersion,
        language: cached.language ?? language,
        chapters: cached.chapters ?? [],
      });
    }

    const { aiEnabled, maxPerUser, maxGlobal } = getAIGuardrailsEnv();
    const userId = getUserIdFromRequest(req);
    if (!aiEnabled || !OPENAI_API_KEY) {
      logUsage('generate-dynamic-modules', userId, aiEnabled, false, false);
      return json200({ source: 'disabled' });
    }
    const quota = await checkQuota(supabase, userId, maxPerUser, maxGlobal);
    if (!quota.allowed) {
      logUsage('generate-dynamic-modules', userId, true, false, false);
      return json200({ source: 'disabled' });
    }
    await incrementUsage(supabase, userId);

    const { system: systemPrompt, user: userPrompt } = promptGenerateDynamicModules(
      sectorLabel,
      jobLabel
    );

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
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

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error('OpenAI error:', openaiRes.status, errText);
      logUsage('generate-dynamic-modules', userId, true, true, false);
      return json200({ source: 'error' });
    }

    const openaiData = await openaiRes.json();
    const content = openaiData?.choices?.[0]?.message?.content?.trim() ?? '';
    if (!content) {
      logUsage('generate-dynamic-modules', userId, true, true, false);
      return json200({ source: 'invalid' });
    }

    const jsonStr = content.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
    let parsed: { chapters?: unknown };
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      logUsage('generate-dynamic-modules', userId, true, true, false);
      return json200({ source: 'invalid' });
    }

    const fullPayload: DynamicModulesPayload = {
      sectorId,
      jobId,
      personaCluster,
      contentVersion,
      language,
      chapters: Array.isArray(parsed.chapters) ? parsed.chapters : [],
    };
    const validated = validateDynamicModulesPayload(fullPayload);
    if (!validated) {
      logUsage('generate-dynamic-modules', userId, true, true, false);
      return json200({ source: 'invalid' });
    }

    logUsage('generate-dynamic-modules', userId, true, true, true);

    const { error: insertError } = await supabase
      .from('content_cache')
      .upsert(
        { key: cacheKey, version: contentVersion, json: validated },
        { onConflict: 'key' }
      );

    if (insertError) {
      console.error('content_cache insert error:', insertError);
      return json200({ source: 'error' });
    }

    return json200({ source: 'ok', ...validated });
  } catch (error) {
    console.error('generate-dynamic-modules error:', error);
    return json200({ source: 'error' });
  }
});
