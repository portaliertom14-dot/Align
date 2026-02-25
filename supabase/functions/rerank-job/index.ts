/**
 * Edge Function : rerank-job — Hybride cosine + IA.
 * Input: sectorId, variant, whitelistTitles (30), rawAnswers30, sectorSummary?, top10Cosine, refinementAnswers?.
 * Output: { top3, needsRefinement, refinementQuestions?, top1Description? }.
 * Quand l’IA rerank est utilisée, on génère aussi la description du métier #1 (même moment) pour éviter un second appel.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getAIGuardrailsEnv, getUserIdFromRequest, checkQuota, incrementUsage, logUsage } from '../_shared/aiGuardrails.ts';
import { normalizeJobKey } from '../_shared/normalizeJobKey.ts';
import { parseJsonStrict } from '../_shared/parseJsonStrict.ts';
import { getSectorIfWhitelisted } from '../_shared/validation.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const MODEL = 'gpt-4o-mini';
const WHY_MAX = 140;
const REFINEMENT_QUESTIONS_MAX = 3;
const MAX_DESC_CHARS = 420;

const corsHeaders: Record<string, string> = {
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

interface RerankInput {
  sectorId?: string;
  variant?: string;
  whitelistTitles?: string[];
  rawAnswers30?: Record<string, { value?: string }>;
  sectorSummary?: string;
  top10Cosine?: { job: string; score: number }[];
  refinementAnswers?: Record<string, { value?: string }>;
}

interface RerankOutputItem {
  jobTitle: string;
  confidence: number;
  why?: string;
}

interface RerankOutput {
  top3: RerankOutputItem[];
  needsRefinement: boolean;
  refinementQuestions?: { id: string; question: string; options: { label: string; value: 'A' | 'B' | 'C' }[] }[];
}

function trimToCompletePhrase(s: string, maxLen: number): string {
  const t = (s ?? '').replace(/\s+/g, ' ').trim();
  if (!t.length || t.length <= maxLen) return t;
  const slice = t.slice(0, maxLen);
  const best = Math.max(slice.lastIndexOf('.'), slice.lastIndexOf('!'), slice.lastIndexOf('?'));
  if (best >= 0) return slice.slice(0, best + 1).trim();
  return slice.trim();
}

function descriptionBySentences(s: string): string {
  const t = (s ?? '').replace(/\s+/g, ' ').trim();
  if (!t.length) return '';
  const sentences = (t.match(/[^.!?]+[.!?]/g) ?? []).map((x) => x.trim()).filter(Boolean);
  if (sentences.length === 0) return trimToCompletePhrase(t, MAX_DESC_CHARS) || '';
  let result = '';
  for (const phrase of sentences) {
    const withSpace = result ? result + ' ' + phrase : phrase;
    if (withSpace.length <= MAX_DESC_CHARS) result = withSpace;
    else break;
  }
  return (result.trim() ? trimToCompletePhrase(result.trim(), MAX_DESC_CHARS) || result.trim() : result.trim()) || '';
}

function buildJobKey(sectorId: string, jobTitle: string): string {
  const key = normalizeJobKey(jobTitle ?? '');
  return key ? `${(sectorId ?? '').trim().toLowerCase()}:${key}` : '';
}

/** Génère la description du métier top1 via OpenAI et optionnellement met en cache (job_descriptions). */
async function generateTop1Description(
  jobTitle: string,
  sectorId: string,
  sectorSummary: string | null,
  supabase: ReturnType<typeof createClient>
): Promise<string | null> {
  if (!OPENAI_API_KEY || !jobTitle?.trim() || !sectorId?.trim()) return null;
  const sector = getSectorIfWhitelisted(sectorId);
  const sectorName = sector?.name ?? sectorId;
  const prompt = `Rédige une description de ce métier en français, en 2 à 4 phrases (environ 260 à 420 caractères).

Métier : ${jobTitle}
Secteur : ${sectorName}
${sectorSummary ? `Contexte : ${sectorSummary.slice(0, 300)}` : ''}

Dis : ce qu'on y fait, avec qui on travaille, dans quel contexte. Termine par une phrase complète.
INTERDIT : listes, puces, "missions concrètes", "…" en fin de texte. Texte continu, chaque phrase se termine par un point.`;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
        max_tokens: 180,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const rawText = (data?.choices?.[0]?.message?.content ?? '').trim().replace(/\s+/g, ' ').trim();
    if (!rawText) return null;
    const text = descriptionBySentences(rawText);
    if (!text) return null;
    const job_key = buildJobKey(sectorId, jobTitle);
    if (job_key) {
      await supabase.from('job_descriptions').upsert(
        {
          job_key,
          sector_id: sectorId,
          job_title: jobTitle,
          text,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'job_key' }
      );
    }
    return text;
  } catch {
    return null;
  }
}

function buildWhitelistSet(titles: string[]): Map<string, string> {
  const keyToCanonical = new Map<string, string>();
  for (const t of titles) {
    const key = normalizeJobKey(t ?? '');
    if (key && !keyToCanonical.has(key)) keyToCanonical.set(key, t.trim());
  }
  return keyToCanonical;
}

function isInWhitelist(jobTitle: string, keyToCanonical: Map<string, string>): string | null {
  const key = normalizeJobKey(jobTitle ?? '');
  return key ? (keyToCanonical.get(key) ?? null) : null;
}

function buildPrompt(whitelistTitles: string[], rawAnswers30: Record<string, { value?: string }>, top10Cosine: { job: string; score: number }[], sectorSummary: string | null, refinementAnswers: Record<string, { value?: string }> | null): string {
  const listStr = whitelistTitles.slice(0, 30).map((t, i) => `${i + 1}. ${t}`).join('\n');
  const answersStr = Object.entries(rawAnswers30 || {})
    .filter(([, v]) => v?.value === 'A' || v?.value === 'B' || v?.value === 'C')
    .map(([k, v]) => `${k}=${v!.value}`)
    .join(', ');
  const top10Str = (top10Cosine || []).slice(0, 10).map((r, i) => `${i + 1}. ${r.job} (${r.score?.toFixed(3) ?? '?'})`).join('\n');
  let extra = '';
  if (sectorSummary) extra += `\nRésumé secteur (contexte): ${sectorSummary.slice(0, 500)}`;
  if (refinementAnswers && Object.keys(refinementAnswers).length > 0) {
    extra += `\nRéponses d'affinage déjà données: ${JSON.stringify(refinementAnswers)}`;
  }
  return `Tu es un assistant qui choisit les 3 métiers les plus adaptés à un profil, UNIQUEMENT parmi la whitelist ci-dessous.

WHITELIST (tu DOIS utiliser exactement ces libellés pour jobTitle):
${listStr}

Réponses du quiz métier (metier_1..metier_30): ${answersStr}

Top 10 pré-classement cosine (pour cohérence):
${top10Str}
${extra}

Réponds en JSON valide uniquement, sans markdown, avec exactement cette structure:
{
  "top3": [
    { "jobTitle": "<titre exact de la whitelist>", "confidence": <0-1>, "why": "<phrase courte>" },
    { "jobTitle": "<titre exact>", "confidence": <0-1>, "why": "<phrase courte>" },
    { "jobTitle": "<titre exact>", "confidence": <0-1>, "why": "<phrase courte>" }
  ],
  "needsRefinement": <true seulement si le classement est vraiment ambigu>,
  "refinementQuestions": [
    { "id": "refine_ambig_1", "question": "<question courte>", "options": [ { "label": "<A>", "value": "A" }, { "label": "<B>", "value": "B" }, { "label": "Ça dépend", "value": "C" } ] },
    { "id": "refine_ambig_2", "question": "<question>", "options": [ ... ] },
    { "id": "refine_ambig_3", "question": "<question>", "options": [ ... ] }
  ]
}

Règles: chaque jobTitle doit être EXACTEMENT un des titres de la whitelist (copier-coller). Maximum 3 refinementQuestions. Si needsRefinement est false, laisse refinementQuestions à [] ou omets-la. Options value toujours A, B ou C; la 3e option doit être "Ça dépend" (value "C").`;
}

function validateAndFixTop3(parsed: RerankOutput, keyToCanonical: Map<string, string>, top10Cosine: { job: string; score: number }[]): RerankOutputItem[] {
  const top3: RerankOutputItem[] = [];
  const rawTop3 = Array.isArray(parsed?.top3) ? parsed.top3 : [];
  for (let i = 0; i < 3; i++) {
    const item = rawTop3[i];
    const jobTitle = item?.jobTitle ?? item?.title ?? item?.job ?? '';
    const canonical = isInWhitelist(jobTitle, keyToCanonical);
    if (canonical) {
      const why = typeof item?.why === 'string' ? item.why.slice(0, WHY_MAX) : '';
      top3.push({ jobTitle: canonical, confidence: typeof item?.confidence === 'number' ? Math.max(0, Math.min(1, item.confidence)) : 0.9, why });
    } else {
      const fallback = top10Cosine[i];
      const fallbackCanonical = fallback ? isInWhitelist(fallback.job, keyToCanonical) : null;
      top3.push({
        jobTitle: fallbackCanonical ?? (keyToCanonical.values().next().value ?? 'Métier'),
        confidence: fallback?.score ?? 0.8,
        why: '',
      });
    }
  }
  return top3;
}

function validateRefinementQuestions(qs: unknown): RerankOutput['refinementQuestions'] {
  if (!Array.isArray(qs)) return [];
  const out: RerankOutput['refinementQuestions'] = [];
  for (let i = 0; i < Math.min(qs.length, REFINEMENT_QUESTIONS_MAX); i++) {
    const q = qs[i];
    if (!q || typeof q !== 'object') continue;
    const id = (q as any).id ?? `refine_ambig_${i + 1}`;
    const question = typeof (q as any).question === 'string' ? (q as any).question : '';
    const opts = Array.isArray((q as any).options) ? (q as any).options : [];
    const options = opts
      .filter((o: any) => o && (o.value === 'A' || o.value === 'B' || o.value === 'C'))
      .map((o: any) => ({ label: typeof o.label === 'string' ? o.label : o.value, value: o.value }));
    if (options.length >= 2) {
      if (!options.some((o: { value: string }) => o.value === 'C')) options.push({ label: 'Ça dépend', value: 'C' });
      out.push({ id: String(id), question, options });
    }
  }
  return out;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200, headers: corsHeaders });

  let body: RerankInput;
  try {
    body = await req.json();
  } catch {
    return jsonResp({ error: 'invalid_json' }, 400);
  }

  const sectorId = typeof body.sectorId === 'string' ? body.sectorId.trim() : '';
  const variant = typeof body.variant === 'string' ? body.variant : 'default';
  const whitelistTitles = Array.isArray(body.whitelistTitles) ? body.whitelistTitles.filter((t) => typeof t === 'string') : [];
  const rawAnswers30 = body.rawAnswers30 && typeof body.rawAnswers30 === 'object' ? body.rawAnswers30 : {};
  const sectorSummary = typeof body.sectorSummary === 'string' ? body.sectorSummary : null;
  const top10Cosine = Array.isArray(body.top10Cosine) ? body.top10Cosine.filter((r) => r && typeof r.job === 'string') : [];
  const refinementAnswers = body.refinementAnswers && typeof body.refinementAnswers === 'object' ? body.refinementAnswers : null;

  if (whitelistTitles.length < 3) {
    return jsonResp({ error: 'whitelist_too_short', top3: [], needsRefinement: false, refinementQuestions: [] }, 200);
  }

  const userId = getUserIdFromRequest(req);
  const { aiEnabled, maxPerUser, maxGlobal } = getAIGuardrailsEnv();
  if (!aiEnabled || !OPENAI_API_KEY) {
    return jsonResp({ top3: [], needsRefinement: false, refinementQuestions: [] }, 200);
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const quota = await checkQuota(supabase, userId, maxPerUser, maxGlobal);
  if (!quota.allowed) {
    return jsonResp({ error: 'quota', top3: [], needsRefinement: false }, 429);
  }
  await incrementUsage(supabase, userId);

  const keyToCanonical = buildWhitelistSet(whitelistTitles);
  const prompt = buildPrompt(whitelistTitles, rawAnswers30, top10Cosine, sectorSummary, refinementAnswers);

  let parsed: RerankOutput | null = null;
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: 'Tu réponds uniquement en JSON valide, sans texte autour. Respecte strictement la structure demandée et la whitelist.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 800,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error('[rerank-job] OpenAI error', res.status, err);
      throw new Error(`OpenAI ${res.status}`);
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content?.trim() ?? '';
    parsed = parseJsonStrict<RerankOutput>(content);
  } catch (e) {
    console.error('[rerank-job]', e);
  }

  if (!parsed) {
    const fallbackTop3 = top10Cosine.slice(0, 3).map((r) => {
      const canonical = isInWhitelist(r.job, keyToCanonical);
      return {
        jobTitle: canonical ?? (keyToCanonical.values().next().value ?? 'Métier'),
        confidence: r.score ?? 0.8,
        why: '',
      };
    });
    return jsonResp({ top3: fallbackTop3, needsRefinement: false, refinementQuestions: [] }, 200);
  }

  const top3 = validateAndFixTop3(parsed, keyToCanonical, top10Cosine);
  const needsRefinement = Boolean(parsed.needsRefinement);
  const refinementQuestions = needsRefinement ? validateRefinementQuestions(parsed.refinementQuestions) : [];

  let top1Description: string | null = null;
  if (top3.length > 0 && sectorId) {
    top1Description = await generateTop1Description(top3[0].jobTitle, sectorId, sectorSummary, supabase);
  }

  logUsage('rerank-job', userId, true, true, true);

  return jsonResp({
    top3,
    needsRefinement,
    refinementQuestions,
    ...(top1Description ? { top1Description } : {}),
  }, 200);
});
