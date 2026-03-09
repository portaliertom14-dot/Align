/**
 * Edge Function : création d'une session Stripe Billing Portal (gestion / annulation abonnement).
 * Body optionnel : { returnUrl?: string }.
 * Retourne { url } pour rediriger le client vers le portail client Stripe.
 *
 * Secrets : STRIPE_SECRET_KEY (obligatoire).
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');

const ALLOWED_ORIGINS = [
  'https://align-app.fr',
  'https://www.align-app.fr',
];

function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const origin = parsed.origin;
    if (ALLOWED_ORIGINS.includes(origin)) return true;
    if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return true;
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return true;
    return false;
  } catch {
    return false;
  }
}

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

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return new Response(JSON.stringify({ ok: false, error: 'config' }), { status: 500, headers: jsonHeaders });
    }
    if (!STRIPE_SECRET_KEY) {
      return new Response(JSON.stringify({ ok: false, error: 'stripe_config' }), { status: 500, headers: jsonHeaders });
    }

    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user?.id) {
      return new Response(JSON.stringify({ ok: false, error: 'invalid_token' }), { status: 401, headers: jsonHeaders });
    }

    console.log('[SUB_PORTAL] open_start', { userId: user.id });

    const DEFAULT_RETURN = 'https://align-app.fr';
    let returnUrl = DEFAULT_RETURN;
    try {
      const body = await req.json().catch(() => ({}));
      if (body?.returnUrl && typeof body.returnUrl === 'string' && isAllowedUrl(body.returnUrl)) {
        returnUrl = body.returnUrl;
      }
    } catch {
      // use default returnUrl
    }

    const { data: subRow, error: subError } = await authClient
      .from('subscriptions')
      .select('stripe_customer_id, stripe_subscription_id, premium_access, status, current_period_end')
      .eq('user_id', user.id)
      .maybeSingle();

    if (subError || !subRow) {
      console.log('[SUB_PORTAL] no_active_subscription', { userId: user.id, reason: subError ? 'db_error' : 'no_row' });
      return new Response(JSON.stringify({ ok: false, error: 'no_subscription' }), { status: 404, headers: jsonHeaders });
    }

    const nowIso = new Date().toISOString();
    const status = (subRow.status as string) || 'canceled';
    const currentEnd = subRow.current_period_end as string | null;
    const premium = subRow.premium_access === true ||
      status === 'active' ||
      status === 'trialing' ||
      (status === 'canceled' && !!currentEnd && currentEnd > nowIso);

    if (!premium) {
      console.log('[SUB_PORTAL] no_active_subscription', { userId: user.id, reason: 'premium_false', status, currentEnd });
      return new Response(JSON.stringify({ ok: false, error: 'no_subscription' }), { status: 404, headers: jsonHeaders });
    }

    let customerId = subRow.stripe_customer_id as string | null;

    // Si on n'a pas encore de customer_id mais qu'on a une subscription, le récupérer via Stripe
    if (!customerId && subRow.stripe_subscription_id) {
      const subId = subRow.stripe_subscription_id as string;
      const subRes = await fetch(`https://api.stripe.com/v1/subscriptions/${subId}`, {
        headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
      });
      if (subRes.ok) {
        const subJson = await subRes.json();
        customerId = subJson.customer as string | null;
        if (customerId) {
          await authClient
            .from('subscriptions')
            .update({ stripe_customer_id: customerId })
            .eq('user_id', user.id);
        }
      }
    }

    if (!customerId) {
      console.log('[SUB_PORTAL] no_active_subscription', { userId: user.id, reason: 'no_customer_id' });
      return new Response(JSON.stringify({ ok: false, error: 'no_subscription' }), { status: 404, headers: jsonHeaders });
    }

    console.log('[SUB_PORTAL] active_subscription_found', {
      userId: user.id,
      hasCustomerId: !!customerId,
      hasSubscriptionId: !!subRow.stripe_subscription_id,
      status,
      currentEnd,
    });

    const params = new URLSearchParams();
    params.set('customer', customerId);
    params.set('return_url', returnUrl);

    const stripeRes = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!stripeRes.ok) {
      const errText = await stripeRes.text();
      console.error('[stripe-create-portal] Stripe error:', stripeRes.status, errText);
      return new Response(JSON.stringify({ ok: false, error: 'stripe_error' }), { status: 502, headers: jsonHeaders });
    }

    const session = await stripeRes.json();
    const url = session.url;
    if (!url) {
      console.error('[stripe-create-portal] No url in session:', session);
      return new Response(JSON.stringify({ ok: false, error: 'stripe_error' }), { status: 502, headers: jsonHeaders });
    }

    console.log('[SUB_PORTAL] portal_session_created', { userId: user.id, redirect_url: url });

    return new Response(JSON.stringify({ ok: true, url }), { status: 200, headers: jsonHeaders });
  } catch (e) {
    console.error('[stripe-create-portal]', (e as Error)?.message ?? e);
    return new Response(JSON.stringify({ ok: false, error: 'server_error' }), { status: 500, headers: jsonHeaders });
  }
});
