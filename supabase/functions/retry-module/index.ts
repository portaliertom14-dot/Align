/**
 * Edge Function : regénère un module user_modules en status error ou generating.
 * module_index 0 = apprentissage (template), 1 = mini_simulation_metier, 2 = test_secteur.
 * Ch10 apprentissage : template = loop_learning_index % pool_size.
 *
 * Input: { userId, chapterId, moduleIndex, secteurId?, metierKey?, metierTitle?, metierId? }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json200 = (body: object) =>
  new Response(JSON.stringify(body), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const MODULE_TYPES = ['apprentissage', 'mini_simulation_metier', 'test_secteur'] as const;
const CH10_POOL_SIZE = 20;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as {
      userId?: string;
      chapterId?: number;
      moduleIndex?: number;
      secteurId?: string;
      metierKey?: string | null;
      metierTitle?: string | null;
      metierId?: string | null;
    };
    const userId = typeof body.userId === 'string' ? body.userId.trim() : null;
    const chapterId = typeof body.chapterId === 'number' ? body.chapterId : 1;
    const moduleIndex = typeof body.moduleIndex === 'number' ? body.moduleIndex : 0;
    const secteurId = (typeof body.secteurId === 'string' ? body.secteurId.trim() : '') || 'ingenierie_tech';
    const metierKey = typeof body.metierKey === 'string' ? body.metierKey.trim() || null : null;
    const metierTitle = typeof body.metierTitle === 'string' ? body.metierTitle.trim() || null : null;
    const metierId = typeof body.metierId === 'string' ? body.metierId.trim() || null : null;

    if (!userId) {
      return json200({ ok: false, error: 'userId requis' });
    }
    if (moduleIndex < 0 || moduleIndex > 2) {
      return json200({ ok: false, error: 'moduleIndex invalide (0, 1 ou 2)' });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);
    const authHeader = req.headers.get('Authorization') ?? '';
    const moduleType = MODULE_TYPES[moduleIndex];
    const now = new Date().toISOString();

    const { data: existing } = await supabase
      .from('user_modules')
      .select('user_id')
      .eq('user_id', userId)
      .eq('chapter_id', chapterId)
      .eq('module_index', moduleIndex)
      .maybeSingle();

    if (!existing) {
      const { error: insertErr } = await supabase.from('user_modules').insert({
        user_id: userId,
        chapter_id: chapterId,
        module_index: moduleIndex,
        type: moduleType,
        status: 'generating',
        payload: null,
        error_message: null,
        updated_at: now,
      });
      if (insertErr) {
        console.error('[retry-module] INSERT failed', insertErr.message, insertErr.code);
        return json200({ ok: false, error: 'insert_failed', details: insertErr.message });
      }
    } else {
      await supabase
        .from('user_modules')
        .update({
          status: 'generating',
          error_message: null,
          updated_at: now,
        })
        .eq('user_id', userId)
        .eq('chapter_id', chapterId)
        .eq('module_index', moduleIndex);
    }

    const baseUrl = `${supabaseUrl}/functions/v1`;
    const invokeFeed = async (payload: Record<string, unknown>) => {
      const res = await fetch(`${baseUrl}/generate-feed-module`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
        body: JSON.stringify(payload),
      });
      return res.json().catch(() => ({}));
    };

    // module_index 0 = apprentissage : copie depuis learning_templates (ch10 = pool)
    if (moduleIndex === 0) {
      let templateIndex = 0;
      if (chapterId === 10) {
        const { data: prog } = await supabase
          .from('user_progress')
          .select('loop_learning_index')
          .eq('id', userId)
          .maybeSingle();
        const loop = (prog as any)?.loop_learning_index ?? 0;
        templateIndex = Math.max(0, loop) % CH10_POOL_SIZE;
      }
      const { data: template } = await supabase
        .from('learning_templates')
        .select('payload')
        .eq('chapter_id', chapterId)
        .eq('module_index', templateIndex)
        .maybeSingle();
      const payload = (template as any)?.payload ?? null;
      const status = payload ? 'ready' : 'error';
      await supabase
        .from('user_modules')
        .update({
          payload,
          status,
          error_message: payload ? null : 'learning_templates vide',
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('chapter_id', chapterId)
        .eq('module_index', moduleIndex);
      return json200({ ok: true, status });
    }

    // module_index 1 = mini_simulation_metier, 2 = test_secteur
    const metierPayload: Record<string, unknown> = {
      moduleType: moduleIndex === 1 ? 'mini_simulation_metier' : 'test_secteur',
      sectorId: secteurId,
      level: 1,
    };
    if (metierId) metierPayload.metierId = metierId;
    if (metierKey) metierPayload.metierKey = metierKey;
    if (metierTitle) metierPayload.metierTitle = metierTitle;
    if (metierId) metierPayload.activeMetierTitle = metierId;

    const data = await invokeFeed(
      moduleIndex === 1 ? metierPayload : { moduleType: 'test_secteur', sectorId: secteurId, level: 1 }
    );

    const payload = data?.source === 'disabled' || data?.source === 'invalid' || data?.source === 'error' ? null : data;
    const status = payload ? 'ready' : 'error';
    const error_message = payload ? null : (data?.error ?? 'génération échouée');

    await supabase
      .from('user_modules')
      .update({
        payload,
        status,
        error_message,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('chapter_id', chapterId)
      .eq('module_index', moduleIndex);

    console.log('[retry-module] done', { userId: userId.slice(0, 8), chapterId, moduleIndex, status });
    return json200({ ok: true, status });
  } catch (err) {
    console.error('[retry-module] Error:', err);
    return json200({ ok: false, error: String(err?.message ?? 'Erreur inconnue') });
  }
});
