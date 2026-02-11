# Domaine web prod + configuration Supabase

## 1. Variables d'environnement (app)

Ne jamais hardcoder de domaine dans le code. Utiliser les variables suivantes (Expo / Vercel) :

| Variable | Exemple | Usage |
|----------|---------|--------|
| `EXPO_PUBLIC_WEB_URL_PROD` ou `WEB_URL_PROD` | `https://align-app.fr` | Domaine de production |
| `EXPO_PUBLIC_WEB_URL_PREVIEW` ou `WEB_URL_PREVIEW` | `https://align-vercel.vercel.app` | Optionnel : déploiements preview |
| `EXPO_PUBLIC_WEB_URL_DEV` ou `WEB_URL_DEV` | `http://localhost:5173` | Dev local |

L’app utilise `getWebOrigin()` (voir `src/config/webUrl.js`) pour choisir l’origine (prod / preview / dev).

---

## 2. Supabase — Auth → URL Configuration

**Dashboard** → **Authentication** → **URL Configuration** :

- **Site URL** : mettre l’URL prod (ex. `https://align-app.fr` ou `https://www.align-app.fr`), identique à `WEB_URL_PROD`.
- **Redirect URLs** : ajouter (une ligne par entrée) :
  - `https://align-app.fr/*` (ou ton domaine prod avec wildcard)
  - `http://localhost:5173/*`
  - Si tu utilises un domaine preview : `https://align-vercel.vercel.app/*` (ou équivalent)

Les liens de réinitialisation mot de passe et les redirections OAuth utiliseront ces URLs.

---

## 3. Supabase — Auth → Providers

Si tu utilises des providers OAuth (Google, etc.) : vérifier que les URI de redirection autorisées côté provider (ex. Google Cloud Console) incluent bien l’URL prod, ex. `https://align-app.fr/auth/callback` (ou le chemin utilisé par Supabase pour le callback).

---

## 4. Edge Functions — CORS (pas de `*`)

Les Edge Functions utilisent une liste d’origines autorisées (plus de `Access-Control-Allow-Origin: *`).

**Secrets à définir** (Dashboard → Project Settings → Edge Functions → Secrets) :

- Soit **ALLOWED_ORIGINS** : liste séparée par des virgules, ex.  
  `https://align-app.fr,http://localhost:5173,https://align-vercel.vercel.app`
- Soit **WEB_URL_PROD** + **WEB_URL_DEV** (et optionnellement **WEB_URL_PREVIEW**).

Le module partagé `_shared/cors.ts` lit ces variables et renvoie les en-têtes CORS en conséquence. Si aucune n’est définie, le comportement reste compatible (fallback `*`) pour ne pas casser les déploiements existants.

---

## 5. Hébergement (ex. Vercel)

- **Vercel** : Project Settings → Domains → ajouter le domaine (ex. `align-app.fr`, `www.align-app.fr`).
- **DNS** (chez le registrar) :
  - Apex (`align-app.fr`) : A → `76.76.21.21` (ou les valeurs indiquées par Vercel).
  - `www` : CNAME → `cname.vercel-dns.com`.
- SSL est géré automatiquement par Vercel.

Ailleurs (Netlify, autre) : configurer le domaine, le certificat SSL et une règle de rewrite SPA (toutes les routes → `index.html`).

---

## 6. Checklist

- [ ] Le domaine prod ouvre l’app.
- [ ] `/reset-password` ne renvoie pas 404 (route web configurée).
- [ ] Supabase **Site URL** = domaine prod.
- [ ] Supabase **Redirect URLs** contient le domaine prod (avec wildcard) et le dev.
- [ ] CORS des Edge Functions : origines limitées (ALLOWED_ORIGINS ou WEB_URL_*), pas de `*` en prod.
- [ ] L’app utilise `getWebOrigin()` partout, aucun domaine en dur dans le code.
