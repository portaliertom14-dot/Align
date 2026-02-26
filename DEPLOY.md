# Déploiement — Align App

Ce document décrit comment builder l’app web et quelles variables d’environnement sont nécessaires au build. Il ne modifie pas la configuration de l’hébergeur (Vercel, Netlify, etc.), uniquement la procédure et la doc.

---

## 1. Commande pour builder l’app web

Depuis la racine du projet :

```bash
npx expo export --platform web
```

Ou via le script défini dans `package.json` :

```bash
npm run build
# ou
npm run build:web
```

Les deux exécutent un export web Expo. Le build est **production** (`__DEV__=false`, code minifié).

---

## 2. Dossier à déployer

Après le build, tous les fichiers à servir sont dans :

```
dist/
```

Contenu typique :

- `index.html` — page d’entrée
- `_expo/static/js/web/AppEntry-<hash>.js` — bundle JavaScript (nom avec hash pour le cache)
- `assets/` — polices, icônes, images
- `favicon.ico`, etc.

**À faire côté hébergeur :** configurer le **répertoire de publication** (publish directory / output directory) sur `dist` (ou `dist/` selon la plateforme). La racine du site doit servir le contenu de `dist/` (l’`index.html` doit être à la racine du site ou le serveur doit rediriger vers).

Exemples :

- **Vercel** : Build Output Directory = `dist`
- **Netlify** : Publish directory = `dist`
- **Autre** : Copier le contenu de `dist/` à la racine du site.

---

## 3. Variables d’environnement nécessaires au build

Les variables `EXPO_PUBLIC_*` sont **injectées au moment du build** (elles sont lues par le bundle généré). Il faut les définir **avant** d’exécuter `expo export` (ou dans l’interface de l’hébergeur si le build est fait par la plateforme).

### Obligatoires pour le fonctionnement de l’app

| Variable | Description | Exemple |
|----------|-------------|---------|
| `EXPO_PUBLIC_SUPABASE_URL` | URL du projet Supabase | `https://xxx.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Clé anonyme (publique) Supabase | Clé anon du Dashboard → Settings → API |

Sans ces deux variables, l’app ne peut pas se connecter à Supabase (auth, DB). En local, elles peuvent venir d’un fichier `.env` à la racine (voir `.env.example`).

### Recommandées pour la production web

| Variable | Description | Exemple |
|----------|-------------|---------|
| `EXPO_PUBLIC_WEB_URL_PROD` | URL du site en production (liens, redirects, emails) | `https://www.align-app.fr` |
| `EXPO_PUBLIC_SUPPORT_EMAIL` | Email affiché pour le support | `align.app.contact@gmail.com` |

### Optionnelles

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_WEB_URL_PREVIEW` | URL des déploiements preview (ex. Vercel preview) |
| `EXPO_PUBLIC_WEB_URL_DEV` | URL de dev (ex. `http://localhost:8081`) |
| `EXPO_PUBLIC_CLARITY_PROJECT_ID` | Microsoft Clarity (analytics), à utiliser uniquement en prod |
| `EXPO_PUBLIC_PRIVACY_POLICY_URL` | URL de la page politique de confidentialité |

### À ne pas exposer côté client

- **Ne pas** mettre de clé secrète (OpenAI, etc.) en `EXPO_PUBLIC_*`. L’IA (analyse secteur, métier, modules) est appelée via les **Supabase Edge Functions** ; les clés sensibles restent dans les **Secrets** du projet Supabase (Dashboard → Edge Functions → Secrets), par ex. `OPENAI_API_KEY`.

### Fichier de référence

Le fichier `.env.example` à la racine liste les variables avec des commentaires. Pour un build local, copier en `.env` et remplir les valeurs.

---

## Vérifier que le bon build est servi en prod

- **En prod** : ouvrir le site avec `?showVersion=1` (ex. `https://www.align-app.fr/?showVersion=1`) et regarder la console du navigateur : le message `[Align] build version: x.y.z` confirme que le bundle chargé correspond à la version affichée.
- **Version du build** : par défaut la valeur vient de `EXPO_PUBLIC_APP_VERSION` ou `1.0.0`. Pour un identifiant unique par déploiement, définir `EXPO_PUBLIC_BUILD_ID` au moment du build (ex. en CI : hash du commit ou numéro de build).

Après déploiement, le bundle JS a un nom du type `AppEntry-<hash>.js` dans `dist/_expo/static/js/web/`. Si tu refais un build, le hash change. En prod, vérifier dans l’onglet Network (ou Sources) du navigateur que le script chargé correspond au dernier build (même hash que dans ton `dist/` local après `expo export`). Si l’ancien hash est encore servi (cache CDN ou navigateur), forcer un rechargement sans cache ou invalider le cache CDN.

---

## Voir aussi

- **DEPLOY_WEB.md** — Notes spécifiques au déploiement sur align-app.fr (domaine, « Coming Soon », parrainage).
- **README.md** — Configuration générale, Edge Functions, variables Vercel/prod.
- **.env.example** — Liste et commentaires des variables d’environnement.
