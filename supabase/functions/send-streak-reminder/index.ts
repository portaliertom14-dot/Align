/**
 * Edge function : rappels streak (flammes) par paliers 20h / 36h / 48h.
 * À appeler par un cron (ex. toutes les heures).
 * - Sélectionne les users avec streak_count > 0
 * - Calcule hoursSince = now - last_activity_at
 * - Envoie email 1 (>=20h, stage<1), 2 (>=36h, stage<2), 3 (>=48h, stage<3)
 * - Si last_activity_at récent (< 6h) => reset last_reminder_stage = 0
 *
 * Variables d'env : RESEND_API_KEY, STREAK_EMAIL_IMAGE_1_URL, STREAK_EMAIL_IMAGE_2_URL, STREAK_EMAIL_IMAGE_3_URL
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'hello@align-app.fr';

const IMAGE_1 = Deno.env.get('STREAK_EMAIL_IMAGE_1_URL') || '';
const IMAGE_2 = Deno.env.get('STREAK_EMAIL_IMAGE_2_URL') || '';
const IMAGE_3 = Deno.env.get('STREAK_EMAIL_IMAGE_3_URL') || '';

const HOURS_RECENT = 6;
const TIER_1_HOURS = 20;
const TIER_2_HOURS = 36;
const TIER_3_HOURS = 48;

interface ProgressRow {
  id: string;
  streak_count: number;
  last_activity_at: string | null;
  last_reminder_stage: number;
  last_reminder_sent_at: string | null;
}

function buildHtml(firstName: string, body: string, imageUrl: string): string {
  const imageTag = imageUrl
    ? `<div style="text-align: center; margin: 20px 0;"><img src="${imageUrl}" alt="Align" width="180" style="max-width: 180px; height: auto; display: block; margin: 0 auto;" /></div>`
    : '';
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.8; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #fff; padding: 40px; border-radius: 12px;">
    ${imageTag}
    <p style="font-size: 16px; color: #333; margin-bottom: 12px;">${body.replace(/\n/g, '</p><p style="font-size: 16px; color: #333; margin-bottom: 12px;">')}</p>
  </div>
</body>
</html>`;
}

const EMAIL_1 = {
  subject: 'Ta flamme vacille…',
  body: (firstName: string) =>
    `${firstName}, ta flamme est en train de s'éteindre…\nUn seul module aujourd'hui et elle tient.\nTu veux vraiment la laisser mourir maintenant ?`,
  image: IMAGE_1,
};
const EMAIL_2 = {
  subject: 'Plus que quelques heures…',
  body: (firstName: string) =>
    `${firstName}, plus que quelques heures et ta flamme va disparaître.\nTu avais bien commencé pourtant.\nTu es sûr de ne pas vouloir lancer un module maintenant ?`,
  image: IMAGE_2,
};
const EMAIL_3 = {
  subject: 'Ta flamme vient de s\'éteindre…',
  body: (firstName: string) =>
    `${firstName}, ta flamme vient de s'éteindre.\nC'est dommage, tu avais si bien commencé.\nReviens quand tu veux.`,
  image: IMAGE_3,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY non configurée');
    return new Response(JSON.stringify({ error: 'Service email non configuré' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const now = new Date();
  const nowMs = now.getTime();

  try {
    const { data: progressRows, error } = await supabase
      .from('user_progress')
      .select('id, streak_count, last_activity_at, last_reminder_stage, last_reminder_sent_at')
      .gt('streak_count', 0);

    if (error) {
      console.error('Erreur fetch user_progress:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const list = (progressRows || []) as ProgressRow[];
    if (list.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, results: [] }),
        { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const ids = list.map((r) => r.id);
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, email, first_name')
      .in('id', ids);
    const profileById = new Map((profiles || []).map((p: { id: string; email: string | null; first_name: string | null }) => [p.id, p]));

    const results: { id: string; action: string; error?: string }[] = [];

    for (const row of list) {
      const userId = row.id;
      const profile = profileById.get(userId);
      const email = profile?.email ?? null;
      const firstName = (profile?.first_name ?? '').trim() || '';

      if (!email) {
        results.push({ id: userId, action: 'skip', error: 'no_email' });
        continue;
      }

      const lastAt = row.last_activity_at ? new Date(row.last_activity_at).getTime() : null;
      const hoursSince = lastAt != null ? (nowMs - lastAt) / (1000 * 60 * 60) : 999;
      const stage = row.last_reminder_stage ?? 0;

      if (hoursSince < HOURS_RECENT) {
        const { error: upErr } = await supabase
          .from('user_progress')
          .update({
            last_reminder_stage: 0,
            last_reminder_sent_at: null,
            updated_at: now.toISOString(),
          })
          .eq('id', userId);
        if (upErr) console.error('Reset stage error:', userId, upErr);
        results.push({ id: userId, action: 'reset_stage' });
        continue;
      }

      let tier: 1 | 2 | 3 | null = null;
      if (hoursSince >= TIER_3_HOURS && stage < 3) tier = 3;
      else if (hoursSince >= TIER_2_HOURS && stage < 2) tier = 2;
      else if (hoursSince >= TIER_1_HOURS && stage < 1) tier = 1;

      if (tier === null) {
        results.push({ id: userId, action: 'skip' });
        continue;
      }

      const config = tier === 1 ? EMAIL_1 : tier === 2 ? EMAIL_2 : EMAIL_3;
      const body = config.body(firstName);
      const html = buildHtml(firstName, body, config.image);

      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: email,
          subject: config.subject,
          html,
        }),
      });

      if (!resendRes.ok) {
        const errText = await resendRes.text();
        results.push({ id: userId, action: 'send_failed', error: errText });
        continue;
      }

      const { error: updateErr } = await supabase
        .from('user_progress')
        .update({
          last_reminder_stage: tier,
          last_reminder_sent_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('id', userId);

      if (updateErr) console.error('Update after send error:', userId, updateErr);
      results.push({ id: userId, action: `sent_tier_${tier}` });
    }

    return new Response(
      JSON.stringify({ success: true, processed: list.length, results }),
      {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }
    );
  } catch (e) {
    console.error('send-streak-reminder error:', e);
    return new Response(
      JSON.stringify({ success: false, error: (e as Error).message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }
    );
  }
});
