/**
 * Edge Function : génération d'un module Feed (mini_simulation_metier | apprentissage_mindset | test_secteur).
 * Remplace les appels directs à OpenAI côté client.
 *
 * Entrée : { moduleType, sectorId, metierId?, level? }
 * Sortie : module au format Feed { id, type, titre, objectif, durée_estimée, items, feedback_final, secteur, métier }
 * Ou : { source: "disabled"|"invalid"|"error", error?: string }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getAIGuardrailsEnv, getUserIdFromRequest, checkQuota, incrementUsage, logUsage } from '../_shared/aiGuardrails.ts';
import { getPromptsForFeedModule, type FeedModuleType } from '../_shared/promptsFeedModule.ts';
import { getSectorWithFallback, getJobIfWhitelisted } from '../_shared/validation.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json200 = (body: object) =>
  new Response(JSON.stringify(body), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const SUBJECTIVE_PATTERNS = /\b(tu\s+pr[eé]f[eè]res?|que\s+fais[- ]tu|comment\s+r[eé]agirais[- ]tu|selon\s+toi|tu\s+aimes?|que\s+ferais[- ]tu|ton\s+avis|comment\s+te\s+comport|dans\s+ta\s+personnalit[eé])\b/i;
const NON_UNIQUE_PATTERNS = /\b(ca\s+depend|ça\s+dépend|souvent|parfois|en\s+g[eé]n[eé]ral)\b/i;

function validateTestSecteurFactual(items: Array<{ question?: string; explication?: string }>): { valid: boolean; reason: string } {
  for (let i = 0; i < items.length; i++) {
    const q = String(items[i]?.question ?? '').toLowerCase();
    const exp = String(items[i]?.explication ?? '').toLowerCase();
    if (SUBJECTIVE_PATTERNS.test(q)) {
      return { valid: false, reason: `item_${i}_subjective: "${q.slice(0, 80)}"` };
    }
    if (NON_UNIQUE_PATTERNS.test(exp)) {
      return { valid: false, reason: `item_${i}_non_unique: "${exp.slice(0, 80)}"` };
    }
  }
  return { valid: true, reason: 'ok' };
}

function validateItems(raw: unknown, moduleType: string): Array<{ type: string; question: string; options: string[]; reponse_correcte: number; explication?: string }> {
  const maxOpts = moduleType === 'test_secteur' ? 4 : 3;
  const arr = Array.isArray(raw) ? raw : [];
  return arr.map((item: any) => {
    const opts = Array.isArray(item?.options) ? item.options : [];
    const options = opts.slice(0, maxOpts).map((o: any) => String(o ?? '').trim()).filter(Boolean);
    while (options.length < Math.min(maxOpts, 2)) options.push(`Option ${String.fromCharCode(65 + options.length)}`);
    if (options.length < maxOpts && maxOpts === 4) {
      while (options.length < 4) options.push(`Option ${String.fromCharCode(65 + options.length)}`);
    }
    let reponse = typeof item?.reponse_correcte === 'number' ? item.reponse_correcte : 0;
    if (reponse >= options.length) reponse = 0;
    return {
      type: item?.type ?? (moduleType === 'test_secteur' ? 'question_factuelle' : 'mini_cas'),
      question: String(item?.question ?? '').trim() || 'Question',
      options,
      reponse_correcte: reponse,
      explication: item?.explication ? String(item.explication).trim() : undefined,
    };
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  const AI_ENABLED = Deno.env.get('AI_ENABLED') !== 'false';
  if (!AI_ENABLED) {
    return json200({ source: 'disabled', error: 'IA désactivée' });
  }

  try {
    const body = (await req.json()) as {
      moduleType?: string;
      sectorId?: string;
      metierId?: string | null;
      metierKey?: string | null;
      metierTitle?: string | null;
      jobTitle?: string | null;
      activeMetierTitle?: string | null;
      level?: number;
    };

    const moduleTypeRaw = (body.moduleType ?? '').trim();
    const validTypes: FeedModuleType[] = ['mini_simulation_metier', 'apprentissage_mindset', 'test_secteur'];
    if (!validTypes.includes(moduleTypeRaw as FeedModuleType)) {
      return json200({ source: 'invalid', error: 'moduleType invalide' });
    }
    const moduleType = moduleTypeRaw as FeedModuleType;

    const sectorRaw = (body.sectorId ?? '').trim().toLowerCase().replace(/\s+/g, '_') || 'tech';
    const sector = getSectorWithFallback(sectorRaw);
    if (sectorRaw !== sector.validId) {
      console.log(JSON.stringify({ event: 'generate_feed_sector_fallback', sectorIdReceived: sectorRaw, sectorIdUsed: sector.validId }));
    }
    const sectorId = sector.validId;

    // mini_simulation_metier : accepter metierId / metierKey / metierTitle / jobTitle / activeMetierTitle (premier non vide)
    const rawMetier = [body.metierId, body.metierKey, body.metierTitle, body.jobTitle, body.activeMetierTitle]
      .find((v) => v != null && typeof v === 'string' && String(v).trim().length > 0) as string | undefined;
    const metier = rawMetier != null ? String(rawMetier).trim() : null;

    if (moduleType === 'mini_simulation_metier' && !metier) {
      console.log('[generate-feed-module] mini_simulation_metier sans metier', {
        received: {
          metierId: body.metierId ?? null,
          metierKey: body.metierKey ?? null,
          metierTitle: body.metierTitle ?? null,
          jobTitle: body.jobTitle ?? null,
          activeMetierTitle: body.activeMetierTitle ?? null,
        },
      });
      return json200({ source: 'invalid', error: 'metier requis pour mini_simulation_metier (metierId, metierKey, metierTitle, jobTitle ou activeMetierTitle)' });
    }

    // Optionnel : résolution whitelist pour libellé canonique (titre) ; le prompt utilise toujours metier
    let metierResolvedId: string | null = null;
    if (metier) {
      const m = getJobIfWhitelisted(metier);
      if (m) metierResolvedId = m.validId;
      console.log('[generate-feed-module] mini_simulation_metier metier', {
        metier: metier.slice(0, 40),
        resolvedId: metierResolvedId ?? null,
      });
    }

    const level = typeof body.level === 'number' && body.level >= 1 ? body.level : 1;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { aiEnabled, maxPerUser, maxGlobal } = getAIGuardrailsEnv();
    const userId = getUserIdFromRequest(req);

    if (!aiEnabled || !OPENAI_API_KEY) {
      logUsage('generate-feed-module', userId, aiEnabled, false, false);
      return json200({ source: 'disabled', error: 'OPENAI_API_KEY non configurée' });
    }

    const quota = await checkQuota(supabase, userId, maxPerUser, maxGlobal);
    if (!quota.allowed) {
      logUsage('generate-feed-module', userId, true, false, false);
      return json200({ source: 'disabled', error: 'Quota dépassé' });
    }
    await incrementUsage(supabase, userId);

    let parsed: Record<string, unknown> | null = null;
    let validatedItems: Array<{ type: string; question: string; options: string[]; reponse_correcte: number; explication?: string }> = [];
    const maxRetries = moduleType === 'test_secteur' ? 2 : 0;
    let retryCount = 0;
    let aiTestValid = true;
    let aiTestReason = 'ok';

    retryLoop: while (retryCount <= maxRetries) {
      const { systemPrompt, userPrompt } = getPromptsForFeedModule(moduleType, sectorId, metier);
      const userMsg = retryCount > 0 ? userPrompt + ` Regénère en factuel strict (tentative ${retryCount + 1}).` : userPrompt;

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
            { role: 'user', content: userMsg },
          ],
          temperature: 0.7,
          max_tokens: 4000,
          response_format: { type: 'json_object' },
        }),
      });

      if (!openaiRes.ok) {
        const errText = await openaiRes.text();
        console.error('[generate-feed-module] OpenAI error:', openaiRes.status, errText);
        return json200({ source: 'error', error: 'Erreur génération IA' });
      }

      const openaiJson = await openaiRes.json();
      const content = openaiJson?.choices?.[0]?.message?.content;
      if (!content) {
        return json200({ source: 'error', error: 'Réponse OpenAI vide' });
      }

      try {
        parsed = JSON.parse(content) as Record<string, unknown>;
      } catch {
        return json200({ source: 'error', error: 'Réponse JSON invalide' });
      }

      validatedItems = validateItems(parsed?.items ?? [], moduleType);

      if (moduleType === 'test_secteur') {
        const factualCheck = validateTestSecteurFactual(validatedItems);
        aiTestValid = factualCheck.valid;
        aiTestReason = factualCheck.reason;
        console.log(`[AI_TEST] generated_valid=${aiTestValid} reason=${aiTestReason}`);
        if (!aiTestValid && retryCount < maxRetries) {
          retryCount++;
          continue retryLoop;
        }
      }

      break retryLoop;
    }

    if (!parsed) {
      return json200({ source: 'error', error: 'Aucune réponse valide' });
    }

    const moduleResult = {
      id: `way_${moduleType.slice(0, 3)}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      type: moduleType,
      titre: parsed.titre ?? (moduleType === 'mini_simulation_metier' ? `Mini-Simulations : ${metier}` : moduleType === 'apprentissage_mindset' ? 'Apprentissage & Mindset' : `Test de Secteur : ${sectorId}`),
      objectif: parsed.objectif ?? 'Découvre si ce métier/secteur te correspond',
      durée_estimée: typeof parsed.durée_estimée === 'number' ? parsed.durée_estimée : 4,
      items: validatedItems,
      feedback_final: parsed.feedback_final ?? { message: 'Bravo !', recompense: { xp: 50, etoiles: 2 } },
      secteur: sectorId,
      métier: metier ?? undefined,
      metierKey: metierResolvedId ?? metier ?? undefined,
      généré_par: 'way',
      créé_le: new Date().toISOString(),
    };

    return json200(moduleResult);
  } catch (err) {
    console.error('[generate-feed-module] Error:', err);
    return json200({ source: 'error', error: String(err?.message ?? 'Erreur inconnue') });
  }
});
