/**
 * Edge Function : seed user_modules pour un utilisateur (idempotent).
 * - Crée les lignes manquantes (10 chapitres x 3 modules).
 * - Remplit l'apprentissage (module_index 0) depuis learning_templates (ch1-9: 1 template, ch10: pool).
 * - Lance la génération IA pour mini_simulation_metier (1) et test_secteur (2).
 *
 * Input: { userId, sectorId?, metierId?, metierKey?, metierTitle?, jobTitle?, activeMetierTitle?, poolSizeLearning10? }
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

function getMetierField(body: Record<string, unknown>): string | null {
  const raw = [body.metierId, body.metierKey, body.metierTitle, body.jobTitle, body.activeMetierTitle]
    .find((v) => v != null && typeof v === 'string' && String(v).trim().length > 0);
  return raw != null ? String(raw).trim() : null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  let userId: string | null = null;
  try {
    const body = (await req.json()) as Record<string, unknown>;
    userId = typeof body.userId === 'string' ? body.userId.trim() : null;
    const sectorId = (typeof body.sectorId === 'string' ? body.sectorId.trim() : '') || 'ingenierie_tech';
    const metier = getMetierField(body);
    const poolSizeLearning10 = typeof body.poolSizeLearning10 === 'number' && body.poolSizeLearning10 > 0
      ? body.poolSizeLearning10
      : 20;

    if (!userId) {
      return json200({ ok: false, error: 'userId requis' });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);
    const now = new Date().toISOString();

    // Skip if already running or done
    const { data: seedStatusRow } = await supabase
      .from('user_progress')
      .select('modules_seed_status')
      .eq('id', userId)
      .maybeSingle();
    const currentStatus = (seedStatusRow as any)?.modules_seed_status ?? 'idle';
    if (currentStatus === 'running') {
      console.log('[SEED] status already running, skip');
      return json200({ ok: true, skipped: true, reason: 'running' });
    }
    if (currentStatus === 'done') {
      console.log('[SEED] status already done, skip');
      return json200({ ok: true, skipped: true, reason: 'done' });
    }

    await supabase
      .from('user_progress')
      .update({
        modules_seed_status: 'running',
        modules_seed_started_at: now,
        modules_seed_done_at: null,
      })
      .eq('id', userId);
    const startedAt = Date.now();
    console.log('[SEED] status running', { userId: userId.slice(0, 8), sectorId, hasMetier: !!metier });

    // 1) Récupérer loop_learning_index pour ch10
    let loopLearningIndex = 0;
    const { data: progressRow } = await supabase
      .from('user_progress')
      .select('loop_learning_index')
      .eq('id', userId)
      .maybeSingle();
    if (progressRow && typeof (progressRow as any).loop_learning_index === 'number') {
      loopLearningIndex = Math.max(0, (progressRow as any).loop_learning_index);
    }

    // 2) Ensure rows exist (upsert pending)
    for (let ch = 1; ch <= 10; ch++) {
      for (let mi = 0; mi <= 2; mi++) {
        const type = MODULE_TYPES[mi];
        const { data: existing } = await supabase
          .from('user_modules')
          .select('user_id')
          .eq('user_id', userId)
          .eq('chapter_id', ch)
          .eq('module_index', mi)
          .maybeSingle();
        if (!existing) {
          const { error: ins } = await supabase.from('user_modules').insert({
            user_id: userId,
            chapter_id: ch,
            module_index: mi,
            type,
            status: 'pending',
            payload: null,
            error_message: null,
            updated_at: now,
          });
          if (ins) {
            console.log('[SEED_MODULES] ROW_CREATE skip (dup?)', { ch, mi, err: ins.message });
          } else {
            console.log('[SEED_MODULES] ROW_CREATE', { chapterId: ch, moduleIndex: mi });
          }
        }
      }
    }

    const baseUrl = `${supabaseUrl}/functions/v1`;
    const authHeader = req.headers.get('Authorization') ?? '';

    const invokeFeed = async (payload: Record<string, unknown>) => {
      const res = await fetch(`${baseUrl}/generate-feed-module`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(authHeader ? { Authorization: authHeader } : {}) },
        body: JSON.stringify(payload),
      });
      return res.json().catch(() => ({}));
    };

    // 3) Fill apprentissage (module_index 0) from templates
    for (let ch = 1; ch <= 10; ch++) {
      const { data: row } = await supabase
        .from('user_modules')
        .select('status, payload')
        .eq('user_id', userId)
        .eq('chapter_id', ch)
        .eq('module_index', 0)
        .maybeSingle();
      if (!row || row.status === 'ready') continue;

      let templatePayload: unknown = null;
      if (ch <= 9) {
        const { data: t } = await supabase
          .from('learning_templates')
          .select('payload')
          .eq('chapter_id', ch)
          .eq('module_index', 0)
          .maybeSingle();
        templatePayload = (t as any)?.payload ?? null;
      } else {
        const idx = (loopLearningIndex ?? 0) % poolSizeLearning10;
        console.log('[LOOP10] pickTemplate', {
          loop_learning_index: loopLearningIndex,
          poolSize: poolSizeLearning10,
          pickedIndex: idx,
          chapterId: ch,
        });
        const { data: t } = await supabase
          .from('learning_templates')
          .select('payload')
          .eq('chapter_id', 10)
          .eq('module_index', idx)
          .maybeSingle();
        templatePayload = (t as any)?.payload ?? null;
      }

      if (templatePayload) {
        await supabase
          .from('user_modules')
          .update({
            payload: templatePayload,
            status: 'ready',
            error_message: null,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .eq('chapter_id', ch)
          .eq('module_index', 0);
        console.log('[SEED_MODULES] LEARNING_READY', { chapterId: ch });
      }
    }

    // 4) Build list of AI tasks (ch, mi) that need generation
    type Task = { ch: number; mi: 1 | 2 };
    const tasks: Task[] = [];
    for (let ch = 1; ch <= 10; ch++) {
      for (const mi of [1, 2] as const) {
        const { data: row } = await supabase
          .from('user_modules')
          .select('status, payload')
          .eq('user_id', userId)
          .eq('chapter_id', ch)
          .eq('module_index', mi)
          .maybeSingle();
        if (!row || (row.payload != null && row.status === 'ready')) continue;
        tasks.push({ ch, mi });
      }
    }

    const MAX_CONCURRENCY = 4;
    const runTask = async (task: Task): Promise<void> => {
      const { ch, mi } = task;
      await supabase
        .from('user_modules')
        .update({
          status: 'generating',
          error_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('chapter_id', ch)
        .eq('module_index', mi);

      const moduleType = mi === 1 ? 'mini_simulation_metier' : 'test_secteur';
      const payload: Record<string, unknown> = {
        moduleType,
        sectorId: sectorId,
        level: 1,
      };
      if (metier) {
        payload.metierKey = metier;
        payload.metierTitle = metier;
        payload.activeMetierTitle = metier;
      }

      const data = await invokeFeed(mi === 1 ? payload : { moduleType: 'test_secteur', sectorId, level: 1 });
      const resultPayload = data?.source === 'disabled' || data?.source === 'invalid' || data?.source === 'error' ? null : data;
      const status = resultPayload ? 'ready' : 'error';
      const error_message = resultPayload ? null : (data?.error ?? 'génération échouée');

      await supabase
        .from('user_modules')
        .update({
          payload: resultPayload,
          status,
          error_message,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('chapter_id', ch)
        .eq('module_index', mi);

      if (resultPayload) {
        console.log('[SEED_MODULES] AI_READY', { chapterId: ch, moduleIndex: mi });
      } else {
        console.log('[SEED_MODULES] AI_FAIL', { chapterId: ch, moduleIndex: mi, error: error_message });
      }
    };

    let taskIndex = 0;
    const runNext = async (): Promise<void> => {
      if (taskIndex >= tasks.length) return;
      const i = taskIndex++;
      await runTask(tasks[i]);
      await runNext();
    };
    await Promise.all(Array.from({ length: MAX_CONCURRENCY }, () => runNext()));

    const doneAt = new Date().toISOString();
    await supabase
      .from('user_progress')
      .update({
        modules_seed_status: 'done',
        modules_seed_done_at: doneAt,
      })
      .eq('id', userId);
    const elapsed = Date.now() - startedAt;
    console.log('[SEED] status done', { timingMs: elapsed, tasksCount: tasks.length });
    return json200({ ok: true, timingMs: elapsed });
  } catch (err) {
    console.error('[SEED] Error:', err);
    try {
      if (typeof userId === 'string' && userId) {
        const supabaseErr = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
        await supabaseErr.from('user_progress').update({ modules_seed_status: 'error' }).eq('id', userId);
        console.log('[SEED] status error');
      }
    } catch (_) {}
    return json200({ ok: false, error: String(err?.message ?? 'Erreur inconnue') });
  }
});
