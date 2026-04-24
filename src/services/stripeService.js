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
import { POST_PAYMENT_RESUME_STATE, isPostPaywallResumePayload } from '../navigation/postPaywallResumeGate';

const PREMIUM_CACHE_KEY = (userId) => `premium_access_${userId || ''}`;

const EDGE_CREATE_CHECKOUT = 'stripe-create-checkout';
const PAYWALL_BYPASS_EMAILS = new Set([
  'portaliertom@gmail.com',
  'portalier.tom@gmail.com',
  'portaliertom.gmail.com',
]);

function normalizeEmailForBypass(value) {
  if (!value || typeof value !== 'string') return '';
  return value.toLowerCase().replace(/\s+/g, '').trim();
}

function isPaywallBypassEmail(email) {
  const normalized = normalizeEmailForBypass(email);
  return PAYWALL_BYPASS_EMAILS.has(normalized);
}

/**
 * Écrit le cache premium avec horodatage (hint local après succès checkout / DB positive).
 */
async function setPremiumCacheWithTimestamp(userId, value) {
  try {
    await AsyncStorage.setItem(
      PREMIUM_CACHE_KEY(userId),
      JSON.stringify({ v: value ? 'true' : 'false', ts: Date.now() })
    );
  } catch (_) {}
}

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
 * Plan attendu : 'lifetime' (paiement unique 9€).
 * @param {'lifetime' | 'monthly' | 'yearly'} plan
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
        // Le backend gère désormais un produit "lifetime" unique ; on transmet le plan logique pour les logs.
        plan,
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
 * Indique si l'utilisateur connecté a un accès premium actif.
 * Vérifie : 1) subscriptions.premium_access (abonnement), 2) user_profiles.is_premium (paiement unique / accès à vie).
 * Si l'une des deux est true, l'utilisateur est premium (régénération autorisée sans redirection Paywall).
 * Si le paywall est désactivé (feature flag), retourne toujours true (flux gratuit).
 * @returns {Promise<boolean>}
 */
export async function hasPremiumAccess() {
  if (!isPaywallEnabled()) return true;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return false;
    if (isPaywallBypassEmail(user.email)) return true;

    const { data: subData, error: subError } = await supabase
      .from('subscriptions')
      .select('premium_access')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!subError && !!subData?.premium_access) return true;

    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      // On sélectionne large pour éviter une erreur 400 si la colonne is_premium
      // n'est pas encore présente sur certains environnements.
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (!profileError && profileData && typeof profileData.is_premium === 'boolean' && profileData.is_premium) {
      return true;
    }

    return false;
  } catch (e) {
    if (__DEV__) console.warn('[stripeService] hasPremiumAccess exception:', e);
    return false;
  }
}

/**
 * Garde main feed / paywall : uniquement user_profiles.is_premium === true, vérifié côté Postgres.
 * 1) RPC SECURITY DEFINER get_main_feed_premium_allowed() (auth.uid() — pas d’user_id client falsifiable).
 * 2) Fallback SELECT is_premium si la migration RPC n’est pas encore appliquée.
 * Aucun cache : erreur réseau / DB → false (accès refusé).
 * @returns {Promise<boolean>}
 */
export async function fetchMainFeedPremiumFromSupabaseStrict() {
  if (!isPaywallEnabled()) return true;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return false;
    if (isPaywallBypassEmail(user.email)) return true;

    const { data: rpcData, error: rpcError } = await supabase.rpc('get_main_feed_premium_allowed');
    if (!rpcError && typeof rpcData === 'boolean') {
      if (__DEV__) console.log('[MAIN_FEED_PREMIUM] source=rpc value=' + rpcData);
      return rpcData === true;
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .select('is_premium')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      if (__DEV__) console.warn('[MAIN_FEED_PREMIUM] source=select error', error?.message ?? error);
      return false;
    }
    const ok = data?.is_premium === true;
    if (__DEV__) console.log('[MAIN_FEED_PREMIUM] source=select value=' + ok);
    return ok;
  } catch (e) {
    if (__DEV__) console.warn('[MAIN_FEED_PREMIUM] exception', e?.message ?? e);
    return false;
  }
}

/**
 * Source de vérité unique pour l'accès premium (parcours initial, régénération, refresh, retour Stripe).
 * Priorité : toujours la DB (subscriptions + user_profiles.is_premium). Nouveaux utilisateurs sans ligne = false.
 * En cas d’erreur API : accès refusé (plus de cache client pouvant ouvrir le feed sans paiement).
 * @returns {Promise<{ hasAccess: boolean, source: 'db' | 'feature_off' | 'no_user' | 'db_error' }>}
 */
export async function getPremiumAccessState() {
  if (!isPaywallEnabled()) {
    if (__DEV__) console.log('[SUB_STATUS] source=feature_off premium=true');
    return { hasAccess: true, source: 'feature_off' };
  }
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;
    if (!userId) {
      if (__DEV__) console.log('[SUB_STATUS] source=no_user premium=false');
      return { hasAccess: false, source: 'no_user' };
    }

    // 1) Toujours vérifier la DB en priorité (subscriptions + user_profiles.is_premium ; pas de ligne = false)
    let access;
    try {
      access = await hasPremiumAccess();
    } catch (dbErr) {
      if (__DEV__) console.warn('[stripeService] getPremiumAccessState DB error', dbErr?.message ?? dbErr);
      if (__DEV__) console.log('[SUB_STATUS] source=db_error premium=false (no cache)');
      return { hasAccess: false, source: 'db_error' };
    }

    if (access) {
      await setPremiumCacheWithTimestamp(userId, true);
      if (__DEV__) console.log('[SUB_STATUS] source=db premium=true');
      return { hasAccess: true, source: 'db' };
    }

    await AsyncStorage.removeItem(PREMIUM_CACHE_KEY(userId)).catch(() => {});
    if (__DEV__) console.log('[SUB_STATUS] source=db premium=false');
    return { hasAccess: false, source: 'db' };
  } catch (e) {
    if (__DEV__) console.warn('[stripeService] getPremiumAccessState exception:', e?.message ?? e);
    if (__DEV__) console.log('[SUB_STATUS] source=db_error premium=false (exception, no cache)');
    return { hasAccess: false, source: 'db_error' };
  }
}

/**
 * Persiste un hint local après checkout (utile pour UX post-Stripe) — n’ouvre plus le feed sans confirmation DB.
 * À appeler après retour Stripe / PaywallSuccess.
 */
export async function setPremiumAccessCacheTrue() {
  if (!isPaywallEnabled()) return;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
      await setPremiumCacheWithTimestamp(user.id, true);
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

const EDGE_CREATE_PORTAL = 'stripe-create-portal';

/**
 * Obtient l'URL du portail client Stripe (gestion / annulation abonnement) et l'ouvre.
 * @param {string} [returnUrl] - URL de retour après fermeture du portail (optionnel).
 * @returns {Promise<{ url?: string } | { error: string }>}
 */
export async function getCustomerPortalUrl(returnUrl) {
  try {
    if (typeof console !== 'undefined' && console.log) {
      console.log('[SUBSCRIPTION] open_customer_portal');
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      return { error: 'Non connecté' };
    }

    const body = returnUrl ? { returnUrl } : {};

    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!supabaseUrl || !token) {
        return { error: 'Impossible d\'ouvrir le portail. Réessaie.' };
      }

      const portalUrl = `${supabaseUrl.replace(/\/$/, '')}/functions/v1/${EDGE_CREATE_PORTAL}`;
      const res = await fetch(portalUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));

      if (res.ok && json?.url) {
        if (typeof console !== 'undefined' && console.log) {
          console.log('[SUBSCRIPTION] portal_url_opened');
        }
        return { url: json.url };
      }

      if (json?.error === 'no_subscription') {
        return { error: 'Aucun abonnement actif.' };
      }

      return { error: 'Impossible d\'ouvrir le portail. Réessaie.' };
    } catch (err) {
      if (__DEV__) console.warn('[stripeService] getCustomerPortalUrl fetch exception:', err);
      return { error: 'Impossible d\'ouvrir le portail. Réessaie.' };
    }
  } catch (e) {
    if (__DEV__) console.warn('[stripeService] getCustomerPortalUrl exception:', e);
    return { error: (e && e.message) || 'Erreur inattendue. Réessaie.' };
  }
}

/**
 * Persiste un état de reprise post-paywall (source de vérité DB, multi-session/multi-device).
 * Idempotent: overwrite same state/payload for the current user.
 */
export async function savePostPaywallResumeState(payload) {
  try {
    if (!isPostPaywallResumePayload(payload)) {
      return { ok: false, error: 'invalid_payload' };
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return { ok: false, error: 'no_user' };

    const patch = {
      resume_state: POST_PAYMENT_RESUME_STATE,
      resume_payload: payload,
      resume_updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from('user_profiles')
      .update(patch)
      .eq('id', user.id);

    if (error) {
      console.warn('[POST_PAYWALL_RESUME_WRITE]', JSON.stringify({ ok: false, userId: user.id, error: error.message }));
      return { ok: false, error: error.message || 'db_error' };
    }
    console.log('[POST_PAYWALL_RESUME_WRITE]', JSON.stringify({ ok: true, userId: user.id, resume_state: POST_PAYMENT_RESUME_STATE }));
    return { ok: true };
  } catch (e) {
    console.warn('[POST_PAYWALL_RESUME_WRITE]', JSON.stringify({ ok: false, error: e?.message || String(e) }));
    return { ok: false, error: e?.message || 'exception' };
  }
}

/**
 * Lit l'état de reprise post-paywall en DB.
 */
export async function fetchPostPaywallResumeState() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return { ok: true, resumeState: null, resumePayload: null };

    const { data, error } = await supabase
      .from('user_profiles')
      .select('resume_state, resume_payload, resume_updated_at')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      console.warn('[POST_PAYWALL_RESUME_READ]', JSON.stringify({ ok: false, userId: user.id, error: error.message }));
      return { ok: false, error: error.message || 'db_error', resumeState: null, resumePayload: null };
    }
    console.log('[POST_PAYWALL_RESUME_READ]', JSON.stringify({
      ok: true,
      userId: user.id,
      resumeState: data?.resume_state ?? null,
      hasPayload: data?.resume_payload != null,
      resumeUpdatedAt: data?.resume_updated_at ?? null,
    }));
    return {
      ok: true,
      resumeState: data?.resume_state ?? null,
      resumePayload: data?.resume_payload ?? null,
    };
  } catch (e) {
    console.warn('[POST_PAYWALL_RESUME_READ]', JSON.stringify({ ok: false, error: e?.message || String(e) }));
    return { ok: false, error: e?.message || 'exception', resumeState: null, resumePayload: null };
  }
}

/**
 * Nettoyage one-shot après reprise réussie.
 */
export async function clearPostPaywallResumeState() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return { ok: false, error: 'no_user' };

    const { error } = await supabase
      .from('user_profiles')
      .update({
        resume_state: null,
        resume_payload: null,
        resume_updated_at: null,
      })
      .eq('id', user.id);

    if (error) {
      console.warn('[POST_PAYWALL_RESUME_CLEAR]', JSON.stringify({ ok: false, userId: user.id, error: error.message }));
      return { ok: false, error: error.message || 'db_error' };
    }
    console.log('[POST_PAYWALL_RESUME_CLEAR]', JSON.stringify({ ok: true, userId: user.id }));
    return { ok: true };
  } catch (e) {
    console.warn('[POST_PAYWALL_RESUME_CLEAR]', JSON.stringify({ ok: false, error: e?.message || String(e) }));
    return { ok: false, error: e?.message || 'exception' };
  }
}
