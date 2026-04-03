import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'hello@align-app.fr';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

const SUBJECT = 'Tu es à deux clics de connaître ton métier 🎯';
const TEXT_BODY = `Salut,

Tu as répondu à plus de 80 questions sur toi-même. Ton profil est prêt. Ton métier t'attend de l'autre côté.

La plupart des lycéens passent des années à hésiter sans jamais vraiment savoir vers quoi ils vont. Toi t'as déjà fait le plus dur — tu t'es posé les vraies questions.

Il reste une seule étape pour débloquer ton résultat complet.

→ Reviens sur Align et découvre ton métier : align-app.fr

C'est 9€, une seule fois, accès à vie. Moins cher qu'une sortie.

À tout de suite,
Tom — Fondateur d'Align`;

const HTML_BODY = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.8; color: #222; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #ffffff; padding: 28px; border-radius: 12px;">
      <p>Salut,</p>
      <p>Tu as répondu à plus de 80 questions sur toi-même. Ton profil est prêt. Ton métier t'attend de l'autre côté.</p>
      <p>La plupart des lycéens passent des années à hésiter sans jamais vraiment savoir vers quoi ils vont. Toi t'as déjà fait le plus dur — tu t'es posé les vraies questions.</p>
      <p>Il reste une seule étape pour débloquer ton résultat complet.</p>
      <p><strong>→ Reviens sur Align et découvre ton métier : <a href="https://align-app.fr">align-app.fr</a></strong></p>
      <p>C'est 9€, une seule fois, accès à vie. Moins cher qu'une sortie.</p>
      <p>À tout de suite,<br />Tom — Fondateur d'Align</p>
    </div>
  </body>
</html>
`;

interface PaywallEventRow {
  id: string;
  user_id: string;
  created_at: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: CORS_HEADERS,
    });
  }

  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY non configurée' }), {
      status: 500,
      headers: CORS_HEADERS,
    });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const thresholdIso = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    const { data: events, error: eventsError } = await supabase
      .from('paywall_events')
      .select('id, user_id, created_at')
      .eq('email_sent', false)
      .lte('created_at', thresholdIso)
      .order('created_at', { ascending: true });

    if (eventsError) {
      throw new Error(`paywall_events query failed: ${eventsError.message}`);
    }

    const pending = (events || []) as PaywallEventRow[];
    const results: Array<{ eventId: string; userId: string; action: string; error?: string }> = [];

    for (const event of pending) {
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('is_premium')
        .eq('id', event.user_id)
        .maybeSingle();

      if (profileError) {
        results.push({ eventId: event.id, userId: event.user_id, action: 'skip_profile_error', error: profileError.message });
        continue;
      }

      if (profile?.is_premium === true) {
        await supabase
          .from('paywall_events')
          .update({ email_sent: true, email_sent_at: new Date().toISOString() })
          .eq('id', event.id);
        results.push({ eventId: event.id, userId: event.user_id, action: 'skip_already_premium' });
        continue;
      }

      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(event.user_id);
      if (userError) {
        results.push({ eventId: event.id, userId: event.user_id, action: 'skip_auth_user_error', error: userError.message });
        continue;
      }

      const email = userData?.user?.email?.trim();
      if (!email) {
        results.push({ eventId: event.id, userId: event.user_id, action: 'skip_no_email' });
        continue;
      }

      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: email,
          subject: SUBJECT,
          text: TEXT_BODY,
          html: HTML_BODY,
        }),
      });

      if (!resendRes.ok) {
        const errText = await resendRes.text();
        results.push({ eventId: event.id, userId: event.user_id, action: 'send_failed', error: errText });
        continue;
      }

      const { error: markSentError } = await supabase
        .from('paywall_events')
        .update({ email_sent: true, email_sent_at: new Date().toISOString() })
        .eq('id', event.id);

      if (markSentError) {
        results.push({ eventId: event.id, userId: event.user_id, action: 'sent_but_mark_failed', error: markSentError.message });
      } else {
        results.push({ eventId: event.id, userId: event.user_id, action: 'sent' });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: pending.length,
        results,
      }),
      { headers: CORS_HEADERS }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message,
      }),
      {
        status: 500,
        headers: CORS_HEADERS,
      }
    );
  }
});
