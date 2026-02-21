#!/usr/bin/env node
/**
 * Embed ESCO — calcule les embeddings OpenAI pour chaque occupation et les stocke
 * Usage: node scripts/embed_esco.mjs
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY (ou EXPO_PUBLIC_OPENAI_API_KEY)
 * Rate limit: batch 20, retry exponentiel, ~2s entre batches
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Charger .env
try {
  const envPath = resolve(process.cwd(), '.env');
  const env = readFileSync(envPath, 'utf8');
  for (const line of env.split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  }
} catch (_) {}

const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const openaiKey = process.env.OPENAI_API_KEY || process.env.EXPO_PUBLIC_OPENAI_API_KEY;

if (!supabaseUrl || !serviceRoleKey || !openaiKey) {
  console.error('Erreur: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY requis');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);
const EMBEDDING_MODEL = 'text-embedding-3-small';
const DIM = 1536;
const BATCH_SIZE = 20;
const DELAY_MS = 2000;

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function getEmbedding(text) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: text.slice(0, 8000) }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data.data?.[0]?.embedding;
}

async function getEmbeddingWithRetry(text, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await getEmbedding(text);
    } catch (e) {
      if (i === retries - 1) throw e;
      const backoff = Math.min(2000 * Math.pow(2, i), 30000);
      console.warn('[EMBED] Retry', i + 1, 'after', backoff, 'ms:', e.message);
      await sleep(backoff);
    }
  }
}

async function main() {
  const { data: occupations, error: fetchErr } = await supabase
    .from('esco_occupations')
    .select('id, title_fr, title_en, description_fr, description_en')
    .eq('is_active', true);

  if (fetchErr) {
    console.error('[EMBED] fetch occupations:', fetchErr);
    process.exit(1);
  }

  const { data: existing } = await supabase.from('esco_embeddings').select('occupation_id');
  const existingIds = new Set((existing || []).map((r) => r.occupation_id));

  const toEmbed = occupations.filter((o) => !existingIds.has(o.id));
  console.log('[EMBED] Occupations:', occupations.length, 'à embarquer:', toEmbed.length);

  if (toEmbed.length === 0) {
    console.log('[EMBED] Rien à faire.');
    return;
  }

  let done = 0;
  for (let i = 0; i < toEmbed.length; i += BATCH_SIZE) {
    const batch = toEmbed.slice(i, i + BATCH_SIZE);
    const texts = batch.map((o) => {
      const title = (o.title_fr || o.title_en || '').trim();
      const desc = (o.description_fr || o.description_en || '').trim();
      return `${title} - ${desc}`.trim();
    });

    const embeddings = [];
    for (const t of texts) {
      const emb = await getEmbeddingWithRetry(t);
      embeddings.push(emb);
      await sleep(100); // petit délai entre requêtes
    }

    const rows = batch.map((o, j) => ({
      occupation_id: o.id,
      embedding: embeddings[j],
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from('esco_embeddings').upsert(rows, { onConflict: 'occupation_id' });
    if (error) {
      console.error('[EMBED] upsert error:', error);
      process.exit(1);
    }

    done += batch.length;
    console.log('[EMBED]', done, '/', toEmbed.length);
    await sleep(DELAY_MS);
  }

  console.log('[EMBED] Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
