/**
 * Service Stripe — Checkout (abonnements) et statut premium.
 * Le backend (Edge Function stripe-create-checkout) crée une session et renvoie session.url.
 * Le frontend redirige vers cette URL (window.location.href ou Linking.openURL) — pas de loadStripe ni redirectToCheckout.
 * Mode test : le backend doit utiliser STRIPE_SECRET_KEY=sk_test_... (Supabase Secrets).
 * La clé publishable (EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY) est optionnelle ; utilisée uniquement pour vérifier le mode en dev.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { isPaywallEnabled } from '../config/appConfig';

const PREMIUM_CACHE_KEY = (userId) => `premium_access_${userId || ''}`;

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

/** Messages utilisateur pour les erreurs renvoyées par l’Edge Function. */
const ERROR_MESSAGES = {
  invalid_token: 'Session expirée. Reconnecte-toi puis réessaie.',
  unauthorized: 'Tu dois être connecté pour continuer.',
  stripe_config: 'Le paiement n’est pas configuré. Réessaie plus tard.',
  stripe_error: 'Stripe ne répond pas. Réessaie dans un instant.',
  config: 'Configuration serveur manquante. Réessaie plus tard.',
  server_error: 'Erreur serveur. Réessaie dans un instant.',
};

/**
 * Crée une session Stripe Checkout pour le plan choisi.
 * Utilisateur doit être connecté (JWT envoyé automatiquement par invoke).
 * Envoie les URLs de redirection basées sur l'environnement actuel (localhost ou production).
 * @param {'monthly' | 'yearly'} plan
 * @returns {{ url: string } | { error: string }}
 */
export async function createCheckoutSession(plan) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      return { error: 'Non connecté' };
    }

    const baseUrl = getBaseUrl();
    const successUrl = `${baseUrl}/resultat-metier?checkout=success`;
    const cancelUrl = `${baseUrl}/paywall?checkout=cancel`;

    if (__DEV__) {
      console.log('[stripeService] createCheckout called', { plan, successUrl, cancelUrl });
    }

    const { data, error } = await supabase.functions.invoke(EDGE_CREATE_CHECKOUT, {
      body: {
        plan: plan === 'yearly' ? 'yearly' : 'monthly',
        successUrl,
        cancelUrl,
      },
    });

    if (error) {
      if (__DEV__) console.warn('[stripeService] createCheckout invoke error:', error.message, error);
      const backendCode = data?.error;
      let msg = backendCode && ERROR_MESSAGES[backendCode] ? ERROR_MESSAGES[backendCode] : null;
      if (!msg) {
        const em = (error.message || '').toLowerCase();
        if (em.includes('unauthorized') || em.includes('401') || em.includes('token')) msg = ERROR_MESSAGES.invalid_token;
        else msg = error.message || 'Erreur réseau. Réessaie.';
      }
      return { error: msg };
    }

    if (!data?.ok || !data?.url) {
      const code = data?.error || 'unknown';
      const msg = ERROR_MESSAGES[code] || (code === 'invalid_token' ? ERROR_MESSAGES.invalid_token : 'Impossible de créer la session. Réessaie.');
      if (__DEV__) console.warn('[stripeService] createCheckout no url', { ok: data?.ok, error: data?.error });
      return { error: msg };
    }

    if (__DEV__) console.log('[stripeService] createCheckout success, redirecting to Stripe');
    return { url: data.url };
  } catch (e) {
    if (__DEV__) console.warn('[stripeService] createCheckout exception:', e);
    return { error: (e && e.message) || 'Erreur inattendue. Réessaie.' };
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
 * Source de vérité unique pour l'accès premium (parcours initial, régénération, refresh, retour Stripe).
 * Lit la DB (subscriptions), met en cache AsyncStorage par userId ; en cas d'erreur API utilise le cache.
 * À appeler partout où on doit décider Paywall vs ResultJob / Feed.
 * @returns {Promise<{ hasAccess: boolean, source: 'db' | 'cache' | 'feature_off' | 'no_user' }>}
 */
export async function getPremiumAccessState() {
  if (!isPaywallEnabled()) {
    if (__DEV__) console.log('[ACCESS_STATE] source=feature_off value=true');
    return { hasAccess: true, source: 'feature_off' };
  }
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;
    if (!userId) {
      if (__DEV__) console.log('[ACCESS_STATE] source=no_user value=false');
      return { hasAccess: false, source: 'no_user' };
    }
    const key = PREMIUM_CACHE_KEY(userId);
    const cached = await AsyncStorage.getItem(key);
    if (cached === 'true') {
      if (__DEV__) console.log('[ACCESS_STATE] source=cache value=true (before db)');
      return { hasAccess: true, source: 'cache' };
    }
    const access = await hasPremiumAccess();
    if (access) {
      await AsyncStorage.setItem(key, 'true').catch(() => {});
    } else {
      await AsyncStorage.removeItem(key).catch(() => {});
    }
    if (__DEV__) console.log('[ACCESS_STATE] source=db value=' + access);
    return { hasAccess: access, source: 'db' };
  } catch (e) {
    if (__DEV__) console.warn('[stripeService] getPremiumAccessState exception:', e?.message ?? e);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      const key = PREMIUM_CACHE_KEY(userId);
      const cached = await AsyncStorage.getItem(key);
      const value = cached === 'true';
      if (__DEV__) console.log('[ACCESS_STATE] source=cache value=' + value + ' reason=api_error');
      return { hasAccess: value, source: 'cache' };
    } catch (_) {
      if (__DEV__) console.log('[ACCESS_STATE] source=cache value=false reason=no_user_or_storage');
      return { hasAccess: false, source: 'cache' };
    }
  }
}

/**
 * Persiste l'accès premium en cache (après checkout success, pour éviter repassage paywall si API en retard).
 * À appeler après retour Stripe / PaywallSuccess.
 */
export async function setPremiumAccessCacheTrue() {
  if (!isPaywallEnabled()) return;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
      await AsyncStorage.setItem(PREMIUM_CACHE_KEY(user.id), 'true').catch(() => {});
    }
  } catch (_) {}
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
