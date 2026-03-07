# Intégration Stripe — Paywall Align

## Fichiers modifiés / ajoutés

| Fichier | Rôle |
|--------|------|
| `supabase/migrations/20260305000000_CREATE_SUBSCRIPTIONS_STRIPE.sql` | Table `subscriptions` + RLS + trigger `updated_at` |
| `supabase/functions/stripe-create-checkout/index.ts` | Edge : création session Stripe Checkout (abonnement), retourne `url` |
| `supabase/functions/stripe-webhook/index.ts` | Edge : webhook Stripe (signature, `checkout.session.completed`, `customer.subscription.updated/deleted`) |
| `supabase/functions/delete-my-account/index.ts` | Suppression de la ligne `subscriptions` pour l’user (RGPD) |
| `src/services/stripeService.js` | `createCheckoutSession(plan)`, `hasPremiumAccess()`, `getSubscriptionStatus()` |
| `src/screens/Paywall/index.js` | CTA modal → Stripe Checkout, stockage payload en sessionStorage, prix 2,16€/mo et 26€/an |
| `src/screens/PaywallSuccess/index.js` | Écran de retour post-paiement → lecture payload → `replace('ResultJob', payload)` |
| `src/screens/ResultJob/index.js` | Guard premium : `hasPremiumAccess()` ; si faux → `replace('Paywall', { resultJobPayload })` |
| `src/navigation/RootGate.js` | Écran `PaywallSuccess` dans AuthStack et AppStack |
| `src/app/navigation.js` | Linking `PaywallSuccess: 'paywall/success'`, `ResultatMetier: 'resultat-metier'` |

---

## Configuration Checkout (align-app.fr)

- **success_url** : `https://align-app.fr/resultat-metier?success=true`
- **cancel_url** : `https://align-app.fr/paywall?cancel=true`
- **Plans** : mensuel `price_1T82lKRo55AOuAdn6lQlLxAo` (4,99€/mois), annuel `price_1T82mDRo55AOuAdn27lzYld6` (26€/an)

Ces valeurs sont en dur dans le code ; `WEB_URL` (ou `WEB_URL_PROD`) permet de surcharger la base (ex. en dev).

---

## Variables d’environnement

### Backend (Edge Functions — secrets Supabase)

| Secret | Obligatoire | Description |
|--------|-------------|-------------|
| `STRIPE_SECRET_KEY` | Oui | Clé secrète Stripe (sk_live_… ou sk_test_…) |
| `STRIPE_WEBHOOK_SECRET` | Pour webhook | Secret du webhook (whsec_…) |
| `STRIPE_PRICE_ID_MONTHLY` | Non | Défaut : `price_1T82lKRo55AOuAdn6lQlLxAo` |
| `STRIPE_PRICE_ID_YEARLY` | Non | Défaut : `price_1T82mDRo55AOuAdn27lzYld6` |
| `WEB_URL` | Non | Base URL (défaut : https://align-app.fr) pour success_url / cancel_url |

### Frontend (optionnel — projet Expo)

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Clé publique Stripe en **test** : `pk_test_...`. Permet de vérifier en dev (console) qu’on est bien en mode test. Le frontend ne fait pas d’appel Stripe direct : il redirige vers `session.url` renvoyé par le backend. |

*(En Next.js la variable équivalente serait `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` ; ce projet utilise Expo.)*

---

## Mode test — cartes de test (4242 4242 4242 4242)

L’erreur **« Votre carte a été refusée car vous êtes en mode production »** vient du **backend** : la clé secrète utilisée par l’Edge Function est une clé **live** (`sk_live_...`).

- **Pour utiliser les cartes de test** : dans Supabase → Edge Functions → Secrets, définir **`STRIPE_SECRET_KEY`** avec une clé **test** : `sk_test_...` (récupérée dans Stripe Dashboard → Développeurs → Clés API, onglet « Clés de test »).
- Le frontend n’envoie aucune clé Stripe ; il appelle l’edge puis redirige vers l’URL de Checkout. C’est donc bien **STRIPE_SECRET_KEY** (sk_test_ ou sk_live_) qui détermine le mode.
- En dev, si `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...` est défini dans `.env` ou `.env.local`, un `console.log` au chargement du service affiche que la clé utilisée commence par `pk_test_`.

Les secrets Supabase existants (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`) restent requis pour les edges.

---

## Webhook Stripe

1. **Stripe Dashboard → Développeurs → Webhooks → Ajouter un endpoint.**
2. **URL** :  
   `https://<PROJECT_REF>.supabase.co/functions/v1/stripe-webhook`  
   (remplacer `<PROJECT_REF>` par l’ID du projet Supabase).
3. **Événements à écouter** :
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Récupérer le **Signing secret** (whsec_…) et le mettre dans `STRIPE_WEBHOOK_SECRET`.

En local avec Stripe CLI :  
`stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook`  
et utiliser le secret affiché (préfixé `whsec_`) pour les tests.

---

## Migration SQL

À exécuter une seule fois (Supabase SQL Editor ou `supabase db push`) :

- Fichier : `supabase/migrations/20260305000000_CREATE_SUBSCRIPTIONS_STRIPE.sql`

Crée la table `public.subscriptions` (user_id, stripe_customer_id, stripe_subscription_id, plan, status, current_period_start/end, premium_access, created_at, updated_at), les index, la RLS (SELECT pour l’user sur sa ligne) et le trigger `updated_at`.

Aucune autre migration SQL n’est requise pour cette intégration.

---

## Flux résumé

1. Utilisateur sur **Paywall** → choisit Annuel/Mensuel dans le modal → « DÉBLOQUER MA DIRECTION MAINTENANT ».
2. Paywall enregistre `resultJobPayload` en sessionStorage, appelle l’edge `stripe-create-checkout` avec `plan: 'yearly' | 'monthly'`, reçoit `url` et redirige vers **Stripe Checkout**.
3. Après paiement : Stripe redirige vers `https://align-app.fr/resultat-metier?success=true` → écran **ResultatMetier** (même logique que PaywallSuccess) lit le payload, supprime la clé sessionStorage, puis `navigation.replace('ResultJob', payload)`. Si annulé : `https://align-app.fr/paywall?cancel=true`.
4. Stripe envoie `checkout.session.completed` au **webhook** → upsert dans `subscriptions` (premium_access = true).
5. **ResultJob** : au montage, `hasPremiumAccess()` ; si faux → `replace('Paywall', { resultJobPayload })` ; si vrai → affichage du résultat métier.

Annulation / échec : `customer.subscription.updated` ou `customer.subscription.deleted` met à jour le statut et `premium_access` en base. Pas de clé secrète côté client ; la décision premium repose sur le webhook.

---

## Gérer / annuler l’abonnement (base technique)

Le service expose `getSubscriptionStatus()` (premium_access, status, stripe_subscription_id, plan, current_period_end).  
Pour un bouton « Gérer mon abonnement » ou « Annuler » : ouvrir le **Customer portal Stripe** avec l’URL générée côté backend (Stripe Billing Portal) en utilisant `stripe_customer_id` stocké en base, ou appeler l’API Stripe pour créer une session de portail et rediriger l’utilisateur. La base technique (subscription_id, customer_id, statut) est en place.
