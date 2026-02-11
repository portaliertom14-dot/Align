# Corriger l'erreur "Missing script: build" sur Vercel

Si tu vois `npm error Missing script: "build"` lors du déploiement, Vercel n’utilise pas la commande définie dans `vercel.json`. À faire **dans le Dashboard Vercel** :

## 1. Vérifier la racine du projet

1. Va sur [vercel.com](https://vercel.com) → ton projet **Align**
2. **Settings** → **General**
3. Section **Root Directory**
   - **Laisser vide** ou mettre **`.`**
   - Si un sous-dossier (ex. `client`, `web`) est indiqué, **supprime-le** pour que la racine soit bien la racine du repo (là où se trouvent `package.json` et `vercel.json`).
4. **Save**

## 2. Forcer la commande de build

1. Toujours dans **Settings** → **General**
2. Section **Build & Development Settings**
3. Clique sur **Override** à côté de **Build Command**
4. Dans le champ, mets exactement :
   ```bash
   npx expo export --platform web
   ```
5. **Override** à côté de **Output Directory** → mets :
   ```bash
   dist
   ```
6. **Save**

## 3. Framework Preset (recommandé)

1. Dans la même section **Build & Development Settings**
2. **Framework Preset** : choisis **Other** (ou **Other** dans la liste)
   - Cela évite que Vercel utilise un preset (Expo, CRA, etc.) qui lance `npm run build` et ignore ta config.
3. **Save**

## 4. Redéployer

1. Onglet **Deployments**
2. Sur le **dernier déploiement**, menu **⋯** → **Redeploy**
3. Coche **Use existing Build Cache** si tu veux, puis **Redeploy**

Le build devrait cette fois utiliser `npx expo export --platform web` et produire le dossier `dist`.

---

**Pourquoi ça arrive** : Vercel peut ignorer `vercel.json` quand un Framework Preset est détecté ou quand la Build Command est définie par le preset. En mettant Framework à **Other** et en **Override** explicite de la Build Command, on force la bonne commande.
