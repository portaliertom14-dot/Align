/**
 * Edge Function : description secteur (2–4 phrases, ~240–360 caractères).
 * Cache table sector_descriptions(sector_id, text, updated_at). CORS OPTIONS → 204.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getSectorIfWhitelisted } from '../_shared/validation.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const MODEL = 'gpt-4o-mini';
const MAX_SECTOR_DESC_CHARS = 360;
const MIN_SECTOR_DESC_CHARS = 240;
const FALLBACK = 'Ce secteur offre des opportunités variées. Découvre les métiers qui te correspondent.';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResp(body: object, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
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

function descriptionBySentencesSector(s: string): string {
  const t = (s ?? '').replace(/\s+/g, ' ').trim();
  if (!t.length) return '';
  const sentences = (t.match(/[^.!?]+[.!?]/g) ?? []).map((x) => x.trim()).filter(Boolean);
  if (sentences.length === 0) return trimToCompletePhrase(t, MAX_SECTOR_DESC_CHARS) || '';
  let result = '';
  for (const phrase of sentences) {
    const withSpace = result ? result + ' ' + phrase : phrase;
    if (withSpace.length <= MAX_SECTOR_DESC_CHARS) result = withSpace;
    else break;
  }
  const out = result.trim();
  return out ? trimToCompletePhrase(out, MAX_SECTOR_DESC_CHARS) || out : out;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });

  let body: { sectorId?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResp({ error: 'Body JSON invalide' }, 400);
  }

  const sectorIdRaw = (body.sectorId ?? '').trim();
  if (!sectorIdRaw) return jsonResp({ error: 'sectorId requis' }, 400);

  const sector = getSectorIfWhitelisted(sectorIdRaw);
  if (!sector) {
    console.log('[SECTOR_DESC] FAIL', { reason: 'secteur invalide', sectorId: sectorIdRaw });
    return jsonResp({ error: 'Secteur invalide' }, 400);
  }

  const sectorId = sector.validId;
  const secteurName = sector.name ?? sectorId;

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: row, error: selectError } = await supabase
    .from('sector_descriptions')
    .select('text')
    .eq('sector_id', sectorId)
    .maybeSingle();

  if (!selectError && row?.text) {
    console.log('[SECTOR_DESC] CACHE_HIT');
    const textOut = descriptionBySentencesSector(row.text);
    return jsonResp({ ok: true, text: textOut || FALLBACK, cached: true }, 200);
  }

  if (!OPENAI_API_KEY) {
    console.log('[SECTOR_DESC] FAIL', { reason: 'OpenAI non configuré' });
    return jsonResp({ ok: true, text: FALLBACK }, 200);
  }

  try {
    const prompt = `En 2 à 4 phrases, en français simple et concret, décris ce qu'on fait dans ce secteur professionnel. Donne au maximum 2 exemples concrets. Termine par une phrase complète. Pas de listes, pas de puces. Longueur : environ 240 à 360 caractères.

Secteur : ${secteurName}`;
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 8000);
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 220,
      }),
    });
    if (!res.ok) {
      console.log('[SECTOR_DESC] FAIL', { status: res.status });
      return jsonResp({ ok: true, text: FALLBACK }, 200);
    }
    const data = await res.json();
    const raw = (data?.choices?.[0]?.message?.content ?? '').trim().replace(/\s+/g, ' ').trim();
    if (!raw) {
      console.log('[SECTOR_DESC] FAIL', { reason: 'empty_response' });
      return jsonResp({ ok: true, text: FALLBACK }, 200);
    }
    let text = descriptionBySentencesSector(raw);
    if (!text) text = trimToCompletePhrase(raw, MAX_SECTOR_DESC_CHARS) || FALLBACK;
    else text = trimToCompletePhrase(text, MAX_SECTOR_DESC_CHARS) || text;
    const finalText = text || FALLBACK;

    await supabase.from('sector_descriptions').upsert(
      { sector_id: sectorId, text: finalText, updated_at: new Date().toISOString() },
      { onConflict: 'sector_id' }
    );
    console.log('[SECTOR_DESC] OK');
    return jsonResp({ ok: true, text: finalText, cached: false }, 200);
  } catch (e) {
    console.log('[SECTOR_DESC] FAIL', { error: (e as Error)?.message ?? 'unknown' });
    return jsonResp({ ok: true, text: FALLBACK }, 200);
  }
});
