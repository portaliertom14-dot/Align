/**
 * Edge Function : description métier (4–6 lignes).
 * Accepte TOUT jobTitle renvoyé par jobAnalyze (pas de whitelist bloquante).
 * job_key = sectorId + ':' + normalize(jobTitle). Cache → return { ok, text }; sinon OpenAI → store → return { ok, text }.
 * 400 uniquement si JSON invalide ou champs obligatoires manquants. Sinon 200 avec { ok: false, reason } si erreur métier.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { normalizeJobKey } from '../_shared/normalizeJobKey.ts';
import { getJobTitlesForSector } from '../_shared/jobsBySectorTitles.ts';
import { getSectorIfWhitelisted } from '../_shared/validation.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const MODEL = 'gpt-4o-mini';
const MAX_DESC_CHARS = 420;
const MIN_DESC_CHARS = 260;

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

function buildJobKey(sectorId: string, jobTitle: string): string {
  const sid = (sectorId ?? '').trim().toLowerCase();
  const key = normalizeJobKey(jobTitle ?? '');
  return key ? `${sid}:${key}` : '';
}

/** Coupure au dernier . ! ? ou au dernier , + point. Jamais de "…" à la fin. */
function trimToCompletePhrase(s: string, maxLen: number): string {
  const t = (s ?? '').replace(/\s+/g, ' ').trim();
  if (!t.length || t.length <= maxLen) return t;
  const slice = t.slice(0, maxLen);
  const lastDot = slice.lastIndexOf('.');
  const lastExcl = slice.lastIndexOf('!');
  const lastQ = slice.lastIndexOf('?');
  const lastComma = slice.lastIndexOf(',');
  const best = Math.max(lastDot, lastExcl, lastQ);
  if (best >= 0) return slice.slice(0, best + 1).trim();
  if (lastComma >= 0) return (slice.slice(0, lastComma + 1).trim() + '.').trim();
  return slice.trim();
}

/**
 * Post-traitement : phrases complètes uniquement, max 420. Jamais de "…" en fin.
 */
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
  const out = result.trim();
  return out ? trimToCompletePhrase(out, MAX_DESC_CHARS) || out : out;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return corsOptions();

  const requestId = `jd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  let body: { sectorId?: string; jobTitle?: string; requestId?: string };
  try {
    body = await req.json();
  } catch {
    console.log('[JOB_DESC]', requestId, 'reject', { reason: 'invalid_json' });
    return jsonResp({ ok: false, error: 'Body JSON invalide' }, 400);
  }

  const sectorIdRaw = (body.sectorId ?? '').trim();
  const jobTitleRaw = (body.jobTitle ?? '').trim();
  if (!sectorIdRaw || !jobTitleRaw) {
    console.log('[JOB_DESC]', requestId, 'reject', { reason: 'missing_fields', sectorId: !!sectorIdRaw, jobTitle: !!jobTitleRaw });
    return jsonResp({ ok: false, error: 'sectorId et jobTitle requis' }, 400);
  }

  const sector = getSectorIfWhitelisted(sectorIdRaw);
  if (!sector) {
    console.log('[JOB_DESC]', requestId, 'reject', { reason: 'secteur_invalide', sectorId: sectorIdRaw });
    return jsonResp({ ok: false, reason: 'secteur_invalide' }, 200);
  }
  const sectorId = sector.validId;

  // Accepter tout jobTitle (pas de whitelist bloquante). Utiliser le titre reçu pour cache + prompt.
  const jobTitle = jobTitleRaw;
  const job_key = buildJobKey(sectorId, jobTitle);
  if (!job_key) {
    console.log('[JOB_DESC]', requestId, 'reject', { reason: 'cle_invalide', jobTitle: jobTitleRaw.slice(0, 60) });
    return jsonResp({ ok: false, reason: 'cle_invalide' }, 200);
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const { data: row, error: selectError } = await supabase
    .from('job_descriptions')
    .select('text')
    .eq('job_key', job_key)
    .maybeSingle();

  if (!selectError && row?.text) {
    console.log('[JOB_DESC] CACHE_HIT');
    const textOut = descriptionBySentences(row.text);
    return jsonResp({ ok: true, text: textOut, cached: true }, 200);
  }

  if (!OPENAI_API_KEY) {
    console.log('[JOB_DESC] FAIL', { reason: 'OpenAI non configuré', status: 503 });
    return jsonResp({ error: 'OpenAI non configuré' }, 503);
  }

  console.log('[JOB_DESC] CACHE_MISS');
  const sectorName = sector.name ?? sectorId;
  const prompt = `Rédige une description de ce métier en français, en 2 à 4 phrases (environ 260 à 420 caractères).

Métier : ${jobTitle}
Secteur : ${sectorName}

Dis : ce qu'on y fait, avec qui on travaille, dans quel contexte. Termine par une phrase complète.
INTERDIT : listes, puces, "missions concrètes", "compétences clés", "parcours type", "…" en fin de texte.
Pas de ton scolaire. Texte continu, chaque phrase se termine par un point.`;

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

  if (!res.ok) {
    const errText = await res.text();
    console.log('[JOB_DESC] FAIL', { status: res.status, err: errText?.slice(0, 200) });
    return jsonResp({ error: 'Génération description indisponible' }, 502);
  }

  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  const rawText = (typeof content === 'string' ? content.trim() : '').replace(/\s+/g, ' ').trim();
  if (!rawText) {
    console.log('[JOB_DESC] FAIL', { reason: 'réponse OpenAI vide', status: 502 });
    return jsonResp({ error: 'Réponse OpenAI vide' }, 502);
  }
  const text = descriptionBySentences(rawText);

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

  return jsonResp({ ok: true, text, cached: false }, 200);
});
