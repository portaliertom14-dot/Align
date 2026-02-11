/**
 * Edge Function : analyse métier à partir des réponses du quiz métier
 *
 * Entrée : { answers_job: Record<string, string>, questions?: Array<{ id, question, options }> }
 * Sortie STRICTE : { jobId: string, jobName: string, description: string }
 * - description : 2–3 phrases, max 240 caractères
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getAIGuardrailsEnv, getUserIdFromRequest, checkQuota, incrementUsage, logUsage } from '../_shared/aiGuardrails.ts';
import { JOB_IDS, JOB_NAMES, promptAnalyzeJob } from '../_shared/prompts.ts';
import { getJobIfWhitelisted, trimDescription } from '../_shared/validation.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

interface AnswerValue {
  label?: string;
  value?: string;
}

interface RequestBody {
  answers_job: Record<string, string | AnswerValue>;
  questions?: Array<{ id: string; question: string; options: Array<{ label: string; value: string }> }>;
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
    const answersJob = body.answers_job;
    const questions = body.questions ?? [];

    if (!answersJob || typeof answersJob !== 'object' || Object.keys(answersJob).length === 0) {
      return new Response(
        JSON.stringify({ error: 'answers_job requis (objet non vide)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { aiEnabled, maxPerUser, maxGlobal } = getAIGuardrailsEnv();
    const userId = getUserIdFromRequest(req);
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    if (!aiEnabled || !OPENAI_API_KEY) {
      logUsage('analyze-job', userId, aiEnabled, false, false);
      return json200({ source: 'disabled' });
    }
    const quota = await checkQuota(supabase, userId, maxPerUser, maxGlobal);
    if (!quota.allowed) {
      logUsage('analyze-job', userId, true, false, false);
      return json200({ source: 'disabled' });
    }
    await incrementUsage(supabase, userId);

    const summaryLines = Object.entries(answersJob).slice(0, 50).map(([qId, choice]) => {
      const q = questions.find((qu: { id: string }) => qu.id === qId);
      const label = typeof choice === 'object' && choice !== null && 'label' in choice ? String((choice as AnswerValue).label ?? '') : String(choice ?? '');
      const value = typeof choice === 'object' && choice !== null && 'value' in choice ? String((choice as AnswerValue).value ?? '') : '';
      const choiceStr = value ? `${label} (choix: ${value})` : label;
      return `- ${q?.question ?? qId}: ${choiceStr}`;
    });
    const summary = summaryLines.join('\n');

    const jobList = JOB_IDS.map((id) => `${id} (${JOB_NAMES[id] ?? id})`).join(', ');
    const { system: systemPrompt, user: userPrompt } = promptAnalyzeJob(jobList, summary);

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
      logUsage('analyze-job', userId, true, true, false);
      return json200({ source: 'error' });
    }

    const openaiData = await openaiRes.json();
    const content = openaiData?.choices?.[0]?.message?.content?.trim() ?? '';
    if (!content) {
      logUsage('analyze-job', userId, true, true, false);
      return json200({ source: 'invalid' });
    }

    const jsonStr = content.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
    let parsed: { jobId?: string; jobName?: string; description?: string };
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      logUsage('analyze-job', userId, true, true, false);
      return json200({ source: 'invalid' });
    }

    const job = getJobIfWhitelisted(parsed.jobId ?? '');
    if (!job) {
      logUsage('analyze-job', userId, true, true, false);
      return json200({ source: 'invalid' });
    }
    const rawDesc = parsed.description && String(parsed.description).trim() ? String(parsed.description).trim() : 'Ce métier correspond à ton profil.';
    const description = trimDescription(rawDesc);

    logUsage('analyze-job', userId, true, true, true);

    return json200({
      source: 'ok',
      jobId: job.validId,
      jobName: job.name,
      description,
    });
  } catch (error) {
    console.error('analyze-job error:', error);
    return json200({ source: 'error' });
  }
});
