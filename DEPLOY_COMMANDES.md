# Déployer la dernière version locale en prod

À exécuter **à la racine du projet** (`align-app/`).

---

## Option A : Déploiement avec Vercel CLI

Si tu as le projet lié à Vercel (ou tu veux déployer sans passer par Git) :

```bash
cd /Users/tom.portalier/Downloads/align-app/align-app

# 1. Builder la version web (produit le dossier dist/)
npm run build

# 2. Déployer en production
npx vercel --prod
```

À la première utilisation, `vercel` peut demander de te connecter et de lier le projet. Choisis le bon compte et le bon projet si plusieurs existent.

---

## Option B : Déploiement via Git (Vercel connecté au repo)

Si ton projet Vercel est déjà connecté à GitHub/GitLab et build à chaque push :

```bash
cd /Users/tom.portalier/Downloads/align-app/align-app

# 1. Tout committer
git add -A
git status
git commit -m "Deploy: dernière version locale"

# 2. Pousser sur la branche de prod (souvent main)
git push origin main
```

Vercel va builder (`npx expo export --platform web`) et déployer automatiquement. Vérifier les variables d’environnement dans **Vercel → Settings → Environment Variables** pour la prod.

---

## Vérifier après déploiement

- Ouvrir l’URL de prod (ex. `https://align-app.vercel.app` ou ton domaine).
- Pour confirmer que c’est le bon build : `https://ton-site.com/?showVersion=1` et regarder la console du navigateur : `[Align] build version: ...`
