/**
 * Edge Function : suppression du compte utilisateur (RGPD).
 * L'utilisateur est identifié par le JWT (Authorization: Bearer <token>).
 * Supprime toutes les données public puis auth.users.
 *
 * Secrets : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY (pour résoudre le user depuis le JWT).
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { ...cors, 'Access-Control-Allow-Methods': 'POST, OPTIONS' } });
  }

  const jsonHeaders = { 'Content-Type': 'application/json', ...cors };

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'method_not_allowed' }), { status: 405, headers: jsonHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), { status: 401, headers: jsonHeaders });
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
      return new Response(JSON.stringify({ ok: false, error: 'config' }), { status: 500, headers: jsonHeaders });
    }

    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user?.id) {
      return new Response(JSON.stringify({ ok: false, error: 'invalid_token' }), { status: 401, headers: jsonHeaders });
    }

    const userId = user.id;
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const tablesToDelete: { table: string; column: string }[] = [
      { table: 'user_progress', column: 'id' },
      { table: 'user_profiles', column: 'id' },
      { table: 'user_modules', column: 'user_id' },
      { table: 'ai_modules', column: 'user_id' },
      { table: 'scores', column: 'user_id' },
      { table: 'quiz_responses', column: 'user_id' },
      { table: 'quiz_responses_individual', column: 'user_id' },
    ];

    for (const { table, column } of tablesToDelete) {
      try {
        if (column === 'id') {
          await admin.from(table).delete().eq('id', userId);
        } else {
          await admin.from(table).delete().eq(column, userId);
        }
      } catch (e) {
        const msg = (e as Error)?.message ?? '';
        if (!msg.includes('does not exist') && !msg.includes('relation')) {
          console.error(`[delete-my-account] ${table}:`, msg);
        }
      }
    }

    const { error: deleteUserError } = await admin.auth.admin.deleteUser(userId);
    if (deleteUserError) {
      console.error('[delete-my-account] auth.admin.deleteUser:', deleteUserError.message);
      return new Response(JSON.stringify({ ok: false, error: 'delete_failed' }), { status: 500, headers: jsonHeaders });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: jsonHeaders });
  } catch (e) {
    console.error('[delete-my-account]', (e as Error)?.message ?? e);
    return new Response(JSON.stringify({ ok: false, error: 'server_error' }), { status: 500, headers: jsonHeaders });
  }
});
