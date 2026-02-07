# Déploiement web — align-app.fr

## Pourquoi « Coming Soon » s’affiche

Le message **« Coming Soon / We're under construction »** sur https://align-app.fr **ne vient pas de ce dépôt**. Il n’existe aucune page « Coming Soon » dans le code de l’app.

Ce contenu est servi par **l’hébergement** du domaine (page par défaut du registrar, page de maintenance de l’hébergeur, ou ancienne page statique). Tant que le domaine pointe vers cette page au lieu du build Expo web, le bug persiste.

## Ce qu’il faut faire

1. **Générer le build web** (depuis la racine du projet) :
   ```bash
   npm run build:web
   ```
   Les fichiers sont produits dans `dist/` (Expo 51).

2. **Déployer le contenu de `dist/`** sur l’hébergeur qui sert **align-app.fr** :
   - **Vercel** : déployer le dossier `dist/` (ou connecter le repo et définir la commande `npm run build:web` et le répertoire de sortie `dist`).
   - **Netlify** : idem (build command: `npm run build:web`, publish directory: `dist`).
   - **Autre** : envoyer le contenu de `dist/` à la racine du site (ou dans le répertoire configuré pour le domaine).

3. **Configurer le domaine** : s’assurer que align-app.fr (et www si besoin) pointe vers ce déploiement, pas vers une page « Coming Soon ».

4. **Cache** : après déploiement, vider le cache CDN / navigateur si l’ancienne page s’affiche encore.

## Lien de parrainage `?ref=`

Une fois l’app déployée, les URLs comme `https://align-app.fr?ref=E6B4CA9164` fonctionnent côté code :

- Au chargement, `captureReferralCodeFromUrl()` lit `ref` dans l’URL et le stocke.
- À l’inscription, ce code est envoyé à `apply_referral_if_any` (Supabase).

Si la page affichée est « Coming Soon », l’app React ne se charge pas, donc le `ref` n’est jamais capté. **Corriger le déploiement est nécessaire pour que le parrainage fonctionne en production.**
