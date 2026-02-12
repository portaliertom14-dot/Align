# Déployer l’app sur ton nom de domaine (Vercel)

## Prérequis

- Le projet est déjà déployé sur Vercel (ex. `align-kappa.vercel.app`).
- Tu as acheté un nom de domaine (ex. chez OVH, Gandi, Cloudflare, etc.).

---

## Étape 1 : Ajouter le domaine dans Vercel

1. Va sur **[vercel.com](https://vercel.com)** → ton projet **Align**.
2. **Settings** → **Domains** (menu de gauche).
3. Dans le champ **Add**, saisis ton domaine, par ex. :
   - `align-app.fr` (sans www)
   - ou `www.align-app.fr` (avec www)
4. Clique sur **Add**.
5. Si tu veux **les deux** (apex + www), ajoute aussi l’autre :
   - `align-app.fr` et `www.align-app.fr`.

Vercel affiche ensuite les **enregistrements DNS** à configurer (et peut proposer d’utiliser les nameservers Vercel).

---

## Étape 2 : Configurer le DNS chez ton registrar

Ouvre la gestion DNS de ton hébergeur de domaine (OVH, Gandi, Cloudflare, etc.) et ajoute les enregistrements indiqués par Vercel. En général :

| Type | Nom / Sous-domaine | Valeur / Cible |
|------|--------------------|-----------------|
| **A** | `@` (ou vide, pour apex) | `76.76.21.21` |
| **CNAME** | `www` | `cname.vercel-dns.com` |

- **A** pour le domaine nu (`align-app.fr`).
- **CNAME** pour `www.align-app.fr`.

Les valeurs exactes peuvent varier : **utilise toujours celles affichées par Vercel** dans **Settings** → **Domains** après avoir ajouté le domaine.

---

## Étape 3 : Attendre la propagation

- La propagation DNS peut prendre **quelques minutes à 48 h**.
- Vercel délivre le **certificat SSL (HTTPS)** automatiquement une fois le DNS correct.
- Dans **Domains**, le statut du domaine passera à **Valid** (coche verte) quand tout est OK.

---

## Étape 4 : Variable d’environnement (optionnel mais recommandé)

1. **Vercel** → ton projet → **Settings** → **Environment Variables**.
2. Ajoute (pour la prod) :
   - **Name** : `EXPO_PUBLIC_WEB_URL_PROD`
   - **Value** : `https://ton-domaine.fr` (ex. `https://align-app.fr` ou `https://www.align-app.fr`)
   - **Environment** : Production (coché).
3. **Save** puis **Redeploy** si besoin pour que l’app prenne la nouvelle valeur.

---

## Étape 5 : Supabase (Auth + Redirect URLs)

1. **Supabase** → ton projet → **Authentication** → **URL Configuration**.
2. **Site URL** : mets ton domaine prod, ex. `https://align-app.fr`.
3. **Redirect URLs** : ajoute une ligne :
   - `https://align-app.fr/*` (ou `https://www.align-app.fr/*` si tu utilises www).
4. Enregistre.

Ton domaine est maintenant utilisé pour les liens de reset password et les redirections auth.

---

## Résumé

1. **Vercel** → Settings → Domains → ajouter ton domaine.
2. **Registrar** → DNS : A et CNAME comme indiqué par Vercel.
3. Attendre propagation + SSL (Valid dans Vercel).
4. (Optionnel) `EXPO_PUBLIC_WEB_URL_PROD` dans Vercel.
5. **Supabase** → Site URL + Redirect URLs = ton domaine.

Après ça, ouvrir **https://ton-domaine.fr** affichera la même app que sur `*.vercel.app`.
