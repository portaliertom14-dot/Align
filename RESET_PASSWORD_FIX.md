# Reset Password Supabase — correction définitive

## Pourquoi le routing normal écrasait le flow reset

1. **Ordre des événements au 1er clic**  
   L’utilisateur ouvre le lien recovery (ex. `https://.../#access_token=...&type=recovery`). Supabase crée une session (type recovery). Le routing (RootGate) et le listener auth (AuthContext) s’exécutent **après** : ils voient une session existante et appliquent la règle habituelle « session + onboarding incomplet → Onboarding » ou « session + onboarding complet → accueil ». Aucune priorité n’était donnée au flow recovery, donc l’écran reset password était ignoré.

2. **Où c’était décidé**  
   - **RootGate** : calcul de `decision` (AuthStack / Loader / OnboardingStart / OnboardingResume / AppStackMain) à partir de `authStatus`, `onboardingStatus`, etc. Dès que `signedIn` et `!onboarding_completed`, on affichait l’AppStack avec l’écran Onboarding.  
   - **AuthContext** : sur `SIGNED_IN`, appel à `fetchProfileForRouting(userId)` qui met à jour `onboardingStatus` / `onboardingStep`, ce qui pousse RootGate vers Onboarding ou Main. Aucun cas particulier pour la session recovery.

## Où c’est corrigé

1. **`src/lib/recoveryMode.js`**  
   Détection centralisée du flow recovery (sans jamais logger le hash/tokens) :  
   - `hasRecoveryTokensInUrl()` : hash/search contient `type=recovery`, `access_token=`, `refresh_token=`.  
   - `hasRecoveryErrorInUrl()` : `error=access_denied`, `error_code=otp_expired`, `invalid`, `expired`.  
   - `isRecoveryMode()` : flag en sessionStorage (même clé que le bootstrap) OU l’une des deux fonctions ci‑dessus.  
   - `setRecoveryModeActive` / `clearRecoveryMode` pour que ResetPasswordScreen pilote la sortie du mode.

2. **RootGate**  
   Au tout début du rendu (avant tout calcul onboarding/home) :  
   - Si `isRecoveryMode()` : on pose le flag si l’URL contient tokens/erreur, puis si on n’est pas déjà sur `/reset-password` on fait `window.location.replace(origin + '/reset-password' + search + hash)` et on retourne un loader.  
   - Si on est déjà sur `/reset-password`, on retourne directement `<AuthStack />` (écran ResetPassword).  
   Ainsi, le routing normal (onboarding / accueil) n’est jamais exécuté en mode recovery.

3. **AuthContext**  
   Dans `onAuthStateChange`, sur `SIGNED_IN` :  
   - Si `isRecoveryMode()` : on met à jour session/user/auth et `setProfileLoading(false)`, puis **return sans appeler `fetchProfileForRouting`**.  
   Aucune mise à jour de `onboardingStatus` / `onboardingStep`, donc aucun déclenchement de redirection vers Onboarding ou Main ; l’écran ResetPassword garde la main.

4. **ResetPasswordScreen**  
   - Au mount : si erreur dans l’URL → « Lien invalide ou expiré » + `clearRecoveryMode()`.  
   - Si tokens dans le hash : extraction `access_token` / `refresh_token`, `setRecoveryModeActive(true)`, `supabase.auth.setSession(...)`, puis `history.replaceState(null, '', '/reset-password')`.  
   - Formulaire « nouveau mot de passe » → `supabase.auth.updateUser({ password })`.  
   - Succès : « Mot de passe modifié » + bouton vers login + `clearRecoveryMode()` + signOut.  
   - Aucun log de tokens/PII.

5. **Bootstrap (index.html + recoveryBootstrap.js)**  
   Déjà en place : pose du flag `align_recovery_flow` et redirection vers `/reset-password` si l’URL contient tokens/erreur, **avant** le chargement du bundle React, pour limiter le risque que Supabase consomme le hash avant notre code.

## Tests à faire

- **Compte avec onboarding fini** : 1er clic sur le lien recovery → écran `/reset-password` uniquement (jamais l’accueil).  
- **Compte avec onboarding pas fini** : 1er clic → écran `/reset-password` uniquement (jamais Onboarding).  
- **2e clic** sur le même lien → message « Lien invalide ou expiré » + bouton renvoyer un lien.

## Aucun log de tokens / PII

- `recoveryMode.js` : pas de log du hash ni des paramètres d’URL (uniquement de la logique booléenne si besoin).  
- Aucun `console.log` de `access_token`, `refresh_token` ou email dans ce flow.
