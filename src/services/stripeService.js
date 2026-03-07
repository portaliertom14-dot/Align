/**
 * Service Stripe — Checkout (abonnements) et statut premium.
 * Le backend (Edge Function stripe-create-checkout) crée une session et renvoie session.url.
 * Le frontend redirige vers cette URL (window.location.href ou Linking.openURL) — pas de loadStripe ni redirectToCheckout.
 * Mode test : le backend doit utiliser STRIPE_SECRET_KEY=sk_test_... (Supabase Secrets).
 * La clé publishable (EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY) est optionnelle ; utilisée uniquement pour vérifier le mode en dev.
 */

import { supabase } from './supabase';
import { isPaywallEnabled } from '../config/appConfig';

const EDGE_CREATE_CHECKOUT = 'stripe-create-checkout';

// Vérification en dev : s'assurer que la clé publishable est en mode test (pk_test_)
if (typeof __DEV__ !== 'undefined' && __DEV__) {
  const key = typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (key && typeof key === 'string') {
    if (key.startsWith('pk_test_')) {
      console.log('[stripeService] Stripe key (test):', key.slice(0, 12) + '...');
    } else {
      console.warn('[stripeService] Stripe key does not start with pk_test_. For test cards use pk_test_... and STRIPE_SECRET_KEY=sk_test_... in Supabase Secrets.');
    }
  }
}

/**
 * Détermine l'URL de base selon l'environnement (localhost vs production).
 */
function getBaseUrl() {
  if (typeof window !== 'undefined' && window.location) {
    const { protocol, hostname, port } = window.location;
    // Localhost ou dev
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      const portPart = port ? `:${port}` : '';
      return `${protocol}//${hostname}${portPart}`;
    }
    // Production
    return `${protocol}//${hostname}`;
  }
  // Fallback
  return 'https://align-app.fr';
}

/**
 * Crée une session Stripe Checkout pour le plan choisi.
 * Utilisateur doit être connecté (JWT envoyé automatiquement par invoke).
 * Envoie les URLs de redirection basées sur l'environnement actuel (localhost ou production).
 * @param {'monthly' | 'yearly'} plan
 * @returns {{ url: string } | { error: string }}
 */
export async function createCheckoutSession(plan) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      return { error: 'Non connecté' };
    }

    const baseUrl = getBaseUrl();
    const successUrl = `${baseUrl}/resultat-metier?checkout=success`;
    const cancelUrl = `${baseUrl}/paywall?checkout=cancel`;

    if (__DEV__) {
      console.log('[stripeService] Using URLs:', { successUrl, cancelUrl });
    }

    const { data, error } = await supabase.functions.invoke(EDGE_CREATE_CHECKOUT, {
      body: {
        plan: plan === 'yearly' ? 'yearly' : 'monthly',
        successUrl,
        cancelUrl,
      },
    });

    if (error) {
      if (__DEV__) console.warn('[stripeService] createCheckout error:', error.message);
      return { error: error.message || 'Erreur réseau' };
    }

    if (!data?.ok || !data?.url) {
      const msg = data?.error === 'invalid_token' ? 'Session expirée' : data?.error || 'Impossible de créer la session';
      return { error: msg };
    }

    return { url: data.url };
  } catch (e) {
    if (__DEV__) console.warn('[stripeService] createCheckout exception:', e);
    return { error: (e && e.message) || 'Erreur inattendue' };
  }
}

/**
 * Indique si l'utilisateur connecté a un accès premium actif (abonnement payé et non expiré).
 * Lecture depuis la table subscriptions (RLS : l'utilisateur ne voit que sa ligne).
 * Si le paywall est désactivé (feature flag), retourne toujours true (flux gratuit).
 * @returns {Promise<boolean>}
 */
export async function hasPremiumAccess() {
  if (!isPaywallEnabled()) return true;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return false;

    const { data, error } = await supabase
      .from('subscriptions')
      .select('premium_access')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      if (__DEV__) console.warn('[stripeService] hasPremiumAccess error:', error.message);
      return false;
    }
    return !!data?.premium_access;
  } catch (e) {
    if (__DEV__) console.warn('[stripeService] hasPremiumAccess exception:', e);
    return false;
  }
}

/**
 * Récupère le statut d'abonnement de l'utilisateur (pour afficher "Gérer mon abonnement" / annulation).
 * @returns {Promise<{ premium_access: boolean, status?: string, stripe_subscription_id?: string, plan?: string } | null>}
 */
export async function getSubscriptionStatus() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return null;

    const { data, error } = await supabase
      .from('subscriptions')
      .select('premium_access, status, stripe_subscription_id, plan, current_period_end')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error || !data) return null;
    return data;
  } catch (e) {
    if (__DEV__) console.warn('[stripeService] getSubscriptionStatus exception:', e);
    return null;
  }
}
