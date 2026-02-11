# Vérifier que Vercel déploie la version à jour

## 1. Vérifier que GitHub a bien la dernière version

1. Ouvre **https://github.com/portaliertom14-dot/Align** dans le navigateur.
2. Vérifie que la branche **main** est sélectionnée.
3. Le dernier commit doit être **"sync: version actuelle..."** (ou plus récent).
4. Ouvre le fichier **src/screens/Auth/LoginScreen.js** sur GitHub : il doit contenir "CONNEXION UNIQUEMENT" et pas d’écran "Créer un compte" sur la même page.

Si ce n’est pas le cas → les commits n’ont pas été poussés. Dans le terminal : `git push origin main`.

---

## 2. Vercel : branche et dernier déploiement

1. **Vercel** → ton projet → **Settings** → **Git**.
2. **Production Branch** doit être **main** (pas `master`). Si c’est `master`, change en **main** et enregistre.
3. Onglet **Deployments** : le **premier déploiement** (en haut) doit avoir comme commit **"sync: version actuelle..."** ou **"chore: force redeploy"** (hash commençant par le même préfixe que sur GitHub).
4. Si le dernier déploiement affiche un **ancien** commit :
   - Clique sur **⋯** à droite du dernier déploiement → **Redeploy**.
   - Coche **Clear cache and redeploy**.
   - Valide.

---

## 3. Forcer un nouveau déploiement (si besoin)

- Soit : **Redeploy** avec **Clear cache and redeploy** (comme ci‑dessus).
- Soit : pousser un nouveau commit (par ex. le commit vide "chore: force redeploy") pour déclencher un nouveau build.

Après le déploiement, ouvre le site en **navigation privée** (ou vide le cache du navigateur) pour voir la nouvelle version.
