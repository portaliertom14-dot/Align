# Déployer tout en production

Guide pour mettre en prod l’app web Align et le backend Supabase.

---

## Prérequis

- **Supabase** : projet créé, URL + clé anon notées.
- **Vercel** (ou autre) : compte pour héberger le web.
- **CLI** : Node.js, npm, et [Supabase CLI](https://supabase.com/docs/guides/cli) installés.

---

## 1. Variables d’environnement production

### Côté hébergeur web (Vercel / Netlify)

Dans **Settings → Environment Variables**, définir pour **Production** :

| Variable | Obligatoire | Exemple |
|----------|-------------|---------|
| `EXPO_PUBLIC_SUPABASE_URL` | Oui | `https://xxx.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Oui | Clé anon du Dashboard Supabase |
| `EXPO_PUBLIC_WEB_URL_PROD` | Recommandé | `https://align-app.fr` ou `https://ton-site.vercel.app` |
| `EXPO_PUBLIC_SUPPORT_EMAIL` | Recommandé | Email de contact |
| `EXPO_PUBLIC_PAYWALL_ENABLED` | Optionnel | `true` pour activer le paywall |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Si Stripe | `pk_live_...` en prod |
| `EXPO_PUBLIC_CLARITY_PROJECT_ID` | Optionnel | Si Microsoft Clarity |

### Côté Supabase (Secrets des Edge Functions)

Dans **Supabase Dashboard → Edge Functions → Secrets** (ou `supabase secrets set KEY=value`) :

- `OPENAI_API_KEY` — pour analyze-sector, analyze-job, generate-dynamic-modules, etc.
- `STRIPE_SECRET_KEY` — `sk_live_...` en prod (checkout, portal, webhook)
- Toute autre clé utilisée par tes fonctions (ex. Resend pour emails).

---

## 2. Lier le projet Supabase (CLI)

En local, à la racine du projet :

```bash
cd /chemin/vers/align-app
supabase link --project-ref TON_PROJECT_REF
```

`TON_PROJECT_REF` = l’id du projet (ex. `yuqybxhqhgmeqmcpgtvw` dans l’URL Supabase).

---

## 3. Déployer les Edge Functions Supabase

Depuis la racine du projet :

```bash
# Déployer toutes les fonctions une par une
supabase functions deploy analyze-sector
supabase functions deploy analyze-job
supabase functions deploy generate-dynamic-modules
supabase functions deploy generate-feed-module
supabase functions deploy send-welcome-email
supabase functions deploy delete-my-account
supabase functions deploy stripe-create-checkout
supabase functions deploy stripe-create-portal
supabase functions deploy stripe-webhook
supabase functions deploy sector-description
supabase functions deploy job-description
supabase functions deploy refine-job-questions
supabase functions deploy refine-job-pick
supabase functions deploy rerank-job
supabase functions deploy generate-learning-templates
supabase functions deploy send-streak-reminder
supabase functions deploy retry-module
supabase functions deploy seed-modules
```

Ou utiliser les scripts déjà définis dans `package.json` :

```bash
npm run deploy:analyze-job
npm run deploy:analyze-sector
npm run supabase:deploy-feed-module
```

Les autres fonctions n’ont pas de script dédié ; les déployer avec `supabase functions deploy <nom>`.

---

## 4. Déployer l’app web

### Option A : Vercel (recommandé)

1. **Connecter le repo** (GitHub/GitLab) au projet Vercel.
2. **Build** :
   - Build Command : `npx expo export --platform web` (déjà dans `vercel.json`).
   - Output Directory : `dist` (déjà dans `vercel.json`).
3. **Variables** : ajouter les `EXPO_PUBLIC_*` en production (voir §1).
4. **Déployer** : push sur la branche reliée (ex. `main`) ou clic sur *Deploy*.

### Option B : Build local puis upload

```bash
# À la racine du projet, avec les variables d’env chargées (ex. .env)
npm run build
# ou
npm run build:web
```

Puis envoyer le contenu du dossier **`dist/`** sur ton hébergeur (FTP, SFTP, ou interface “upload static files”).  
Sur Vercel/Netlify, tu peux aussi définir la même commande de build et le dossier `dist` pour que le build soit fait par la plateforme.

---

## 5. Vérifications après déploiement

- **Web** : ouvrir l’URL de prod avec `?showVersion=1` et vérifier en console le message `[Align] build version: ...`.
- **Auth / DB** : se connecter, vérifier que les données (profil, onboarding) sont bien lues/écrites.
- **Stripe** : tester un paiement test (ou un achat réel si configuré) et vérifier le webhook.
- **Emails** : créer un compte et vérifier la réception de l’email de bienvenue (si activé).

---

## Résumé des commandes

```bash
# 1. Lier Supabase (une fois)
supabase link --project-ref TON_PROJECT_REF

# 2. Déployer les fonctions (à répéter après chaque modif des functions)
supabase functions deploy analyze-sector
supabase functions deploy analyze-job
supabase functions deploy generate-dynamic-modules
supabase functions deploy generate-feed-module
supabase functions deploy send-welcome-email
supabase functions deploy delete-my-account
supabase functions deploy stripe-create-checkout
supabase functions deploy stripe-create-portal
supabase functions deploy stripe-webhook
# … (autres fonctions listées au §3)

# 3. Build web (si déploiement manuel)
npm run build
# Puis déployer le contenu de dist/
```

Pour le web, si le repo est connecté à Vercel avec `vercel.json` et les variables définies, un **push sur la branche de prod** suffit pour déployer.
