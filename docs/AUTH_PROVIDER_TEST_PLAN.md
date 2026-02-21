# Plan de test manuel — AuthProvider + navigation dérivée d'état

## Objectif
Vérifier que la création/connexion de compte est stable, qu’il n’y a pas de loading infini, et que la navigation est bien dérivée de l’état (authStatus, onboardingStatus).

## Cas de test

### 1. Signup → doit naviguer même si fetch onboarding timeout
- **Steps:** Welcome → Choice → Onboarding → AuthScreen, remplir email/mdp, valider.
- **Attendu:** Sous 5 s (ou après timeout 30 s signup) : loading s’arrête, passage à l’écran UserInfo (étape 2). Pas de blocage même si `FETCH_ONBOARDING` timeout 2 s en arrière-plan.
- **Logs:** `BOOT_GET_SESSION`, `AUTH_EVT` SIGNED_IN, éventuellement `FETCH_ONBOARDING` avec `errorCode` ou `onboardingStatus: incomplete`.

### 2. Signin → idem
- **Steps:** Welcome → … → Login, email/mdp valides.
- **Attendu:** Redirection vers Onboarding (si onboarding incomplet) ou Main/Feed (si complété). Pas de loading infini.
- **Logs:** `EVT_SIGNED_IN`, `FETCH_ONBOARDING`.

### 3. Mode offline après signin
- **Steps:** Se connecter, puis couper le réseau (ou mode avion) avant de continuer.
- **Attendu:** L’app reste utilisable (onboarding ou Main selon état). Aucun freeze. Au prochain focus, fetch onboarding peut timeout → `onboardingStatus` reste `incomplete` (fallback safe).

### 4. Refresh session invalide
- **Steps:** Supprimer la session côté Supabase ou laisser expirer le refresh token, puis rouvrir l’app.
- **Attendu:** Boot → `getSession` peut échouer ou retourner null → `authStatus: signedOut`, affichage Welcome. Pas de crash.

### 5. Réseau lent
- **Steps:** Throttling réseau (DevTools ou réseau lent), puis signup ou signin.
- **Attendu:** Soit succès dans le délai (timeout signup 30 s, getSession 2 s), soit message d’erreur clair + bouton Réessaie. Aucun loading infini. Watchdog boot 5 s : si boot ne termine pas, passage en `signedOut`.

## Logs structurés attendus (une ligne JSON)
- `phase`: BOOT_GET_SESSION | AUTH_EVT | EVT_SIGNED_IN | EVT_SIGNED_OUT | FETCH_ONBOARDING | ENSURE_PROFILE | WATCHDOG_BOOT
- `requestId` (si applicable)
- `durationMs` (si applicable)
- `authStatus`: booting | signedOut | signedIn
- `onboardingStatus`: unknown | incomplete | complete
- `errorCode` (si erreur/timeout)

## Fichiers modifiés (patch)
- `src/lib/withTimeout.js` — nouveau
- `src/context/AuthContext.js` — nouveau (AuthProvider, listener unique, boot 2 s, fetch onboarding 2 s, watchdog 5 s)
- `src/app/navigation.js` — RootNavigator dérivé de `useAuth()`, initialRouteName + reset vers Main quand `onboardingStatus === 'complete'`
- `App.js` — AuthProvider + RootNavigator, suppression `setupAuthStateListener`
- `src/screens/ChargementRoutine/index.js` — `setOnboardingStatus('complete')` à la fin de l’animation
- RPC `check_email_exists` : déjà non bloquant (timeout 2 s, log AUTH_WARN_RPC_TIMEOUT, pas d’impact sur navigation)
