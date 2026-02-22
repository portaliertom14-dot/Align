# Align App

Application mobile MVP basée sur React Native (Expo) + Supabase.

## 🚀 Installation

```bash
# Installer les dépendances
npm install

# Démarrer l'application
npm start
```

## 📁 Structure du projet

```
align-app/
├── src/
│   ├── app/              # Navigation et configuration
│   ├── screens/          # Écrans de l'application
│   ├── components/       # Composants réutilisables
│   ├── services/         # Services (Supabase, scoring, IA)
│   ├── data/             # Données statiques (quiz, templates)
│   ├── hooks/            # Hooks React personnalisés
│   ├── utils/            # Utilitaires
│   └── styles/           # Thème et styles globaux
├── supabase/             # Schémas et migrations
├── assets/               # Images et icônes
└── App.js                # Point d'entrée
```

## 🎨 Thème

Le thème Align utilise :
- **Bleu** : #0A84FF → #0055FF (gradient)
- **Orange** : #FF7A00

## ⚙️ Configuration

1. Copier `.env.example` vers `.env`
2. Remplir les variables d'environnement Supabase

### Variables d'environnement (Vercel / Prod Web)

| Variable | Description | Où |
|----------|-------------|-----|
| `EXPO_PUBLIC_SUPABASE_URL` | URL du projet Supabase | Vercel (obligatoire) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Clé anonyme Supabase | Vercel (obligatoire) |
| `EXPO_PUBLIC_WEB_URL_PROD` | URL prod (ex: `https://www.align-app.fr`) | Vercel (optionnel) |

**Important :** Ne jamais exposer `OPENAI_API_KEY` côté client. La génération IA (modules, quiz secteur/métier) passe par les Supabase Edge Functions.

### Secrets Supabase (Edge Functions)

Configurer dans **Supabase Dashboard → Project Settings → Edge Functions → Secrets** :

| Secret | Description |
|--------|-------------|
| `OPENAI_API_KEY` | Clé API OpenAI (génération modules, analyse secteur/métier) |
| `RESEND_API_KEY` | Clé Resend pour emails (optionnel) |

CORS / allowed origins : inclure `https://www.align-app.fr` et `https://*.vercel.app` selon le déploiement.

### Déploiement Edge Functions (dev / prod)

Les endpoints `/functions/v1/refine-job-questions`, `/functions/v1/refine-job-pick` et `/functions/v1/job-description` doivent être déployés pour éviter les 404.

**1. Appliquer la migration** (table cache descriptions) :

```bash
# Depuis la racine du projet, si Supabase CLI est configuré
supabase db push
# ou exécuter manuellement le fichier :
# supabase/migrations/20250203100000_CREATE_JOB_DESCRIPTIONS.sql
```

**2. Déployer les Edge Functions** :

```bash
supabase functions deploy refine-job-questions
supabase functions deploy refine-job-pick
supabase functions deploy job-description
# Optionnel (rerank métier) :
supabase functions deploy rerank-job
```

**3. Vérifier** : les appels depuis l’app (RefineJob, ResultJob) doivent retourner 200 et plus de 404 en console.

## 📝 TODO

- [ ] Implémenter les écrans principaux
- [ ] Configurer Supabase
- [ ] Implémenter le quiz
- [ ] Ajouter l'authentification
- [ ] Implémenter le feed
- [ ] Ajouter le système de scoring















