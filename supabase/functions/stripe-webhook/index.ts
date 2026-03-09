/**
 * Edge Function : webhook Stripe pour sécuriser la validation des paiements.
 * Vérifie la signature (Stripe-Signature), traite checkout.session.completed
 * et customer.subscription.updated / deleted. Met à jour la table subscriptions.
 *
 * IMPORTANT : configurer l'URL de cette fonction dans le Dashboard Stripe (Webhooks)
 * et utiliser le secret fourni (whsec_...) dans STRIPE_WEBHOOK_SECRET.
 *
 * Secrets : STRIPE_WEBHOOK_SECRET, STRIPE_SECRET_KEY, STRIPE_PRICE_ID_MONTHLY,
 * STRIPE_PRICE_ID_YEARLY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET');
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
const STRIPE_PRICE_ID_MONTHLY = Deno.env.get('STRIPE_PRICE_ID_MONTHLY') || 'price_1T82lKRo55AOuAdn6lQlLxAo';
const STRIPE_PRICE_ID_YEARLY = Deno.env.get('STRIPE_PRICE_ID_YEARLY') || 'price_1T82mDRo55AOuAdn27lzYld6';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

/** Vérifie la signature Stripe (HMAC SHA256). signed_payload = timestamp + '.' + body (Stripe doc). */
async function verifyStripeSignature(payload: string, signatureHeader: string, secret: string): Promise<boolean> {
  const parts = signatureHeader.split(',').map((s) => s.trim());
  let timestamp = '';
  const sigs: string[] = [];
  for (const part of parts) {
    const eq = part.indexOf('=');
    const prefix = eq >= 0 ? part.slice(0, eq) : '';
    const value = eq >= 0 ? part.slice(eq + 1) : '';
    if (prefix === 't') timestamp = value;
    if (prefix === 'v1') sigs.push(value.toLowerCase());
  }
  if (!timestamp || sigs.length === 0) return false;
  const signedPayload = `${payload}.${timestamp}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload));
  const expectedHex = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return sigs.some((s) => s.length === expectedHex.length && timingSafeEqual(s, expectedHex));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

/** Déduire le plan depuis le price_id Stripe */
function planFromPriceId(priceId: string): 'monthly' | 'yearly' {
  if (priceId === STRIPE_PRICE_ID_YEARLY) return 'yearly';
  return 'monthly';
}

/** Statuts Stripe qui conservent l'accès premium (tant que la période en cours n'est pas expirée) */
const ACTIVE_STATUSES = ['active', 'trialing'];

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  if (!STRIPE_WEBHOOK_SECRET || !STRIPE_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[stripe-webhook] Missing config');
    return new Response('Internal Error', { status: 500 });
  }

  const rawBody = await req.text();
  const sigHeader = req.headers.get('Stripe-Signature') ?? '';
  if (!(await verifyStripeSignature(rawBody, sigHeader, STRIPE_WEBHOOK_SECRET))) {
    console.warn('[stripe-webhook] Invalid signature');
    return new Response('Invalid signature', { status: 400 });
  }

  let event: { type: string; data?: { object?: Record<string, unknown> } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data?.object as Record<string, unknown>;
      const userId = session?.client_reference_id as string | undefined;
      const customerId = session?.customer as string | undefined;
      const subscriptionId = session?.subscription as string | undefined;
      if (!userId || !subscriptionId) {
        console.warn('[stripe-webhook] checkout.session.completed missing user or subscription');
        return new Response('OK', { status: 200 });
      }
      const subRes = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
        headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
      });
      if (!subRes.ok) {
        console.error('[stripe-webhook] Failed to fetch subscription:', await subRes.text());
        return new Response('OK', { status: 200 });
      }
      const sub = await subRes.json();
      const items = sub?.items?.data ?? [];
      const priceId = items[0]?.price?.id ?? '';
      const plan = planFromPriceId(priceId);
      const currentPeriodStart = sub.current_period_start ? new Date(sub.current_period_start * 1000).toISOString() : null;
      const currentPeriodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;
      const status = (sub.status ?? 'active') as string;
      const nowIso = new Date().toISOString();
      const premiumAccess =
        ACTIVE_STATUSES.includes(status) ||
        (status === 'canceled' && !!currentPeriodEnd && currentPeriodEnd > nowIso);

      await supabase.from('subscriptions').upsert(
        {
          user_id: userId,
          stripe_customer_id: customerId ?? null,
          stripe_subscription_id: subscriptionId,
          plan,
          status,
          current_period_start: currentPeriodStart,
          current_period_end: currentPeriodEnd,
          premium_access: premiumAccess,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
    } else if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const sub = event.data?.object as Record<string, unknown>;
      const subscriptionId = sub?.id as string | undefined;
      if (!subscriptionId) {
        return new Response('OK', { status: 200 });
      }
      const status = (sub?.status ?? 'canceled') as string;
      const currentPeriodStart = sub?.current_period_start ? new Date((sub.current_period_start as number) * 1000).toISOString() : null;
      const currentPeriodEnd = sub?.current_period_end ? new Date((sub.current_period_end as number) * 1000).toISOString() : null;
      const nowIso = new Date().toISOString();
      const premiumAccess =
        ACTIVE_STATUSES.includes(status) ||
        (status === 'canceled' && !!currentPeriodEnd && currentPeriodEnd > nowIso);
      const items = (sub?.items?.data ?? []) as Array<{ price?: { id?: string } }>;
      const priceId = items[0]?.price?.id ?? '';
      const plan = planFromPriceId(priceId);

      const { data: rows } = await supabase.from('subscriptions').select('id').eq('stripe_subscription_id', subscriptionId).limit(1);
      if (rows?.length) {
        await supabase
          .from('subscriptions')
          .update({
            status,
            premium_access: premiumAccess,
            current_period_start: currentPeriodStart,
            current_period_end: currentPeriodEnd,
            plan,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscriptionId);
      }
    }
  } catch (e) {
    console.error('[stripe-webhook]', (e as Error)?.message ?? e);
    return new Response('Internal Error', { status: 500 });
  }

  return new Response('OK', { status: 200 });
});
