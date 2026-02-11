/**
 * Edge Function : analyse secteur à partir des réponses du quiz
 *
 * Entrée : { answers: Record<string, string>, questions: Array<{ id, question, options }> }
 * Sortie STRICTE : { secteurId: string, secteurName: string, description: string }
 * - description : 2–3 phrases, max 240 caractères
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getAIGuardrailsEnv, getUserIdFromRequest, checkQuota, incrementUsage, logUsage } from '../_shared/aiGuardrails.ts';
import { SECTOR_IDS, SECTOR_NAMES, promptAnalyzeSector } from '../_shared/prompts.ts';
import { getSectorIfWhitelisted, trimDescription } from '../_shared/validation.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

interface RequestBody {
  answers: Record<string, string>;
  questions?: Array< { id: string; question: string; options: string[] } >;
}

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const json200 = (body: object) =>
    new Response(JSON.stringify(body), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  // Guard IA : aucun appel OpenAI si AI_ENABLED === "false" (string truthy en JS)
  const AI_ENABLED = Deno.env.get('AI_ENABLED') !== 'false';
  if (!AI_ENABLED) {
    return json200({ source: 'disabled' });
  }

  try {
    const body: RequestBody = await req.json();
    const { answers } = body;
    const questions = body.questions ?? [];

    if (!answers || typeof answers !== 'object' || Object.keys(answers).length === 0) {
      return new Response(
        JSON.stringify({ error: 'answers requis (objet non vide)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { aiEnabled, maxPerUser, maxGlobal } = getAIGuardrailsEnv();
    const userId = getUserIdFromRequest(req);
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    if (!aiEnabled || !OPENAI_API_KEY) {
      logUsage('analyze-sector', userId, aiEnabled, false, false);
      return json200({ source: 'disabled' });
    }
    const quota = await checkQuota(supabase, userId, maxPerUser, maxGlobal);
    if (!quota.allowed) {
      logUsage('analyze-sector', userId, true, false, false);
      return json200({ source: 'disabled' });
    }
    await incrementUsage(supabase, userId);

    // Construire un résumé des réponses pour le prompt (question -> réponse choisie)
    // answers[questionId] = texte de l'option sélectionnée
    const summaryLines = Object.entries(answers).slice(0, 50).map(([qId, choice]) => {
      const q = questions.find((qu: { id: string }) => qu.id === qId);
      return `- ${q?.question ?? qId}: ${choice}`;
    });
    const summary = summaryLines.join('\n');

    const sectorList = SECTOR_IDS.map((id) => `${id} (${SECTOR_NAMES[id] ?? id})`).join(', ');
    const { system: systemPrompt, user: userPrompt } = promptAnalyzeSector(sectorList, summary);

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
        temperature: 0.3,
        max_tokens: 400,
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error('OpenAI error:', openaiRes.status, errText);
      logUsage('analyze-sector', userId, true, true, false);
      return json200({ source: 'error' });
    }

    const openaiData = await openaiRes.json();
    const content = openaiData?.choices?.[0]?.message?.content?.trim() ?? '';
    if (!content) {
      logUsage('analyze-sector', userId, true, true, false);
      return json200({ source: 'invalid' });
    }

    // Parser le JSON (enlever éventuels backticks markdown)
    const jsonStr = content.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
    let parsed: { secteurId?: string; secteurName?: string; description?: string };
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      logUsage('analyze-sector', userId, true, true, false);
      return json200({ source: 'invalid' });
    }

    const sector = getSectorIfWhitelisted(parsed.secteurId ?? '');
    if (!sector) {
      logUsage('analyze-sector', userId, true, true, false);
      return json200({ source: 'invalid' });
    }
    const rawDesc = parsed.description && String(parsed.description).trim() ? String(parsed.description).trim() : 'Ton profil correspond à ce secteur.';
    const description = trimDescription(rawDesc);

    logUsage('analyze-sector', userId, true, true, true);

    return json200({
      source: 'ok',
      secteurId: sector.validId,
      secteurName: sector.name,
      description,
    });
  } catch (error) {
    console.error('analyze-sector error:', error);
    return json200({ source: 'error' });
  }
});
