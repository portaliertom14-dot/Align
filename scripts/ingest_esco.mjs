#!/usr/bin/env node
/**
 * Ingest ESCO — importe groups + occupations depuis un JSON vers Supabase
 * Usage: node scripts/ingest_esco.mjs [path/to/occupations.json]
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Charger .env manuellement si présent
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

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Erreur: variables manquantes dans .env');
  if (!supabaseUrl) console.error('  - SUPABASE_URL ou EXPO_PUBLIC_SUPABASE_URL');
  if (!serviceRoleKey) {
    console.error('  - SUPABASE_SERVICE_ROLE_KEY (clé service_role, pas anon)');
    console.error('    → Supabase Dashboard → Settings → API → Project API keys → service_role');
  }
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const dataPath = process.argv[2] || resolve(process.cwd(), 'data/esco/sample_occupations.json');

async function main() {
  let data;
  try {
    const raw = readFileSync(dataPath, 'utf8');
    data = JSON.parse(raw);
  } catch (e) {
    console.error('Impossible de lire', dataPath, e.message);
    process.exit(1);
  }

  const groups = data.groups || [];
  const occupations = data.occupations || [];

  console.log('[INGEST] Groups:', groups.length, 'Occupations:', occupations.length);

  if (groups.length > 0) {
    const rows = groups.map((g) => ({
      id: String(g.id).trim(),
      label_fr: (g.label_fr || '').trim() || null,
      label_en: (g.label_en || '').trim() || null,
      parent_id: g.parent_id ? String(g.parent_id).trim() : null,
    }));
    const { error } = await supabase.from('esco_groups').upsert(rows, { onConflict: 'id' });
    if (error) {
      console.error('[INGEST] esco_groups error:', error);
      process.exit(1);
    }
    console.log('[INGEST] esco_groups OK');
  }

  const occRows = occupations.map((o) => ({
    id: String(o.id).trim(),
    code: (o.code || '').trim() || null,
    title_fr: (o.title_fr || o.title_en || o.id).trim(),
    title_en: (o.title_en || '').trim() || null,
    description_fr: (o.description_fr || '').trim() || null,
    description_en: (o.description_en || '').trim() || null,
    group_id: o.group_id ? String(o.group_id).trim() : null,
    is_active: true,
  }));

  const batchSize = 100;
  for (let i = 0; i < occRows.length; i += batchSize) {
    const batch = occRows.slice(i, i + batchSize);
    const { error } = await supabase.from('esco_occupations').upsert(batch, { onConflict: 'id' });
    if (error) {
      console.error('[INGEST] esco_occupations batch', i, error);
      process.exit(1);
    }
    console.log('[INGEST] esco_occupations', i + batch.length, '/', occRows.length);
  }

  console.log('[INGEST] Done. Run embed_esco.mjs next.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
