/**
 * Edge Function ADMIN : remplit learning_templates (une seule fois).
 * Protégée par X-Admin-Secret (ou Authorization Bearer service_role).
 *
 * Chapitres 1-9 : 1 template chacun (module_index = 0).
 * Chapitre 10 : pool de 20 templates (module_index 0..19) pour boucle infinie.
 *
 * Payload = même schéma que le module apprentissage rendu par l'app (id, type, titre, objectif, durée_estimée, items, feedback_final).
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json200 = (body: object) =>
  new Response(JSON.stringify(body), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
const json403 = (body: object) =>
  new Response(JSON.stringify(body), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const DEFAULT_ITEM = {
  type: 'cas_etudiant',
  question: 'Situation d\'apprentissage : comment réagis-tu ?',
  options: ['Option A', 'Option B', 'Option C'],
  reponse_correcte: 0,
  explication: 'Explication courte.',
};

function buildPayload(chapterId: number, moduleIndex: number): Record<string, unknown> {
  const id = `learning_ch${chapterId}_m${moduleIndex}_${Date.now()}`;
  return {
    id,
    type: 'apprentissage_mindset',
    titre: chapterId <= 9 ? `Apprentissage & Mindset — Chapitre ${chapterId}` : `Apprentissage & Mindset — Chapitre 10 (${moduleIndex + 1}/20)`,
    objectif: 'Découvre comment tu réagis face à l\'apprentissage.',
    durée_estimée: 4,
    items: Array(12).fill(null).map((_, i) => ({ ...DEFAULT_ITEM, question: `Question ${i + 1} (ch${chapterId}).` })),
    feedback_final: { message: 'Bravo !', recompense: { xp: 50, etoiles: 2 } },
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  const adminSecret = Deno.env.get('ADMIN_SECRET');
  const authHeader = req.headers.get('Authorization') ?? '';
  const xAdmin = req.headers.get('X-Admin-Secret') ?? '';
  const hasServiceRole = authHeader.startsWith('Bearer ') && authHeader.length > 50;
  const hasAdminSecret = adminSecret && (xAdmin === adminSecret || (authHeader.startsWith('Bearer ') && authHeader.slice(7) === adminSecret));
  if (!hasServiceRole && !hasAdminSecret) {
    return json403({ ok: false, error: 'Admin ou service_role requis (X-Admin-Secret ou Authorization: Bearer <SERVICE_ROLE_JWT>)' });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Chapitres 1-9 : 1 template chacun (module_index 0)
    for (let ch = 1; ch <= 9; ch++) {
      const payload = buildPayload(ch, 0);
      await supabase.from('learning_templates').upsert(
        { chapter_id: ch, module_index: 0, payload },
        { onConflict: 'chapter_id,module_index' }
      );
    }
    // Chapitre 10 : pool (module_index 0..19)
    const poolSize = 20;
    for (let idx = 0; idx < poolSize; idx++) {
      const payload = buildPayload(10, idx);
      await supabase.from('learning_templates').upsert(
        { chapter_id: 10, module_index: idx, payload },
        { onConflict: 'chapter_id,module_index' }
      );
    }

    const { count } = await supabase.from('learning_templates').select('*', { count: 'exact', head: true });
    console.log('[generate-learning-templates] done, rows=', count);
    return json200({ ok: true, rows: count ?? 29 });
  } catch (err) {
    console.error('[generate-learning-templates] Error:', err);
    return json200({ ok: false, error: String(err?.message ?? 'Erreur inconnue') });
  }
});
