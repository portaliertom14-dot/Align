/**
 * Edge Function : création d'une Stripe Checkout Session (mode abonnement).
 * Body : { plan: 'monthly' | 'yearly', successUrl?: string, cancelUrl?: string }.
 * Le client peut passer ses propres URLs (localhost ou prod) ; elles sont validées.
 * Retourne { url } pour rediriger le client vers Stripe Checkout.
 *
 * Secrets : STRIPE_SECRET_KEY (obligatoire).
 * Optionnel : STRIPE_PRICE_ID_MONTHLY, STRIPE_PRICE_ID_YEARLY.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
// Price Stripe pour l'accès à vie (paiement unique 9€).
// Doit être défini dans les secrets Supabase : STRIPE_PRICE_ID_LIFETIME = price_xxx
const STRIPE_PRICE_ID_LIFETIME = Deno.env.get('STRIPE_PRICE_ID_LIFETIME') || '';

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
    if (!STRIPE_SECRET_KEY || !STRIPE_PRICE_ID_LIFETIME) {
      return new Response(JSON.stringify({ ok: false, error: 'stripe_config' }), { status: 500, headers: jsonHeaders });
    }

    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user?.id) {
      return new Response(JSON.stringify({ ok: false, error: 'invalid_token' }), { status: 401, headers: jsonHeaders });
    }

    let body: { plan?: string; successUrl?: string; cancelUrl?: string };
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ ok: false, error: 'invalid_body' }), { status: 400, headers: jsonHeaders });
    }
    // Plan logique uniquement pour les logs (legacy ou 'lifetime'). La tarification est pilotée par STRIPE_PRICE_ID_LIFETIME.
    const plan = body.plan === 'lifetime' ? 'lifetime' : (body.plan === 'yearly' ? 'yearly' : 'monthly');

    // URLs du client validées ou fallback vers production
    const DEFAULT_BASE = 'https://align-app.fr';
    let successUrl = `${DEFAULT_BASE}/resultat-metier?checkout=success`;
    let cancelUrl = `${DEFAULT_BASE}/paywall?checkout=cancel`;

    if (body.successUrl && isAllowedUrl(body.successUrl)) {
      successUrl = body.successUrl;
    }
    if (body.cancelUrl && isAllowedUrl(body.cancelUrl)) {
      cancelUrl = body.cancelUrl;
    }

    // Ajouter {CHECKOUT_SESSION_ID} pour permettre la vérification côté client si nécessaire
    if (!successUrl.includes('session_id')) {
      const sep = successUrl.includes('?') ? '&' : '?';
      successUrl = `${successUrl}${sep}session_id={CHECKOUT_SESSION_ID}`;
    }

    const params = new URLSearchParams();
    // Paiement unique pour l'accès à vie (9€) — mode=payment avec price Stripe dédié.
    params.set('mode', 'payment');
    params.set('line_items[0][price]', STRIPE_PRICE_ID_LIFETIME);
    params.set('line_items[0][quantity]', '1');
    params.set('success_url', successUrl);
    params.set('cancel_url', cancelUrl);
    params.set('client_reference_id', user.id);
    if (user.email) params.set('customer_email', user.email);

    console.log('[CHECKOUT_CREATE]', JSON.stringify({
      userId: user.id,
      email: user.email ?? null,
      plan,
      successUrl,
      cancelUrl,
    }));

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!stripeRes.ok) {
      const errText = await stripeRes.text();
      console.error('[stripe-create-checkout] Stripe error:', stripeRes.status, errText);
      return new Response(JSON.stringify({ ok: false, error: 'stripe_error' }), { status: 502, headers: jsonHeaders });
    }

    const session = await stripeRes.json();
    const url = session.url;
    if (!url) {
      console.error('[stripe-create-checkout] No url in session:', session);
      return new Response(JSON.stringify({ ok: false, error: 'stripe_error' }), { status: 502, headers: jsonHeaders });
    }

    return new Response(JSON.stringify({ ok: true, url }), { status: 200, headers: jsonHeaders });
  } catch (e) {
    console.error('[stripe-create-checkout]', (e as Error)?.message ?? e);
    return new Response(JSON.stringify({ ok: false, error: 'server_error' }), { status: 500, headers: jsonHeaders });
  }
});
